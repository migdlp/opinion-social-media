-- MVP-010: votos. Un voto inmutable por cuenta y encuesta; la opción debe pertenecer
-- a esa encuesta (FK compuesta). Las políticas llegan en MVP-012; mientras, RLS
-- sin políticas deniega todo acceso de clientes.

-- Destino de la FK compuesta: la pareja (poll_id, id) es única porque id ya lo es.
alter table public.poll_options add constraint poll_options_poll_id_id_key unique (poll_id, id);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid not null references public.polls (id) on delete cascade,
  option_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint votes_poll_id_user_id_key unique (poll_id, user_id),
  constraint votes_option_belongs_to_poll_fkey foreign key (poll_id, option_id)
    references public.poll_options (poll_id, id) on delete cascade
);

-- Voto propio: índice de unique (poll_id, user_id). Agregados por opción:
create index votes_poll_id_option_id_idx on public.votes (poll_id, option_id);
-- Borrado en cascada al eliminar una cuenta:
create index votes_user_id_idx on public.votes (user_id);

alter table public.votes enable row level security;
