-- V2-022 (S-9): «Guardar para luego». La lista es privada: cada cuenta lee, inserta y borra sólo
-- sus filas. Sólo se guarda lo que la cuenta puede ver (la comprobación va por la RLS de polls:
-- una privada sin acceso, una oculta o una inexistente no son visibles). Al volverse invisible
-- una encuesta guardada, deja de aparecer al unirla con polls, que es como se lista.

create table public.saved_polls (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  poll_id uuid not null references public.polls (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, poll_id)
);

create index saved_polls_user_created_idx on public.saved_polls (user_id, created_at desc, poll_id desc);

alter table public.saved_polls enable row level security;

revoke all on public.saved_polls from anon, authenticated;
grant select, insert, delete on public.saved_polls to authenticated;

create policy "saved_polls_select_own" on public.saved_polls
  for select to authenticated
  using (user_id = auth.uid());

-- La subconsulta se evalúa con la RLS de polls del propio cliente: sólo lo que ve.
create policy "saved_polls_insert_own_visible" on public.saved_polls
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.polls p where p.id = poll_id)
  );

create policy "saved_polls_delete_own" on public.saved_polls
  for delete to authenticated
  using (user_id = auth.uid());
