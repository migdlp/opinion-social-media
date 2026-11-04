-- ACCOUNT-003 (D-049): descargar una copia de mis datos. export_my_data() devuelve todos los datos
-- propios, nada de terceros salvo su @usuario en relaciones propias, y se limita a una vez cada
-- 10 minutos por cuenta.
begin;
insert into auth.users (id, email, created_at, raw_app_meta_data) values
 ('00000000-0000-0000-0000-0000000000a9', 'ana@example.test', '2026-01-02 10:00:00+00', '{"provider":"google"}'),
 ('00000000-0000-0000-0000-0000000000b9', 'beto@example.test', now(), '{}'),
 ('00000000-0000-0000-0000-0000000000c9', 'carla@example.test', now(), '{}'),
 ('00000000-0000-0000-0000-0000000000d9', 'dani@example.test', now(), '{}'),
 ('00000000-0000-0000-0000-0000000000e9', 'eva@example.test', now(), '{}');
insert into public.profiles (user_id, username, display_name, is_private, bio) values
 ('00000000-0000-0000-0000-0000000000a9', 'exp_ana', 'Ana', true, 'Mi bio'),
 ('00000000-0000-0000-0000-0000000000b9', 'exp_beto', null, false, null),
 ('00000000-0000-0000-0000-0000000000c9', 'exp_carla', null, false, null),
 ('00000000-0000-0000-0000-0000000000d9', 'exp_dani', null, false, null);
update public.profiles set vote_visibility = 'followers', avatar_icon = null
 where username = 'exp_ana';
insert into public.polls (id, user_id, question, created_at, status, closes_at, category_slug) values
 ('10000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000a9', '¿Encuesta propia de Ana?', '2026-02-01 10:00:00+00', 'published', '2030-01-01 00:00:00+00', (select slug from public.categories order by position limit 1)),
 ('10000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-0000000000b9', '¿Encuesta de Beto?', '2026-02-02 10:00:00+00', 'published', null, null),
 ('10000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000c9', '¿Encuesta oculta de Carla?', '2026-02-03 10:00:00+00', 'hidden', null, null);
update public.polls set comments_enabled = true where id = '10000000-0000-0000-0000-0000000000b9';
insert into public.poll_options (id, poll_id, text, position) values
 ('20000000-0000-0000-0000-0000000000a1', '10000000-0000-0000-0000-0000000000a9', 'Sí', 1),
 ('20000000-0000-0000-0000-0000000000a2', '10000000-0000-0000-0000-0000000000a9', 'No', 2),
 ('20000000-0000-0000-0000-0000000000b1', '10000000-0000-0000-0000-0000000000b9', 'Rojo', 1),
 ('20000000-0000-0000-0000-0000000000b2', '10000000-0000-0000-0000-0000000000b9', 'Azul', 2),
 ('20000000-0000-0000-0000-0000000000c1', '10000000-0000-0000-0000-0000000000c9', 'Uno', 1),
 ('20000000-0000-0000-0000-0000000000c2', '10000000-0000-0000-0000-0000000000c9', 'Dos', 2);
-- Votos: Ana vota en la de Beto y en la oculta de Carla; Beto y Carla votan en la de Ana (ajenos).
insert into public.votes (poll_id, option_id, user_id, created_at) values
 ('10000000-0000-0000-0000-0000000000b9', '20000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000a9', '2026-03-01 10:00:00+00'),
 ('10000000-0000-0000-0000-0000000000c9', '20000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-0000000000a9', '2026-03-02 10:00:00+00'),
 ('10000000-0000-0000-0000-0000000000a9', '20000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b9', now()),
 ('10000000-0000-0000-0000-0000000000a9', '20000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-0000000000c9', now());
insert into public.comments (id, poll_id, user_id, body, created_at) values
 ('30000000-0000-0000-0000-0000000000a9', '10000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-0000000000a9', 'Comentario de Ana', '2026-03-03 10:00:00+00'),
 ('30000000-0000-0000-0000-0000000000b9', '10000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-0000000000b9', 'SECRETO_COMENTARIO_AJENO', now());
