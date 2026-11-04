-- V2-031 (D-022, D-024, D-025): get_feed. Recientes y Siguiendo, filtro de categoría, cursor
-- compuesto estable y retención de 24 h tras el cierre. Devuelve sólo ids y cursor.

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'), -- a: sigue a b (aceptado) y a c (pendiente)
  ('00000000-0000-0000-0000-00000000000b'), -- b: autor público
  ('00000000-0000-0000-0000-00000000000c'), -- c: autor privado
  ('00000000-0000-0000-0000-00000000000d'), -- d: seguidor aceptado de c
  ('00000000-0000-0000-0000-00000000000e'), -- e: extraño sin seguimientos
  ('00000000-0000-0000-0000-00000000000f'); -- f: autor público de muchas encuestas
insert into public.profiles (user_id, username, is_private) values
  ('00000000-0000-0000-0000-00000000000a', 'visitante_a', false),
  ('00000000-0000-0000-0000-00000000000b', 'publico_b', false),
  ('00000000-0000-0000-0000-00000000000c', 'privado_c', true),
  ('00000000-0000-0000-0000-00000000000d', 'seguidor_d', false),
  ('00000000-0000-0000-0000-00000000000e', 'extrano_e', false),
  ('00000000-0000-0000-0000-00000000000f', 'masa_f', false);
insert into public.follows (follower_id, followee_id, status) values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b', 'accepted'),
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000c', 'pending'),
  ('00000000-0000-0000-0000-00000000000d', '00000000-0000-0000-0000-00000000000c', 'accepted');
select set_config('request.jwt.claims', '', true);
reset role;

-- Encuestas de prueba. Los created_at son anteriores a now() para que closes_at > created_at.
insert into public.polls (id, user_id, question, created_at, status, category_slug, closes_at) values
  ('10000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000b', '¿Pública de b número 1?', now() - interval '5 days', 'published', 'deportes', null),
  ('10000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000000b', '¿Pública de b número 2?', now() - interval '4 days', 'published', 'ciencia', null),
  ('10000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-00000000000b', '¿Oculta de b número 3?', now() - interval '3 days', 'hidden', 'deportes', null),
  ('10000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000000c', '¿Privada de c número 1?', now() - interval '2 days', 'published', 'deportes', null),
  ('10000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000000c', '¿Privada de c número 2?', now() - interval '1 day', 'published', 'ciencia', null);

-- Retención (D-025): el límite es exclusivo y se calcula con la hora del servidor. now() es la
-- misma en toda la transacción, así que el reloj queda fijado.
insert into public.polls (id, user_id, question, created_at, status, category_slug, closes_at) values
  ('10000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-00000000000b', '¿Cerrada hace justo 24 horas?', now() - interval '3 days', 'published', null, now() - interval '24 hours'),
  ('10000000-0000-0000-0000-0000000000e2', '00000000-0000-0000-0000-00000000000b', '¿Cerrada hace 24 h menos un instante?', now() - interval '3 days', 'published', null, now() - interval '24 hours' + interval '1 microsecond'),
  ('10000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-00000000000b', '¿Cerrada hace 23 horas?', now() - interval '3 days', 'published', null, now() - interval '23 hours'),
  ('10000000-0000-0000-0000-0000000000e4', '00000000-0000-0000-0000-00000000000b', '¿Cerrada hace 3 días?', now() - interval '9 days', 'published', null, now() - interval '3 days'),
  ('10000000-0000-0000-0000-0000000000e5', '00000000-0000-0000-0000-00000000000b', '¿Cierra dentro de una hora?', now() - interval '1 hour', 'published', null, now() + interval '1 hour');

