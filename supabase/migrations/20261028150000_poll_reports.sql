-- V2-020 (D-021, S-8): denuncias de encuestas. Los clientes no leen ni escriben la
-- tabla; sólo report_poll inserta. Las denuncias no ocultan nada: las revisa un
-- moderador con docs/moderacion.md.

create table public.poll_reports (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in ('spam', 'odio', 'acoso', 'sexual', 'violencia', 'otro')),
  details text check (details is null or char_length(details) <= 500),
  created_at timestamptz not null default now(),
  constraint poll_reports_poll_id_reporter_id_key unique (poll_id, reporter_id)
);

create index poll_reports_reporter_created_at_idx on public.poll_reports (reporter_id, created_at desc);

alter table public.poll_reports enable row level security;
revoke all on public.poll_reports from anon, authenticated;

create function public.report_poll(p_poll_id uuid, p_reason text, p_details text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_details text;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  -- Sólo se denuncia lo que el denunciante puede ver (hoy: encuestas publicadas).
  if not exists (select 1 from public.polls p where p.id = p_poll_id and p.status = 'published') then
    raise exception using errcode = 'P0001', message = 'POLL_UNAVAILABLE';
  end if;

  if p_reason is null or p_reason not in ('spam', 'odio', 'acoso', 'sexual', 'violencia', 'otro') then
    raise exception using errcode = 'P0001', message = 'REPORT_INVALID';
  end if;
  v_details := nullif(btrim(regexp_replace(coalesce(p_details, ''), '[ \t\n\r\f\v]+', ' ', 'g')), '');
  if char_length(v_details) > 500 then
    raise exception using errcode = 'P0001', message = 'REPORT_INVALID';
  end if;

  -- Serializa por cuenta para que dos peticiones simultáneas no superen la cuota.
  perform pg_advisory_xact_lock(hashtextextended('report_poll:' || v_user::text, 0));

  if exists (select 1 from public.poll_reports r where r.poll_id = p_poll_id and r.reporter_id = v_user) then
    raise exception using errcode = 'P0001', message = 'ALREADY_REPORTED';
  end if;

  if (
    select count(*) from public.poll_reports r
    where r.reporter_id = v_user and r.created_at > now() - interval '60 minutes'
  ) >= 20 then
    raise exception using errcode = 'P0001', message = 'REPORT_RATE_LIMITED';
  end if;

  insert into public.poll_reports (poll_id, reporter_id, reason, details)
    values (p_poll_id, v_user, p_reason, v_details);
end;
$$;

revoke execute on function public.report_poll(uuid, text, text) from public, anon;
grant execute on function public.report_poll(uuid, text, text) to authenticated;
