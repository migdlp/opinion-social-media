-- TEMPORAL (V2-025): quita can_view_author de la política de polls para comprobar que el E2E
-- del ciclo social se rompe. NUNCA se fusiona: esta rama se borra tras leer el resultado del CI.
drop policy "polls_select_published" on public.polls;
create policy "polls_select_published" on public.polls
  for select to anon, authenticated
  using (status = 'published');
