-- MOD-001: denuncia de personas. Tabla propia, separada de poll_reports. Sin ningún permiso para
-- clientes: nadie lee denuncias ni deduce quién le denunció; se escribe sólo con report_user. La
-- revisión es manual por un operador con la clave de servicio (docs/moderacion.md). Denunciar no
-- oculta, bloquea ni altera la cuenta, sus seguimientos o sus votos.
create table public.user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reported_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('spam', 'odio', 'acoso', 'sexual', 'violencia', 'otro')),
  details text check (details is null or char_length(details) <= 500),
  created_at timestamptz not null default now(),
  constraint user_reports_pair_key unique (reporter_id, reported_id),
  check (reporter_id <> reported_id)
);
create index user_reports_reported_idx on public.user_reports (reported_id, created_at desc);
create index user_reports_reporter_created_idx on public.user_reports (reporter_id, created_at desc);
alter table public.user_reports enable row level security;
revoke all on public.user_reports from anon, authenticated;

-- Sesión obligatoria; no hace falta perfil propio. La cuenta denunciada se identifica por @usuario
-- (la cabecera es pública también en cuentas privadas). Entre cuentas bloqueadas "no existe".
-- Motivos como en poll_reports. 10 denuncias por hora y cuenta, con cerrojo por cuenta.
create function public.report_user(p_username text, p_reason text, p_details text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_target uuid;
  v_details text;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  select user_id into v_target
    from public.profiles where lower(username) = lower(coalesce(p_username, ''));
  if v_target is null or exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_user and b.blocked_id = v_target)
       or (b.blocker_id = v_target and b.blocked_id = v_user)
  ) then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;
  if v_target = v_user then
    raise exception using errcode = 'P0001', message = 'CANNOT_REPORT_SELF';
  end if;

  if p_reason is null or p_reason not in ('spam', 'odio', 'acoso', 'sexual', 'violencia', 'otro') then
    raise exception using errcode = 'P0001', message = 'REPORT_INVALID';
  end if;
  v_details := nullif(btrim(regexp_replace(coalesce(p_details, ''), '[ \t\n\r\f\v]+', ' ', 'g')), '');
  if char_length(v_details) > 500 then
    raise exception using errcode = 'P0001', message = 'REPORT_INVALID';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('report_user:' || v_user::text, 0));

  if exists (select 1 from public.user_reports r where r.reporter_id = v_user and r.reported_id = v_target) then
    raise exception using errcode = 'P0001', message = 'ALREADY_REPORTED';
  end if;

  if (
    select count(*) from public.user_reports r
    where r.reporter_id = v_user and r.created_at > now() - interval '60 minutes'
  ) >= 10 then
    raise exception using errcode = 'P0001', message = 'REPORT_RATE_LIMITED';
  end if;

  insert into public.user_reports (reporter_id, reported_id, reason, details)
    values (v_user, v_target, p_reason, v_details);
end;
$$;
revoke execute on function public.report_user(text, text, text) from public, anon;
grant execute on function public.report_user(text, text, text) to authenticated;
