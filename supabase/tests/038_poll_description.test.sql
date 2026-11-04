-- POLL-002 (D-053): descripción opcional de la encuesta. Texto plano de 1–500 caracteres, normalizado
-- en la base de datos, inmutable para los clientes y sin efecto en la búsqueda.
begin;
-- 40 cuentas con perfil: create_poll admite 5 encuestas por hora y cuenta, así que cada caso usa la suya.
insert into auth.users (id)
  select ('00000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid from generate_series(1, 40) g;
insert into public.profiles (user_id, username, is_private)
  select ('00000000-0000-0000-0000-' || lpad(g::text, 12, '0'))::uuid, 'desc_' || g, g = 39 from generate_series(1, 40) g;

-- Forma y permisos: parámetro final p_description, la firma antigua ya no existe y los clientes
-- pueden LEER description pero no escribirla.
reset role;
do $$ begin
 assert (select proargnames from pg_proc where oid = 'public.create_poll(text, text[], timestamptz, text, boolean, text)'::regprocedure)
   = array['p_question','p_options','p_closes_at','p_category','p_comments_enabled','p_description'], 'firma de create_poll';
 assert not exists (select 1 from pg_proc where oid = to_regprocedure('public.create_poll(text, text[], timestamptz, text, boolean)')),
   'sigue existiendo la firma antigua de create_poll';
 assert (select pronargdefaults from pg_proc where proname = 'create_poll' and pronamespace = 'public'::regnamespace) = 4, 'defaults';
 assert has_function_privilege('authenticated', 'public.create_poll(text, text[], timestamptz, text, boolean, text)', 'execute'), 'authenticated no ejecuta create_poll';
 assert not has_function_privilege('anon', 'public.create_poll(text, text[], timestamptz, text, boolean, text)', 'execute'), 'anon ejecuta create_poll';
 assert has_column_privilege('anon', 'public.polls', 'description', 'select'), 'anon no lee description';
 assert has_column_privilege('authenticated', 'public.polls', 'description', 'select'), 'authenticated no lee description';
 assert not has_column_privilege('anon', 'public.polls', 'description', 'update'), 'anon actualiza description';
 assert not has_column_privilege('authenticated', 'public.polls', 'description', 'update'), 'authenticated actualiza description';
 assert not has_column_privilege('authenticated', 'public.polls', 'description', 'insert'), 'authenticated inserta description';
end $$;

-- Regresión: sin p_description funciona igual que antes y guarda null.
select pg_temp.login('00000000-0000-0000-0000-000000000001');
do $$
declare v_id uuid := public.create_poll('¿Pregunta sin descripción?', array['Sí', 'No']);
begin
 assert (select p.description from public.polls p where p.id = v_id) is null, 'sin descripción debe guardar null';
 assert public.create_poll('¿Pregunta con todos los parámetros?', array['Sí', 'No'], null, null, false) is not null, 'llamada de 5 argumentos';
end $$;

-- Normalización y validación, un caso por cuenta: (n, entrada, esperado; null = se guarda null).
reset role;
create temp table cases (n int, input text, expected text, label text);
insert into cases values
 (2,  E'  hola\r\n\r\n\r\nmundo  ', E'hola\n\nmundo', 'CRLF, extremos y 3 saltos'),
 (3,  '   ', null, 'sólo espacios'),
 (4,  E' \t\n\r\n ', null, 'espacios, tabulación y saltos'),
 (5,  '', null, 'cadena vacía'),
 (6,  null, null, 'nulo'),
 (7,  '  espacios   internos  ', 'espacios   internos', 'espacios internos intactos'),
 (8,  E'a\n\n\n\n\nb', E'a\n\nb', '5 saltos → 2'),
 (9,  E'a\n\nb', E'a\n\nb', '2 saltos se conservan'),
 (10, E'con\ttab', E'con\ttab', 'tabulación interna'),
 (11, '<b>hola</b> & "x" <script>alert(1)</script>', '<b>hola</b> & "x" <script>alert(1)</script>', 'HTML literal'),
 (12, repeat('x', 500), repeat('x', 500), '500 caracteres'),
 (13, repeat('ñ', 500), repeat('ñ', 500), '500 caracteres multibyte'),
 (14, '  ' || repeat('y', 500) || '  ', repeat('y', 500), '500 tras recortar'),
 (15, repeat('😀', 500), repeat('😀', 500), '500 emojis (Unicode)'),
 (16, E'línea 1\r\nlínea 2', E'línea 1\nlínea 2', 'CRLF interno');
do $$
declare c record; v_id uuid; got text;
begin
 for c in select * from cases order by n loop
   execute 'reset role';
   perform pg_temp.login(('00000000-0000-0000-0000-' || lpad(c.n::text, 12, '0'))::uuid);
   v_id := public.create_poll('¿Caso de descripción número ' || c.n || '?', array['Sí', 'No'], null, null, false, c.input);
   select p.description into got from public.polls p where p.id = v_id;
   assert got is not distinct from c.expected, format('caso %s (%s): esperado %L, llegó %L', c.n, c.label, c.expected, got);
 end loop;
end $$;

-- Inválidas: 501 caracteres, caracteres de control distintos de \n y \t (incluido \r suelto, C0 y C1).
create temp table bad (n int, input text, label text);
insert into bad values
 (21, repeat('x', 501), '501 caracteres'),
 (22, repeat('😀', 501), '501 emojis'),
 (23, 'con ' || chr(7) || ' campana', 'BEL'),
 (24, E'cr\rsuelto', 'CR suelto'),
 (25, 'nulo ' || chr(1) || ' SOH', 'SOH'),
 (26, 'del ' || chr(127), 'DEL'),
 (27, 'c1 ' || chr(133), 'NEL (C1)'),
 (28, 'ff ' || chr(12), 'form feed'),
 (29, 'vt ' || chr(11), 'tabulación vertical'),
 (30, 'a' || chr(27) || '[31m', 'ESC');
do $$
declare c record;
begin
 for c in select * from bad order by n loop
   execute 'reset role';
   perform pg_temp.login(('00000000-0000-0000-0000-' || lpad(c.n::text, 12, '0'))::uuid);
   begin
     perform public.create_poll('¿Caso inválido número ' || c.n || '?', array['Sí', 'No'], null, null, false, c.input);
     raise exception using errcode = 'assert_failure', message = format('caso %s (%s): debía dar DESCRIPTION_INVALID', c.n, c.label);
   exception when sqlstate 'P0001' then
     assert sqlerrm = 'DESCRIPTION_INVALID', format('caso %s (%s): llegó %s', c.n, c.label, sqlerrm);
   end;
   -- Ni crea la encuesta ni gasta cuota.
   execute 'reset role';
   assert (select count(*) from public.polls p where p.user_id = ('00000000-0000-0000-0000-' || lpad(c.n::text, 12, '0'))::uuid) = 0,
     format('caso %s: el rechazo creó una encuesta', c.n);
 end loop;
end $$;

-- Orden de errores: DESCRIPTION_INVALID va justo después de VALIDATION_OPTION_DUPLICATE y antes de
-- INVALID_CLOSES_AT, INVALID_CATEGORY y RATE_LIMITED.
select pg_temp.login('00000000-0000-0000-0000-000000000031');
select pg_temp.expect_error($$select public.create_poll('¿Pregunta válida?', array['A', 'a'], null, null, false, repeat('x', 501))$$, 'VALIDATION_OPTION_DUPLICATE');
select pg_temp.expect_error($$select public.create_poll('¿Pregunta válida?', array['A', '   '], null, null, false, repeat('x', 501))$$, 'VALIDATION_OPTION_LENGTH');
select pg_temp.expect_error($$select public.create_poll('Corta', array['A', 'B'], null, null, false, repeat('x', 501))$$, 'VALIDATION_QUESTION_LENGTH');
select pg_temp.expect_error($$select public.create_poll('¿Pregunta válida?', array['A', 'B'], now() + interval '1 minute', null, false, repeat('x', 501))$$, 'DESCRIPTION_INVALID');
select pg_temp.expect_error($$select public.create_poll('¿Pregunta válida?', array['A', 'B'], null, 'no-existe', false, repeat('x', 501))$$, 'DESCRIPTION_INVALID');
select pg_temp.expect_error($$select public.create_poll('¿Pregunta válida?', array['A', 'B'], now() + interval '1 minute', null, false, 'ok')$$, 'INVALID_CLOSES_AT');
-- Con la cuota agotada, una descripción inválida se rechaza antes por DESCRIPTION_INVALID (no gasta cuota).
reset role;
insert into public.polls (user_id, question) select '00000000-0000-0000-0000-000000000032', 'relleno de cuota ' || g || ' xx' from generate_series(1, 5) g;
select pg_temp.login('00000000-0000-0000-0000-000000000032');
select pg_temp.expect_error($$select public.create_poll('¿Pregunta válida?', array['A', 'B'], null, null, false, repeat('x', 501))$$, 'DESCRIPTION_INVALID');
select pg_temp.expect_error($$select public.create_poll('¿Pregunta válida?', array['A', 'B'], null, null, false, 'ok')$$, 'RATE_LIMITED');

-- Ningún cliente actualiza description por la API de tablas (ni siquiera la propia autora).
select pg_temp.login('00000000-0000-0000-0000-000000000002');
select pg_temp.expect_denied($$update public.polls set description = 'cambiada' where user_id = '00000000-0000-0000-0000-000000000002'$$);
reset role;
select pg_temp.logout();
select pg_temp.expect_denied($$update public.polls set description = 'cambiada'$$);
reset role;

-- Lectura directa de polls: anon lee description de lo público y no de lo que RLS oculta.
reset role;
update public.polls set status = 'hidden' where user_id = '00000000-0000-0000-0000-000000000011';
create temp table hidden_poll as select id from public.polls where user_id = '00000000-0000-0000-0000-000000000011';
grant select on hidden_poll to anon, authenticated;
select pg_temp.logout();
do $$ begin
 assert (select p.description from public.polls p where p.question = '¿Caso de descripción número 2?') = E'hola\n\nmundo', 'anon lee la descripción de una pública';
 assert not exists (select 1 from public.polls p where p.question = '¿Caso de descripción número 11?'), 'anon ve una oculta';
end $$;

-- get_poll_cards devuelve description con la visibilidad de siempre.
reset role;
insert into public.polls (id, user_id, question, description) values
 ('10000000-0000-0000-0000-0000000000d1', '00000000-0000-0000-0000-000000000039', 'cards de cuenta privada', 'descripción privada'),
 ('10000000-0000-0000-0000-0000000000d2', '00000000-0000-0000-0000-000000000040', 'cards de cuenta pública', 'descripción pública'),
 ('10000000-0000-0000-0000-0000000000d3', '00000000-0000-0000-0000-000000000040', 'cards sin descripción alguna', null);
insert into public.poll_options (poll_id, text, position)
  select id, o, p from public.polls, (values ('Sí', 1), ('No', 2)) as t(o, p)
  where id in ('10000000-0000-0000-0000-0000000000d1', '10000000-0000-0000-0000-0000000000d2', '10000000-0000-0000-0000-0000000000d3');
select pg_temp.login('00000000-0000-0000-0000-000000000001');
do $$
declare r record;
begin
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000d2']::uuid[]);
 assert r.description = 'descripción pública', 'get_poll_cards: description';
 select * into r from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000d3']::uuid[]);
 assert r.poll_id is not null and r.description is null, 'get_poll_cards: sin descripción es null';
 assert (select count(*) from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000d1']::uuid[])) = 0,
   'get_poll_cards: la privada sin seguir no se sirve ni con su descripción';
 assert (select count(*) from public.get_poll_cards(array[(select id from hidden_poll)]::uuid[])) = 0, 'oculta';
end $$;
select pg_temp.logout();
do $$ begin
 assert (select description from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000d2']::uuid[])) = 'descripción pública', 'anon: description';
 assert (select count(*) from public.get_poll_cards(array['10000000-0000-0000-0000-0000000000d1']::uuid[])) = 0, 'anon: privada';
end $$;

-- La búsqueda no indexa la descripción: una palabra que sólo aparece en una descripción no encuentra nada.
reset role;
update public.polls set description = 'palabraunicaquenadiebusca' where id = '10000000-0000-0000-0000-0000000000d2';
select pg_temp.login('00000000-0000-0000-0000-000000000001');
do $$ begin
 assert (select count(*) from public.search_polls('palabraunicaquenadiebusca', null)) = 0, 'la búsqueda no debe indexar la descripción';
end $$;
rollback;
