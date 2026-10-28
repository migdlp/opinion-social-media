-- V2-003 (D-016, S-5): firmar las encuestas con @usuario sin dar polls.user_id a los
-- clientes. Una vista con security_invoker no sirve: exige permiso de columna sobre los
-- user_id; una RPC definer devuelve sólo (poll_id, username, display_name).
-- Devuelve únicamente autores de encuestas publicadas que tienen perfil; el resto
-- (sin perfil, ocultas, inexistentes) no produce fila y se muestra como «Anónimo».
-- V2-005 deberá añadir aquí can_view_author para no delatar encuestas de cuentas privadas.

create function public.get_poll_authors(p_poll_ids uuid[])
returns table (poll_id uuid, username text, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select p.id, pr.username, pr.display_name
  from public.polls p
  join public.profiles pr on pr.user_id = p.user_id
  where p.status = 'published'
    and p.id = any (p_poll_ids[1:50]);
$$;

revoke execute on function public.get_poll_authors(uuid[]) from public;
grant execute on function public.get_poll_authors(uuid[]) to anon, authenticated;
