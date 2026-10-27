-- MVP-014 y MVP-015: create_poll — validación, atomicidad, autor, permisos y cuota.

begin;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a'), ('00000000-0000-0000-0000-00000000000b');

-- Sin sesión: anon no puede ejecutarla; authenticated sin sub recibe AUTH_REQUIRED.
select pg_temp.logout();
select pg_temp.expect_denied($$select public.create_poll('¿Pregunta anónima?', array['A', 'B'])$$);
reset role;
set local role authenticated;
select pg_temp.expect_error($$select public.create_poll('¿Pregunta sin usuario?', array['A', 'B'])$$, 'AUTH_REQUIRED');
reset role;

select pg_temp.login('00000000-0000-0000-0000-00000000000a');

-- Validación (y orden de los códigos).
select pg_temp.expect_error($$select public.create_poll('¿Pregunta válida?', null)$$, 'VALIDATION_OPTION_COUNT');
select pg_temp.expect_error($$select public.create_poll('¿Pregunta válida?', array['A'])$$, 'VALIDATION_OPTION_COUNT');
select pg_temp.expect_error($$select public.create_poll('¿Pregunta válida?', array['A','B','C','D','E'])$$, 'VALIDATION_OPTION_COUNT');
select pg_temp.expect_error($$select public.create_poll('¿Pregunta válida?', array[['A','B'],['C','D']])$$, 'VALIDATION_OPTION_COUNT');
select pg_temp.expect_error($$select public.create_poll('Corta', array['A','B'])$$, 'VALIDATION_QUESTION_LENGTH');
select pg_temp.expect_error($$select public.create_poll(null, array['A','B'])$$, 'VALIDATION_QUESTION_LENGTH');
-- 12 caracteres sólo antes de normalizar: «a      b    c» → «a b c».
select pg_temp.expect_error($$select public.create_poll('  a      b    c  ', array['A','B'])$$, 'VALIDATION_QUESTION_LENGTH');
select pg_temp.expect_error($$select public.create_poll(repeat('x', 281), array['A','B'])$$, 'VALIDATION_QUESTION_LENGTH');
select pg_temp.expect_error($$select public.create_poll('¿Pregunta válida?', array['A','   '])$$, 'VALIDATION_OPTION_LENGTH');
select pg_temp.expect_error($$select public.create_poll('¿Pregunta válida?', array['A', null])$$, 'VALIDATION_OPTION_LENGTH');
select pg_temp.expect_error($$select public.create_poll('¿Pregunta válida?', array['A', repeat('y', 101)])$$, 'VALIDATION_OPTION_LENGTH');
select pg_temp.expect_error($$select public.create_poll('¿Pregunta válida?', array['Sí', ' SÍ '])$$, 'VALIDATION_OPTION_DUPLICATE');
select pg_temp.expect_error($$select public.create_poll('¿Pregunta válida?', array['Café  con leche', 'café con LECHE'])$$, 'VALIDATION_OPTION_DUPLICATE');

-- Firma manipulada: no existe variante con user_id o status.
do $$
begin
  begin
    perform public.create_poll(p_question => '¿Pregunta válida?', p_options => array['A','B'], p_user_id => gen_random_uuid());
    raise exception 'aceptó p_user_id';
  exception when undefined_function then null;
  end;
end $$;

-- Caso válido: normaliza, conserva orden y tildes, autor = auth.uid(), published.
do $$
declare v_id uuid;
begin
  v_id := public.create_poll(E'  ¿Qué   prefieres\tpara  desayunar?  ', array['  Café ', 'Té', 'Si', 'Sí']);
  assert v_id is not null, 'no devolvió UUID';
  perform set_config('role', 'postgres', true);
  assert (select question from public.polls where id = v_id) = '¿Qué prefieres para desayunar?', 'pregunta no normalizada';
  assert (select user_id from public.polls where id = v_id) = '00000000-0000-0000-0000-00000000000a', 'autor incorrecto';
  assert (select status from public.polls where id = v_id) = 'published', 'estado incorrecto';
  assert (select string_agg(text || '#' || position, ',' order by position) from public.poll_options where poll_id = v_id)
    = 'Café#1,Té#2,Si#3,Sí#4', 'opciones incorrectas';