-- Relaciones: Ana sigue a Beto y a Dani (pendiente); Carla sigue a Ana; Ana bloquea a Carla; Dani bloquea a Ana.
insert into public.follows (follower_id, followee_id, status, created_at) values
 ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000b9', 'accepted', '2026-04-01 10:00:00+00'),
 ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000d9', 'pending', '2026-04-02 10:00:00+00'),
 ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000a9', 'accepted', '2026-04-03 10:00:00+00');
insert into public.user_blocks (blocker_id, blocked_id, created_at) values
 ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000c9', '2026-05-01 10:00:00+00'),
 ('00000000-0000-0000-0000-0000000000d9', '00000000-0000-0000-0000-0000000000a9', '2026-05-02 10:00:00+00');
-- Silencios (SOCIAL-003): Ana silencia a Beto; Carla silencia a Ana (no debe aparecer en el archivo de Ana).
insert into public.user_mutes (muter_id, muted_id, created_at) values
 ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000b9', '2026-05-04 10:00:00+00'),
 ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000a9', '2026-05-05 10:00:00+00');
-- Descartes (FEED-003): Ana descarta la encuesta de Beto; Carla descarta la de Ana (no debe aparecer en el archivo de Ana).
insert into public.dismissed_polls (user_id, poll_id, created_at) values
 ('00000000-0000-0000-0000-0000000000a9', '10000000-0000-0000-0000-0000000000b9', '2026-05-06 10:00:00+00'),
 ('00000000-0000-0000-0000-0000000000c9', '10000000-0000-0000-0000-0000000000a9', '2026-05-07 10:00:00+00');
insert into public.saved_polls (user_id, poll_id, created_at) values
 ('00000000-0000-0000-0000-0000000000a9', '10000000-0000-0000-0000-0000000000b9', '2026-05-03 10:00:00+00');
-- Denuncias hechas por Ana y recibidas por Ana (de Carla).
insert into public.poll_reports (poll_id, reporter_id, reason, details, created_at) values
 ('10000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-0000000000a9', 'spam', 'detalle encuesta', '2026-06-01 10:00:00+00'),
 ('10000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000c9', 'odio', 'DENUNCIA_AJENA', now());
insert into public.user_reports (reporter_id, reported_id, reason, details, created_at) values
 ('00000000-0000-0000-0000-0000000000a9', '00000000-0000-0000-0000-0000000000b9', 'acoso', 'detalle persona', '2026-06-02 10:00:00+00'),
 ('00000000-0000-0000-0000-0000000000c9', '00000000-0000-0000-0000-0000000000a9', 'spam', 'DENUNCIA_AJENA', now());
insert into public.comment_reports (comment_id, reporter_id, reason, details, created_at) values
 ('30000000-0000-0000-0000-0000000000b9', '00000000-0000-0000-0000-0000000000a9', 'otro', 'detalle comentario', '2026-06-03 10:00:00+00');

-- Forma y permisos: sólo authenticated, SECURITY DEFINER, sin parámetros, tabla de eventos cerrada.
reset role;
do $$ begin
 assert not has_function_privilege('anon','public.export_my_data()','execute'), 'anon ejecuta export_my_data';
 assert has_function_privilege('authenticated','public.export_my_data()','execute'), 'authenticated no ejecuta export_my_data';
 assert (select pronargs from pg_proc where oid = 'public.export_my_data()'::regprocedure) = 0, 'export_my_data admite parámetros (identidad)';
 assert (select prosecdef from pg_proc where oid = 'public.export_my_data()'::regprocedure), 'no es SECURITY DEFINER';
 assert (select proconfig from pg_proc where oid = 'public.export_my_data()'::regprocedure) = array['search_path=""'], 'sin search_path vacío';
 assert (select relrowsecurity from pg_class where oid = 'public.data_export_events'::regclass), 'data_export_events sin RLS';
 assert not has_table_privilege('anon','public.data_export_events','select, insert, update, delete, truncate, references, trigger'), 'anon accede a data_export_events';
 assert not has_table_privilege('authenticated','public.data_export_events','select, insert, update, delete, truncate, references, trigger'), 'authenticated accede a data_export_events';
 assert exists (select 1 from pg_indexes where tablename = 'data_export_events' and indexdef like '%(user_id, created_at DESC)%'), 'falta el índice (user_id, created_at desc)';
end $$;

