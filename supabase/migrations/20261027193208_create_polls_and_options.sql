-- MVP-009: encuestas y opciones (modelo obligatorio del brief §5).
-- Las políticas de lectura llegan en MVP-011; hasta entonces RLS sin políticas
-- deniega todo acceso de anon/authenticated a estas tablas.

create table public.polls (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  question text not null check (char_length(question) between 10 and 280),
  status text not null default 'published' check (status in ('published', 'hidden')),
  created_at timestamptz not null default now()
);

create table public.poll_options (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  text text not null check (char_length(text) between 1 and 100),
  position smallint not null check (position between 1 and 4),
  unique (poll_id, position)
);

-- Feed: orden created_at DESC, id DESC sólo sobre publicadas.
create index polls_feed_idx on public.polls (created_at desc, id desc) where status = 'published';
-- Cuota de creación por cuenta en ventana móvil (MVP-015).
create index polls_user_created_at_idx on public.polls (user_id, created_at);
-- Las opciones de una encuesta se buscan por el índice de unique (poll_id, position).

alter table public.polls enable row level security;
alter table public.poll_options enable row level security;
