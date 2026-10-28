-- V2-002 (S-1): hace falta tener @usuario para crear encuestas y votar. Triggers
-- BEFORE INSERT en polls y votes (así no se reescriben create_poll ni vote_poll). Sólo
-- actúan con una sesión de cliente (auth.uid() no nulo): los datos de prueba y las
-- tareas administrativas sin sesión no están sujetos a la regla.
-- Más get_my_profile, para saber si la cuenta ya tiene perfil sin exponer user_id.

create function public.reject_without_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null
     and not exists (select 1 from public.profiles pr where pr.user_id = new.user_id) then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;
  return new;
end;
$$;

create trigger polls_require_profile
  before insert on public.polls
  for each row execute function public.reject_without_profile();

create trigger votes_require_profile
  before insert on public.votes
  for each row execute function public.reject_without_profile();

create function public.get_my_profile()
returns table (username text, display_name text, is_private boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  return query
    select pr.username, pr.display_name, pr.is_private
    from public.profiles pr where pr.user_id = auth.uid();
end;
$$;

revoke execute on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;
