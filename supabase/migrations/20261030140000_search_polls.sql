-- SEARCH-001: búsqueda de encuestas por pregunta. Sin servicio externo ni búsqueda semántica:
-- coincidencia de subcadena sin distinguir mayúsculas (ILIKE) apoyada en un índice trigram.
-- search_polls devuelve sólo ids, fecha y cursor, como get_feed; los datos de cada encuesta
-- salen por la RLS de polls y los resultados por la misma ruta autorizada que el resto de listas.
-- No devuelve recuentos, totales ni user_id.
--
--   Consulta : 2–100 caracteres tras recortar y colapsar espacios; si no, INVALID_QUERY. % y _
--              son texto literal (se escapan), nunca comodines.
--   Alcance  : encuestas publicadas que quien llama puede ver (can_view_author: cuentas privadas
--              y bloqueos). Las cerradas se encuentran aunque ya no estén en el feed de 24 h.
--   Orden    : created_at DESC, id DESC. Cursor «<created_at UTC>|<id>|<md5 de la consulta>»: un
--              cursor de otra búsqueda o ilegible es INVALID_CURSOR. 21 filas (20 + 1).
create schema if not exists extensions;
create extension if not exists pg_trgm with schema extensions;

create index polls_question_trgm_idx on public.polls
  using gin (question extensions.gin_trgm_ops) where status = 'published';

create function public.search_polls(p_query text, p_cursor text default null)
returns table (poll_id uuid, created_at timestamptz, cursor text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_query text := btrim(regexp_replace(coalesce(p_query, ''), '\s+', ' ', 'g'));
  v_hash text;
  v_pattern text;
  v_cursor_at timestamptz;
  v_cursor_id uuid;
begin
  if char_length(v_query) < 2 or char_length(v_query) > 100 then
    raise exception using errcode = 'P0001', message = 'INVALID_QUERY';
  end if;
  v_hash := md5(lower(v_query));
  v_pattern := '%' || replace(replace(replace(v_query, '\', '\\'), '%', '\%'), '_', '\_') || '%';

  if p_cursor is not null then
    begin
      v_cursor_at := split_part(p_cursor, '|', 1)::timestamptz;
      v_cursor_id := split_part(p_cursor, '|', 2)::uuid;
      if split_part(p_cursor, '|', 3) <> v_hash then
        raise exception 'cursor de otra búsqueda';
      end if;
    exception when others then
      raise exception using errcode = 'P0001', message = 'INVALID_CURSOR';
    end;
  end if;

  return query
    select
      p.id,
      p.created_at,
      to_char(p.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || p.id::text || '|' || v_hash
    from public.polls p
    where p.status = 'published'
      and p.question ilike v_pattern escape '\'
      and public.can_view_author(p.user_id)
      and (v_cursor_at is null or (p.created_at, p.id) < (v_cursor_at, v_cursor_id))
    order by p.created_at desc, p.id desc
    limit 21;
end;
$$;

revoke execute on function public.search_polls(text, text) from public;
grant execute on function public.search_polls(text, text) to anon, authenticated;
