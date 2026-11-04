-- POLL-004 (HU-70, D-046): la autora borra una encuesta suya. Borrado FÍSICO e inmediato de la fila de
-- polls; por cascada desaparecen opciones, votos, comentarios (y sus denuncias), guardados, descartes y
-- denuncias de la encuesta. Sin papelera ni deshacer. No se puede borrar una encuesta oculta por
-- moderación (se conserva como evidencia). Ningún cliente tiene DELETE sobre polls: sólo esta RPC.
--
-- Todas las FK hacia polls ya son ON DELETE CASCADE (el test 046 lo comprueba para cualquier tabla
-- futura). Quien añada una tabla que referencie polls (rankings, fijada...) debe respetarlo.
--
-- Votos concurrentes: vote_poll comprobaba la encuesta sin bloquear su fila, así que un borrado
-- confirmado entre la comprobación y el INSERT habría dado una violación de FK (UNKNOWN en la
-- interfaz). Ahora la comprueba con FOR KEY SHARE (bloquea el DELETE hasta que el voto termine y,
-- si el DELETE va primero, la fila ya no existe): o POLL_UNAVAILABLE o el voto se borra por la
-- cascada. Nunca queda un voto huérfano. Resto del cuerpo, idéntico a 20261028190000_private_visibility.sql.

create function public.delete_my_poll(p_poll_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  -- Inexistente, ajena u oculta: el mismo error, sin distinguir.
  delete from public.polls
    where id = p_poll_id and user_id = v_user and status = 'published';
  if not found then
    raise exception using errcode = 'P0001', message = 'POLL_UNAVAILABLE';
  end if;
end;
$$;

revoke execute on function public.delete_my_poll(uuid) from public, anon;
grant execute on function public.delete_my_poll(uuid) to authenticated;

create or replace function public.vote_poll(p_poll_id uuid, p_option_id uuid)
returns table (poll_id uuid, option_id uuid, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  perform 1 from public.polls p
    where p.id = p_poll_id and p.status = 'published' and public.can_view_author(p.user_id)
    for key share of p;
  if not found then
    raise exception using errcode = 'P0001', message = 'POLL_UNAVAILABLE';
  end if;

  if not exists (select 1 from public.poll_options o where o.id = p_option_id and o.poll_id = p_poll_id) then
    raise exception using errcode = 'P0001', message = 'OPTION_INVALID';
  end if;

  return query
    insert into public.votes as v (poll_id, option_id, user_id)
    values (p_poll_id, p_option_id, v_user)
    on conflict on constraint votes_poll_id_user_id_key do nothing
    returning v.poll_id, v.option_id, v.created_at;

  if not found then
    raise exception using errcode = 'P0001', message = 'ALREADY_VOTED';
  end if;
end;
$$;
