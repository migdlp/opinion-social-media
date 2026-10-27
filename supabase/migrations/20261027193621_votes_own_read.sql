-- MVP-012: cada cuenta lee sólo sus votos, y sólo de encuestas publicadas (la
-- subconsulta pasa por la RLS de polls). Ninguna escritura directa: el voto se
-- emite mediante la RPC vote_poll (MVP-016).

create policy "votes_select_own" on public.votes
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and exists (select 1 from public.polls p where p.id = votes.poll_id)
  );

revoke insert, update, delete, truncate, references, trigger on public.votes from anon, authenticated;
revoke select on public.votes from anon;
