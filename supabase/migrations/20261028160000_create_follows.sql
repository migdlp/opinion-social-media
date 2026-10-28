-- V2-004 (D-017): seguimiento unidireccional con solicitudes para cuentas privadas.
-- follow_user / unfollow_user / respond_follow_request / remove_follower trabajan por
-- @usuario; los clientes sólo leen las filas donde participan y nunca escriben.

create table public.follows (
  follower_id uuid not null references auth.users (id) on delete cascade,
  followee_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
);

create index follows_followee_status_idx on public.follows (followee_id, status);
create index follows_follower_status_idx on public.follows (follower_id, status);

alter table public.follows enable row level security;

create policy "follows_select_participant" on public.follows
  for select to authenticated
  using (auth.uid() in (follower_id, followee_id));

revoke all on public.follows from anon, authenticated;
grant select on public.follows to authenticated;


create function public.follow_user(p_username text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_target uuid;
  v_private boolean;
  v_status text;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  if not exists (select 1 from public.profiles where user_id = v_user) then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;

  select user_id, is_private into v_target, v_private
    from public.profiles where lower(username) = lower(coalesce(p_username, ''));
  if v_target is null then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;
  if v_target = v_user then
    raise exception using errcode = 'P0001', message = 'CANNOT_FOLLOW_SELF';
  end if;

  -- Serializa por cuenta: dos peticiones simultáneas no superan la cuota.
  perform pg_advisory_xact_lock(hashtextextended('follow_user:' || v_user::text, 0));

  -- Idempotente: una relación existente se devuelve tal cual y no cuenta para la cuota.
  select status into v_status from public.follows where follower_id = v_user and followee_id = v_target;
  if v_status is not null then
    return v_status;
  end if;

  if (
    select count(*) from public.follows f
    where f.follower_id = v_user and f.created_at > now() - interval '60 minutes'
  ) >= 200 then
    raise exception using errcode = 'P0001', message = 'FOLLOW_RATE_LIMITED';
  end if;

  v_status := case when v_private then 'pending' else 'accepted' end;
  insert into public.follows (follower_id, followee_id, status) values (v_user, v_target, v_status);
  return v_status;
end;
$$;

-- Deja de seguir o cancela la solicitud pendiente. Idempotente.
create function public.unfollow_user(p_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_target uuid;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  select user_id into v_target from public.profiles where lower(username) = lower(coalesce(p_username, ''));
  if v_target is null then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;
  delete from public.follows where follower_id = v_user and followee_id = v_target;
end;
$$;

-- El seguido acepta o rechaza (borra) una solicitud pendiente de p_username.
-- Sin solicitud pendiente de esa cuenta: USER_NOT_FOUND (no se distingue del resto).
create function public.respond_follow_request(p_username text, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_follower uuid;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  select p.user_id into v_follower
    from public.profiles p
    join public.follows f on f.follower_id = p.user_id and f.followee_id = v_user and f.status = 'pending'
    where lower(p.username) = lower(coalesce(p_username, ''));
  if v_follower is null then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;
  if coalesce(p_accept, false) then
    update public.follows set status = 'accepted' where follower_id = v_follower and followee_id = v_user;
  else
    delete from public.follows where follower_id = v_follower and followee_id = v_user;
  end if;
end;
$$;

-- El seguido expulsa a un seguidor (o descarta una solicitud). Idempotente.
create function public.remove_follower(p_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_follower uuid;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  select user_id into v_follower from public.profiles where lower(username) = lower(coalesce(p_username, ''));
  if v_follower is null then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;
  delete from public.follows where follower_id = v_follower and followee_id = v_user;
end;
$$;

-- set_profile_privacy: cuerpo vigente de 20261028130000_create_profiles.sql más la
-- aceptación de las solicitudes pendientes al pasar a pública (S-6, hueco de V2-001).
create or replace function public.set_profile_privacy(p_private boolean)
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

  update public.profiles
    set is_private = p_private, updated_at = now()
    where user_id = v_user;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;

  if p_private = false then
    update public.follows set status = 'accepted' where followee_id = v_user and status = 'pending';
  end if;
end;
$$;

revoke execute on function public.follow_user(text) from public, anon;
grant execute on function public.follow_user(text) to authenticated;
revoke execute on function public.unfollow_user(text) from public, anon;
grant execute on function public.unfollow_user(text) to authenticated;
revoke execute on function public.respond_follow_request(text, boolean) from public, anon;
grant execute on function public.respond_follow_request(text, boolean) to authenticated;
revoke execute on function public.remove_follower(text) from public, anon;
grant execute on function public.remove_follower(text) to authenticated;
