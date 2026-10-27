-- MVP-016: vote_poll (docs/contratos-api.md §3.2). Un voto inmutable por cuenta;
-- el duplicado, incluida una carrera entre dos peticiones, se resuelve con
-- UNIQUE (poll_id, user_id) y se informa como ALREADY_VOTED.

create function public.vote_poll(p_poll_id uuid, p_option_id uuid)
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

  if not exists (select 1 from public.polls p where p.id = p_poll_id and p.status = 'published') then
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

revoke execute on function public.vote_poll(uuid, uuid) from public, anon;
grant execute on function public.vote_poll(uuid, uuid) to authenticated;
