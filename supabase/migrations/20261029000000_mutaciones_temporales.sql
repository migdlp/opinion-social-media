-- TEMPORAL (V2-024): abre fugas a propósito para comprobar que la batería de ataques las detecta.
-- NUNCA se fusiona: esta rama se borra tras leer el resultado del CI.

-- M1: las cuentas privadas dejan de serlo para todas las lecturas.
create or replace function public.can_view_author(p_author uuid)
returns boolean language sql stable security definer set search_path = '' as $$ select true $$;

-- M2: user_id de profiles legible por clientes (enumeración username -> user_id).
grant select (user_id) on public.profiles to anon, authenticated;

-- M3: las denuncias pasan a ser legibles por clientes.
grant select on public.poll_reports to authenticated;
create policy "mutacion_reports_select" on public.poll_reports for select to authenticated using (true);

-- M4: cualquier autenticado puede actualizar follows (aceptarse a sí mismo).
grant update on public.follows to authenticated;
create policy "mutacion_follows_update" on public.follows for update to authenticated using (true) with check (true);
