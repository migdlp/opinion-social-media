-- MVP-011: lectura pública de encuestas publicadas y sus opciones; sin escrituras
-- directas (se crearán sólo mediante RPC) y sin exponer polls.user_id.

create policy "polls_select_published" on public.polls
  for select to anon, authenticated
  using (status = 'published');

-- La subconsulta pasa por la RLS de polls: sólo ve encuestas publicadas.
create policy "poll_options_select_published" on public.poll_options
  for select to anon, authenticated
  using (exists (select 1 from public.polls p where p.id = poll_options.poll_id));

-- RLS no cubre TRUNCATE y Supabase concede todo por defecto: se retira a los clientes.
revoke insert, update, delete, truncate, references, trigger
  on public.polls, public.poll_options from anon, authenticated;

-- Sólo columnas públicas de polls (contrato §4): ni user_id ni status.
revoke select on public.polls from anon, authenticated;
grant select (id, question, created_at) on public.polls to anon, authenticated;