-- Sin sesión.
select pg_temp.logout();
select pg_temp.expect_denied($q$select public.export_my_data()$q$);
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '', true);
select pg_temp.expect_error($q$select public.export_my_data()$q$, 'AUTH_REQUIRED');
reset role;

-- Ana pide su copia: contenido exacto.
select pg_temp.login('00000000-0000-0000-0000-0000000000a9');
create temp table export_a as select public.export_my_data() as j;
grant select on export_a to authenticated;
do $$
declare j jsonb := (select j from export_a);
begin
 assert j ->> 'formato' = 'opinion-export' and (j ->> 'version')::int = 1, 'formato/versión';
 assert (j ->> 'generado_en') is not null, 'falta generado_en';
 assert j #>> '{cuenta,email}' = 'ana@example.test', 'email de la cuenta';
 assert j #>> '{cuenta,proveedor}' = 'google', 'proveedor';
 assert (j #>> '{cuenta,creada_en}')::timestamptz = '2026-01-02 10:00:00+00', 'creada_en';
 assert j #>> '{perfil,usuario}' = 'exp_ana' and j #>> '{perfil,nombre}' = 'Ana' and j #>> '{perfil,bio}' = 'Mi bio', 'perfil';
 assert (j #>> '{perfil,privada}')::boolean and j #>> '{perfil,visibilidad_votos}' = 'followers', 'privacidad del perfil';
 assert not (j -> 'perfil' ? 'user_id'), 'el perfil lleva user_id';

 assert jsonb_array_length(j -> 'encuestas') = 1, 'encuestas propias';
 assert j #>> '{encuestas,0,pregunta}' = '¿Encuesta propia de Ana?' and j #>> '{encuestas,0,estado}' = 'published', 'encuesta';
 assert jsonb_array_length(j #> '{encuestas,0,opciones}') = 2 and j #>> '{encuestas,0,opciones,1,texto}' = 'No', 'opciones de la encuesta';
 assert j #>> '{encuestas,0,categoria}' is not null and (j #>> '{encuestas,0,comentarios_activados}')::boolean = false, 'categoría / debate';
 assert not (j #> '{encuestas,0}' ? 'votos'), 'la encuesta lleva agregados';

 assert jsonb_array_length(j -> 'votos') = 2, 'votos propios';
 assert j #>> '{votos,0,opcion}' = 'Azul' and j #>> '{votos,0,pregunta}' = '¿Encuesta de Beto?', 'voto en encuesta publicada';
 assert j #>> '{votos,1,opcion}' = 'Uno' and j #> '{votos,1,pregunta}' = 'null'::jsonb, 'la pregunta de una encuesta oculta no se revela';

 assert jsonb_array_length(j -> 'comentarios') = 1 and j #>> '{comentarios,0,texto}' = 'Comentario de Ana', 'comentarios propios';
 assert j #>> '{comentarios,0,estado}' = 'published', 'estado del comentario';

 assert jsonb_array_length(j #> '{seguimientos,sigo}') = 2, 'sigo';
 assert j #>> '{seguimientos,sigo,0,usuario}' = 'exp_beto' and j #>> '{seguimientos,sigo,0,estado}' = 'accepted', 'sigo a beto';
 assert j #>> '{seguimientos,sigo,1,usuario}' = 'exp_dani' and j #>> '{seguimientos,sigo,1,estado}' = 'pending', 'solicitud a dani';
 assert jsonb_array_length(j #> '{seguimientos,me_siguen}') = 1 and j #>> '{seguimientos,me_siguen,0,usuario}' = 'exp_carla', 'me siguen';

 assert jsonb_array_length(j -> 'bloqueadas') = 1 and j #>> '{bloqueadas,0,usuario}' = 'exp_carla', 'bloqueadas';
 assert jsonb_array_length(j -> 'silenciadas') = 1 and j #>> '{silenciadas,0,usuario}' = 'exp_beto', 'silenciadas';
 assert (j #>> '{silenciadas,0}')::jsonb ?& array['usuario','desde'] and (select count(*) from jsonb_object_keys((j #>> '{silenciadas,0}')::jsonb)) = 2, 'claves de silenciadas';
 assert jsonb_array_length(j -> 'descartadas') = 1 and j #>> '{descartadas,0,encuesta_id}' = '10000000-0000-0000-0000-0000000000b9', 'descartadas';
 assert (select count(*) from jsonb_object_keys((j #>> '{descartadas,0}')::jsonb)) = 2 and (j #>> '{descartadas,0}')::jsonb ?& array['encuesta_id','desde'], 'claves de descartadas';
 assert position('10000000-0000-0000-0000-0000000000a9' in (j -> 'descartadas')::text) = 0, 'aparece un descarte ajeno';
 assert jsonb_array_length(j -> 'guardadas') = 1 and j #>> '{guardadas,0,encuesta_id}' = '10000000-0000-0000-0000-0000000000b9', 'guardadas';

 assert jsonb_array_length(j #> '{denuncias,encuestas}') = 1 and j #>> '{denuncias,encuestas,0,detalle}' = 'detalle encuesta', 'denuncia de encuesta';
 assert jsonb_array_length(j #> '{denuncias,personas}') = 1 and j #>> '{denuncias,personas,0,usuario}' = 'exp_beto', 'denuncia de persona';
 assert jsonb_array_length(j #> '{denuncias,comentarios}') = 1 and j #>> '{denuncias,comentarios,0,motivo}' = 'otro', 'denuncia de comentario';

 -- Nada de terceros: ni user_id, ni comentarios, votos, denuncias ajenas ni quién me bloqueó.
 assert j::text !~ '"00000000-0000-0000-0000-0000000000(b9|c9|d9|e9)', 'aparece el user_id de un tercero';
 assert j::text !~ '"00000000-0000-0000-0000-0000000000a9', 'aparece el user_id propio';
 assert position('SECRETO_COMENTARIO_AJENO' in j::text) = 0, 'aparece un comentario ajeno';
 assert position('DENUNCIA_AJENA' in j::text) = 0, 'aparece una denuncia recibida';
 assert position('exp_dani' in (j -> 'bloqueadas')::text) = 0, 'aparece quien me bloqueó';
 assert position('exp_carla' in (j -> 'silenciadas')::text) = 0, 'aparece quien me silenció';
 assert not (j ? 'votos_ajenos'), 'claves inesperadas';
end $$;

-- Límite: una segunda petición antes de 10 minutos falla, aunque lo pida dentro de la misma sesión.
select pg_temp.expect_error($q$select public.export_my_data()$q$, 'DATA_EXPORT_RATE_LIMITED');
reset role;
do $$ begin
 assert (select count(*) from public.data_export_events where user_id = '00000000-0000-0000-0000-0000000000a9') = 1,
   'sólo debe registrarse la petición aceptada';
end $$;

-- Otra cuenta no se ve afectada por el límite de Ana, y una cuenta sin perfil recibe perfil nulo.
select pg_temp.login('00000000-0000-0000-0000-0000000000e9');
do $$
declare j jsonb := public.export_my_data();
begin
 assert j #>> '{cuenta,email}' = 'eva@example.test', 'otra cuenta exporta lo suyo';
 assert j -> 'perfil' = 'null'::jsonb, 'sin perfil: perfil nulo';
 assert j -> 'encuestas' = '[]'::jsonb and j -> 'votos' = '[]'::jsonb and j #> '{seguimientos,sigo}' = '[]'::jsonb, 'sin datos: listas vacías';
end $$;
reset role;

-- Pasados 10 minutos se puede volver a pedir; las antiguas (>1 día) se limpian.
update public.data_export_events set created_at = now() - interval '11 minutes'
 where user_id = '00000000-0000-0000-0000-0000000000a9';
select pg_temp.login('00000000-0000-0000-0000-0000000000a9');
select public.export_my_data();
reset role;
do $$ begin
 assert (select count(*) from public.data_export_events where user_id = '00000000-0000-0000-0000-0000000000a9') = 2, 'segunda exportación registrada';
end $$;
update public.data_export_events set created_at = now() - interval '2 days'
 where user_id = '00000000-0000-0000-0000-0000000000a9' and created_at < now() - interval '5 minutes';
select pg_temp.login('00000000-0000-0000-0000-0000000000e9');
select pg_temp.expect_error($q$select public.export_my_data()$q$, 'DATA_EXPORT_RATE_LIMITED');
rollback;
