-- SEC-001: la cuota de follow_user (200 relaciones nuevas por cuenta en 60 minutos) contaba
-- las filas vigentes de follows, así que dejar de seguir, rechazar o remove_follower la
-- liberaban. Ahora cada relación nueva deja un consumo propio que no se borra al deshacerla.
--
-- Retención: follow_user purga los consumos de la cuenta que salen de la ventana antes de
-- contar, así que nunca se guardan más de 200 por cuenta. Sin consultas de clientes.

create table public.follow_quota_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index follow_quota_events_user_created_idx on public.follow_quota_events (user_id, created_at);

-- RLS sin políticas y sin GRANT: ningún cliente lee ni escribe; sólo follow_user (SECURITY DEFINER).
alter table public.follow_quota_events enable row level security;
revoke all on public.follow_quota_events from anon, authenticated;

-- Mismo cuerpo que V2-004 (validaciones de sesión, perfil, destino e idempotencia en el mismo
-- orden); sólo cambia la cuota.
create or replace function public.follow_user(p_username text)
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

  -- Idempotente: una relación existente se devuelve tal cual y no consume cuota.
  select status into v_status from public.follows where follower_id = v_user and followee_id = v_target;
  if v_status is not null then
    return v_status;
  end if;

  delete from public.follow_quota_events
    where user_id = v_user and created_at <= now() - interval '60 minutes';
  if (select count(*) from public.follow_quota_events where user_id = v_user) >= 200 then
    raise exception using errcode = 'P0001', message = 'FOLLOW_RATE_LIMITED';
  end if;

  v_status := case when v_private then 'pending' else 'accepted' end;
  insert into public.follows (follower_id, followee_id, status) values (v_user, v_target, v_status);
  insert into public.follow_quota_events (user_id) values (v_user);
  return v_status;
end;
$$;