end $$;
reset role;

-- Atomicidad: ningún intento fallido dejó filas.
do $$
begin
  assert (select count(*) from public.polls) = 1, 'quedaron encuestas de intentos fallidos';
  assert (select count(*) from public.poll_options) = 4, 'quedaron opciones de intentos fallidos';
end $$;

-- Cuota: A ya tiene 1; puede crear 4 más y la sexta falla sin dejar filas.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select public.create_poll('¿Encuesta número dos?', array['A','B']);
select public.create_poll('¿Encuesta número tres?', array['A','B']);
select public.create_poll('¿Encuesta número cuatro?', array['A','B']);
select public.create_poll('¿Encuesta número cinco?', array['A','B']);
select pg_temp.expect_error($$select public.create_poll('¿Encuesta número seis?', array['A','B'])$$, 'RATE_LIMITED');
-- La cuota es por cuenta: B no está afectado.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select public.create_poll('¿Encuesta de otra cuenta?', array['A','B']);
reset role;
do $$
begin
  assert (select count(*) from public.polls where user_id = '00000000-0000-0000-0000-00000000000a') = 5, 'A no tiene 5';
  assert (select count(*) from public.polls) = 6, 'total de encuestas';
end $$;

-- Ventana móvil: si las 5 de A tienen más de 60 minutos, vuelve a haber capacidad.
update public.polls set created_at = now() - interval '61 minutes'
  where user_id = '00000000-0000-0000-0000-00000000000a';
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select public.create_poll('¿Encuesta tras la ventana?', array['A','B']);
reset role;
-- Y 4 antiguas + 1 dentro de la ventana siguen dejando capacidad (sólo cuenta la ventana).
do $$
begin
  assert (select count(*) from public.polls where user_id = '00000000-0000-0000-0000-00000000000a'
    and created_at > now() - interval '60 minutes') = 1, 'ventana móvil';
end $$;

-- Ventana móvil exacta (MVP-042): con 5 en la ventana, cuando sólo la más antigua
-- sale, cabe exactamente una más y después vuelve a bloquear.
delete from public.polls where user_id = '00000000-0000-0000-0000-00000000000a';
insert into public.polls (user_id, question, created_at)
select '00000000-0000-0000-0000-00000000000a', '¿Encuesta en ventana ' || g || '?', now() - make_interval(mins => 10 * g)
from generate_series(1, 5) g; -- hace 10, 20, 30, 40 y 50 minutos
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error($$select public.create_poll('¿Sexta dentro de la hora?', array['A','B'])$$, 'RATE_LIMITED');
reset role;
update public.polls set created_at = now() - interval '61 minutes'
  where user_id = '00000000-0000-0000-0000-00000000000a' and question = '¿Encuesta en ventana 5?';
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select public.create_poll('¿Cabe una al salir la más antigua?', array['A','B']);
select pg_temp.expect_error($$select public.create_poll('¿Y una más todavía?', array['A','B'])$$, 'RATE_LIMITED');
reset role;
do $$
begin
  assert (select count(*) from public.polls where user_id = '00000000-0000-0000-0000-00000000000a'
    and created_at > now() - interval '60 minutes') = 5, 'nunca más de 5 en la ventana';
  -- Ningún intento rechazado dejó encuestas sin opciones.
  assert not exists (select 1 from public.polls p where not exists (select 1 from public.poll_options o where o.poll_id = p.id)
    and p.question like '¿%' and p.user_id = '00000000-0000-0000-0000-00000000000a' and p.created_at > now() - interval '1 minute'),
    'encuesta sin opciones';
end $$;
rollback;

select 'ok 005_create_poll' as result;
