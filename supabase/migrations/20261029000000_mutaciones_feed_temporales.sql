-- TEMPORAL (V2-035): reescribe get_feed con tres fugas a propósito para comprobar que la batería de
-- ataques las detecta. NUNCA se fusiona: esta rama se borra tras leer el resultado del CI.
--   M1: se quita can_view_author (las privadas y los autores sin acceso se ven).
--   M2: Siguiendo cuenta también las solicitudes pendientes.
--   M3: se quita la retención de 24 h.
create or replace function public.get_feed(
  p_mode text default 'recientes',
  p_category text default null,
  p_cursor text default null
)
returns table (poll_id uuid, created_at timestamptz, cursor text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_category text := nullif(btrim(coalesce(p_category, '')), '');
  v_cursor_at timestamptz;
  v_cursor_id uuid;
begin
  if p_mode is null or p_mode not in ('recientes', 'siguiendo') then
    raise exception using errcode = 'P0001', message = 'INVALID_FEED_MODE';
  end if;
  if p_mode = 'siguiendo' and v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  if v_category is not null and not exists (select 1 from public.categories c where c.slug = v_category) then
    raise exception using errcode = 'P0001', message = 'INVALID_CATEGORY';
  end if;
  if p_cursor is not null then
    begin
      v_cursor_at := split_part(p_cursor, '|', 1)::timestamptz;
      v_cursor_id := split_part(p_cursor, '|', 2)::uuid;
    exception when others then
      raise exception using errcode = 'P0001', message = 'INVALID_CURSOR';
    end;
  end if;
  return query
    select p.id, p.created_at,
           to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || p.id::text
    from public.polls p
    where p.status = 'published'
      and (v_category is null or p.category_slug = v_category)
      and (
        p_mode = 'recientes'
        or exists (
          select 1 from public.follows f
          where f.follower_id = v_user and f.followee_id = p.user_id
        )
      )
      and (v_cursor_at is null or (p.created_at, p.id) < (v_cursor_at, v_cursor_id))
    order by p.created_at desc, p.id desc
    limit 21;
end;
$$;
