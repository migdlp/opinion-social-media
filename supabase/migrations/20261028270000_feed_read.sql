-- V2-031 (D-022, D-024, D-025): lectura del feed con dos modos y filtro de categoría.
-- get_feed devuelve sólo ids de encuestas, su fecha y un cursor; los datos de cada encuesta salen
-- por la RLS de polls y los resultados por get_poll_results / get_feed_results, nunca de aquí.
--
--   Recientes  : todas las encuestas publicadas que quien llama puede ver (can_view_author).
--   Siguiendo  : sólo autores con relación ACEPTADA de auth.uid() hacia ellos; anon se rechaza.
--   Categoría  : null o vacío = Todas; si no, debe existir (INVALID_CATEGORY).
--   Retención  : una encuesta cerrada sale del feed cuando now() >= closes_at + 24 h (límite
--                exclusivo, hora del servidor). La fila no se borra: el detalle y el perfil
--                siguen accesibles. Sin closes_at no caduca.
--   Orden      : created_at DESC, id DESC. Cursor compuesto «<created_at UTC>|<id>» opaco; uno
--                ilegible es INVALID_CURSOR. Hasta 21 filas (20 + 1 para saber si hay más).

create function public.get_feed(
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
    select
      p.id,
      p.created_at,
      to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || p.id::text
    from public.polls p
    where p.status = 'published'
      and public.can_view_author(p.user_id)
      and (v_category is null or p.category_slug = v_category)
      and (p.closes_at is null or now() < p.closes_at + interval '24 hours')
      and (
        p_mode = 'recientes'
        or exists (
          select 1 from public.follows f
          where f.follower_id = v_user and f.followee_id = p.user_id and f.status = 'accepted'
        )
      )
      and (v_cursor_at is null or (p.created_at, p.id) < (v_cursor_at, v_cursor_id))
    order by p.created_at desc, p.id desc
    limit 21;
end;
$$;

revoke execute on function public.get_feed(text, text, text) from public;
grant execute on function public.get_feed(text, text, text) to anon, authenticated;
