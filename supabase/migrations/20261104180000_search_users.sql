-- SEARCH-003 (HU-71): búsqueda de personas por @usuario o nombre. Sin servicio externo: subcadena sin
-- distinguir mayúsculas apoyada en índices trigram. Sólo se consultan columnas que ya son públicas
-- (username, display_name, avatar_icon, is_private); nunca user_id ni bio. Las cuentas privadas sí
-- aparecen (para poder solicitar seguimiento); los bloqueos en cualquier sentido las ocultan cuando
-- hay sesión. No exige sesión.
--
--   Consulta : se recorta, se colapsan espacios y se quita una @ inicial; 2–30 caracteres o
--              INVALID_QUERY. %, _ y \ son texto literal (se escapan).
--   Rango    : 0 usuario exacto; 1 usuario que empieza por la consulta; 2 nombre o usuario que la
--              contiene. Cada perfil sale una vez, con su rango más bajo.
--   Orden    : rango asc, usuario en minúsculas asc (orden binario: los usuarios sólo llevan a-z, 0-9 y _).
--              Cursor «<rango>|<usuario en minúsculas>|<md5 de la consulta normalizada>»; el de otra
--              búsqueda o ilegible es INVALID_CURSOR. 21 filas (20 + 1).
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create index profiles_username_trgm_idx on public.profiles
  using gin (lower(username) extensions.gin_trgm_ops);
create index profiles_display_name_trgm_idx on public.profiles
  using gin (lower(display_name) extensions.gin_trgm_ops);

create function public.search_users(p_query text, p_cursor text default null)
returns table (username text, display_name text, avatar_icon text, is_private boolean, cursor text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := btrim(regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g'));
  v_lower text;
  v_hash text;
  v_like text;
  v_viewer uuid := auth.uid();
  v_cursor_rank int;
  v_cursor_name text;
begin
  if left(v_query, 1) = '@' then
    v_query := btrim(substr(v_query, 2));
  end if;
  if char_length(v_query) < 2 or char_length(v_query) > 30 then
    raise exception using errcode = 'P0001', message = 'INVALID_QUERY';
  end if;
  v_lower := lower(v_query);
  v_hash := md5(v_lower);
  v_like := replace(replace(replace(v_lower, '\', '\\'), '%', '\%'), '_', '\_');

  if p_cursor is not null then
    begin
      v_cursor_rank := split_part(p_cursor, '|', 1)::int;
      v_cursor_name := split_part(p_cursor, '|', 2);
      if v_cursor_rank not between 0 and 2 or v_cursor_name = '' or split_part(p_cursor, '|', 3) <> v_hash then
        raise exception 'cursor de otra búsqueda';
      end if;
    exception when others then
      raise exception using errcode = 'P0001', message = 'INVALID_CURSOR';
    end;
  end if;

  return query
    select
      m.username,
      m.display_name,
      m.avatar_icon,
      m.is_private,
      m.rank::text || '|' || m.uname || '|' || v_hash
    from (
      select
        pr.username,
        pr.display_name,
        pr.avatar_icon,
        pr.is_private,
        lower(pr.username) as uname,
        case
          when lower(pr.username) = v_lower then 0
          when lower(pr.username) like v_like || '%' escape '\' then 1
          else 2
        end as rank
      from public.profiles pr
      where (lower(pr.username) like '%' || v_like || '%' escape '\'
             or lower(pr.display_name) like '%' || v_like || '%' escape '\')
        and (v_viewer is null or not exists (
          select 1 from public.user_blocks b
          where (b.blocker_id = v_viewer and b.blocked_id = pr.user_id)
             or (b.blocker_id = pr.user_id and b.blocked_id = v_viewer)))
    ) m
    where p_cursor is null
       or m.rank > v_cursor_rank
       or (m.rank = v_cursor_rank and m.uname collate "C" > v_cursor_name collate "C")
    order by m.rank asc, m.uname collate "C" asc
    limit 21;
end;
$$;

revoke execute on function public.search_users(text, text) from public;
grant execute on function public.search_users(text, text) to anon, authenticated;