-- 45 encuestas de f con idéntico created_at para probar el desempate por id.
insert into public.polls (id, user_id, question, created_at, status, category_slug)
  select ('20000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, '00000000-0000-0000-0000-00000000000f',
         '¿Encuesta de masa número ' || g || '?', now() - interval '10 minutes', 'published',
         case when g % 2 = 0 then 'tecnologia' else 'otros' end
  from generate_series(1, 45) g;

-- Recorre todas las páginas de get_feed con la identidad actual y devuelve todos los ids.
create function pg_temp.feed_ids(p_mode text, p_category text default null) returns uuid[]
language plpgsql as $$
declare r record; cur text := null; ids uuid[] := '{}'; n int; pages int := 0;
begin
  loop
    n := 0;
    for r in select * from public.get_feed(p_mode, p_category, cur) loop
      n := n + 1;
      if n <= 20 then ids := ids || r.poll_id; cur := r.cursor; end if;
    end loop;
    pages := pages + 1;
    exit when n <= 20;
    if pages > 30 then raise exception 'no termina'; end if;
  end loop;
  return ids;
end $$;
grant execute on function pg_temp.feed_ids(text, text) to public;

-- Permisos: Recientes es público (anon puede ejecutar); Siguiendo lo rechaza dentro.
do $$
begin
  assert has_function_privilege('anon', 'public.get_feed(text, text, text)', 'execute'), 'anon sin get_feed';
  assert has_function_privilege('authenticated', 'public.get_feed(text, text, text)', 'execute'), 'authenticated sin get_feed';
end $$;

-- Sólo ids y cursor: ni user_id ni agregados.
select pg_temp.logout();
do $$
declare r record;
begin
  select * into r from public.get_feed('recientes', null, null) limit 1;
  assert not (to_jsonb(r) ? 'user_id'), 'devuelve user_id';
  assert not (to_jsonb(r) ? 'votes') and not (to_jsonb(r) ? 'total_votes'), 'devuelve agregados';
end $$;

-- Criterio 1: anon sólo ve lo público y publicado; Siguiendo se deniega sin más detalle.
do $$
declare ids uuid[];
begin
  ids := pg_temp.feed_ids('recientes');
  assert '10000000-0000-0000-0000-0000000000b1' = any (ids), 'anon ve b1';
  assert not ('10000000-0000-0000-0000-0000000000b3' = any (ids)), 'anon ve una oculta';
  assert not ('10000000-0000-0000-0000-0000000000c1' = any (ids)), 'anon ve una privada';
  assert not ('10000000-0000-0000-0000-0000000000c2' = any (ids)), 'anon ve una privada';
end $$;
select pg_temp.expect_error($$select * from public.get_feed('siguiendo', null, null)$$, 'AUTH_REQUIRED');

-- a: Recientes no incluye las de c (sólo hay solicitud pendiente); Siguiendo = sólo b.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
declare ids uuid[];
begin
  ids := pg_temp.feed_ids('recientes');
  assert not ('10000000-0000-0000-0000-0000000000c1' = any (ids)), 'a ve una privada con solicitud pendiente';
  ids := pg_temp.feed_ids('siguiendo');
  assert cardinality(ids) = 5 and ids @> array['10000000-0000-0000-0000-0000000000b1'::uuid, '10000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-0000000000e2', '10000000-0000-0000-0000-0000000000e3', '10000000-0000-0000-0000-0000000000e5'], 'a ve sólo las vigentes de b: ' || ids::text;
  assert not ('10000000-0000-0000-0000-0000000000c1' = any (pg_temp.feed_ids('siguiendo'))), 'solicitud pendiente no cuenta';
end $$;

-- d: sigue a c (aceptado): en Recientes ve las de c; Siguiendo = sólo las de c.
select pg_temp.login('00000000-0000-0000-0000-00000000000d');
do $$
declare ids uuid[];
begin
  ids := pg_temp.feed_ids('recientes');
  assert '10000000-0000-0000-0000-0000000000c1' = any (ids) and '10000000-0000-0000-0000-0000000000c2' = any (ids), 'd ve las de c';
  ids := pg_temp.feed_ids('siguiendo');
  assert cardinality(ids) = 2 and ids @> array['10000000-0000-0000-0000-0000000000c1'::uuid, '10000000-0000-0000-0000-0000000000c2'::uuid], 'Siguiendo de d = las de c: ' || ids::text;
end $$;

-- e: extraño sin seguimientos: Siguiendo vacío y Recientes sin las privadas.
select pg_temp.login('00000000-0000-0000-0000-00000000000e');
do $$
begin
  assert cardinality(pg_temp.feed_ids('siguiendo')) = 0, 'Siguiendo vacío sin seguimientos';
  assert not (pg_temp.feed_ids('recientes') && array['10000000-0000-0000-0000-0000000000c1'::uuid, '10000000-0000-0000-0000-0000000000c2'::uuid]), 'extraño ve privadas';
end $$;

-- Criterio 2: orden estable y sin duplicados con fechas iguales (45 encuestas de f).
select pg_temp.logout();
do $$
declare
  r record; seen uuid[] := '{}'; cur text := null; n int; pages int := 0; total int;
  prev_at timestamptz; prev_id uuid; page_rows int;
begin
  -- Visibles para anon: b1, b2, e2, e3, e5 y las 45 de f (b3 oculta, c privadas, e1 y e4 caducadas).
  total := 50;
  loop
    page_rows := 0;
    for r in select * from public.get_feed('recientes', null, cur) loop
      page_rows := page_rows + 1;
      if page_rows <= 20 then
        assert not (r.poll_id = any (seen)), 'duplicado ' || r.poll_id;
        seen := seen || r.poll_id;
        if prev_at is not null then
          assert (r.created_at, r.poll_id) < (prev_at, prev_id), 'orden inestable en ' || r.poll_id;
        end if;
        prev_at := r.created_at; prev_id := r.poll_id;
        cur := r.cursor;
      end if;
    end loop;
    pages := pages + 1;
    assert page_rows <= 21, 'más de 21 filas';
    exit when page_rows <= 20;
    assert pages < 20, 'no termina';
  end loop;
  assert cardinality(seen) = total, 'recorrido incompleto: ' || cardinality(seen) || ' de ' || total;
  assert pages >= 3, 'se esperaban varias páginas';
end $$;

-- Cursor, modo y categoría inválidos: error controlado.
select pg_temp.expect_error($$select * from public.get_feed('recientes', null, 'basura')$$, 'INVALID_CURSOR');
select pg_temp.expect_error($$select * from public.get_feed('recientes', null, '2026-10-27T10:00:00.000000Z|no-es-un-uuid')$$, 'INVALID_CURSOR');
select pg_temp.expect_error($$select * from public.get_feed('popular', null, null)$$, 'INVALID_FEED_MODE');
select pg_temp.expect_error($$select * from public.get_feed(null, null, null)$$, 'INVALID_FEED_MODE');
select pg_temp.expect_error($$select * from public.get_feed('recientes', 'no-existe', null)$$, 'INVALID_CATEGORY');
-- Una categoría vacía equivale a «Todas».
do $$ begin assert (select count(*) from public.get_feed('recientes', '', null)) = (select count(*) from public.get_feed('recientes', null, null)), 'categoría vacía = Todas'; end $$;

-- Criterio 3: la categoría se respeta en cada página y en el cursor.
do $$
declare r record; cur text := null; seen int := 0; page_rows int; pages int := 0;
begin
  loop
    page_rows := 0;
    for r in select g.*, p.category_slug from public.get_feed('recientes', 'tecnologia', cur) g join public.polls p on p.id = g.poll_id loop
      page_rows := page_rows + 1;
      if page_rows <= 20 then
        assert r.category_slug = 'tecnologia', 'categoría ajena ' || coalesce(r.category_slug, 'null');
        seen := seen + 1; cur := r.cursor;
      end if;
    end loop;
    pages := pages + 1;
    exit when page_rows <= 20;
    assert pages < 10, 'no termina';
  end loop;
  assert seen = 22, 'tecnologia: 22 encuestas, fueron ' || seen;
end $$;
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
begin
  assert (select count(*) from public.get_feed('siguiendo', 'ciencia', null)) = 1, 'siguiendo + categoría: sólo b2';
  assert (select poll_id from public.get_feed('siguiendo', 'ciencia', null)) = '10000000-0000-0000-0000-0000000000b2', 'b2';
end $$;

-- Criterio 4: retención con el reloj fijado (límite exclusivo). Sigue accesible por otras vías.
select pg_temp.logout();
do $$
declare ids uuid[];
begin
  ids := pg_temp.feed_ids('recientes');
  assert not ('10000000-0000-0000-0000-0000000000e1' = any (ids)), 'cerrada hace justo 24 h sigue en el feed';
  assert '10000000-0000-0000-0000-0000000000e2' = any (ids), 'cerrada hace 24 h menos 1 µs debe seguir';
  assert '10000000-0000-0000-0000-0000000000e3' = any (ids), 'cerrada hace 23 h debe seguir';
  assert not ('10000000-0000-0000-0000-0000000000e4' = any (ids)), 'cerrada hace 3 días sigue en el feed';
  assert '10000000-0000-0000-0000-0000000000e5' = any (ids), 'abierta con cierre futuro debe seguir';
  assert '10000000-0000-0000-0000-0000000000b1' = any (ids), 'sin fecha de cierre no caduca';
  -- La fila no se borra y el detalle sigue accesible.
  assert (select count(*) from public.polls where id in ('10000000-0000-0000-0000-0000000000e1', '10000000-0000-0000-0000-0000000000e4')) = 2, 'las caducadas siguen visibles por RLS';
end $$;

-- La retención también se aplica en Siguiendo.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
declare ids uuid[];
begin
  ids := pg_temp.feed_ids('siguiendo');
  assert not ('10000000-0000-0000-0000-0000000000e1' = any (ids)) and not ('10000000-0000-0000-0000-0000000000e4' = any (ids)), 'Siguiendo muestra caducadas';
  assert '10000000-0000-0000-0000-0000000000e3' = any (ids), 'Siguiendo oculta una vigente';
end $$;

rollback;
select 'ok 024_feed_read' as result;
