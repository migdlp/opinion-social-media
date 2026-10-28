-- SEC-001: la cuota de follow_user (200 relaciones nuevas por cuenta y 60 minutos) no se
-- libera al dejar de seguir, rechazar ni eliminar seguidores.

begin;
insert into auth.users (id) values
  ('00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-00000000000b');
insert into public.profiles (user_id, username) values
  ('00000000-0000-0000-0000-00000000000a', 'ana'),
  ('00000000-0000-0000-0000-00000000000b', 'beto');
-- 210 destinos: 1–100 públicos, 101–210 privados.
insert into auth.users (id) select ('10000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid from generate_series(1, 210) n;
insert into public.profiles (user_id, username, is_private)
  select ('10000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid, 'destino_' || n, n > 100
  from generate_series(1, 210) n;

-- Criterio 4: el control de cuota no es accesible para clientes.
select pg_temp.logout();
select pg_temp.expect_denied($$select * from public.follow_quota_events$$);
select pg_temp.expect_denied($$insert into public.follow_quota_events (user_id) values ('00000000-0000-0000-0000-00000000000a')$$);
select pg_temp.expect_denied($$delete from public.follow_quota_events$$);
reset role;
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_denied($$select * from public.follow_quota_events$$);
select pg_temp.expect_denied($$update public.follow_quota_events set created_at = now() - interval '2 hours'$$);
select pg_temp.expect_denied($$delete from public.follow_quota_events$$);
select pg_temp.expect_denied($$truncate public.follow_quota_events$$);
reset role;

-- Criterio 1: crear y borrar 200 relaciones no devuelve cuota; la 201 se rechaza con follows vacío.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
declare n int;
begin
  for n in 1..100 loop
    perform public.follow_user('destino_' || n);
    perform public.unfollow_user('destino_' || n);
  end loop;
end $$;
reset role;

-- Criterio 2: rechazar o remove_follower tampoco libera consumos. 100 solicitudes más a privados.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
declare n int;
begin
  for n in 101..200 loop
    assert public.follow_user('destino_' || n) = 'pending', 'una privada debía quedar pendiente';
  end loop;
end $$;
reset role;
do $$
declare n int;
begin
  for n in 101..200 loop
    perform pg_temp.login(('10000000-0000-0000-0000-' || lpad(n::text, 12, '0'))::uuid);
    if n % 2 = 0 then
      perform public.respond_follow_request('ana', false);
    else
      perform public.remove_follower('ana');
    end if;
  end loop;
  perform set_config('role', 'postgres', true);
  assert (select count(*) from public.follows where follower_id = '00000000-0000-0000-0000-00000000000a') = 0,
    'debían quedar 0 relaciones de ana';
end $$;
reset role;

select pg_temp.login('00000000-0000-0000-0000-00000000000a');
select pg_temp.expect_error($$select public.follow_user('destino_201')$$, 'FOLLOW_RATE_LIMITED');
reset role;
do $$
begin
  assert (select count(*) from public.follows where follower_id = '00000000-0000-0000-0000-00000000000a') = 0,
    'el rechazo dejó fila';
  assert (select count(*) from public.follow_quota_events where user_id = '00000000-0000-0000-0000-00000000000a') = 200,
    'el contador debía quedarse en 200';
end $$;

-- Criterio 3: cuentas aisladas; otra cuenta sigue pudiendo seguir.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
do $$
begin
  assert public.follow_user('destino_1') = 'accepted', 'beto no debía verse afectado por la cuota de ana';
  -- Idempotente: repetir una relación existente no consume.
  assert public.follow_user('destino_1') = 'accepted', 'repetir debía devolver el estado';
  assert public.follow_user('destino_101') = 'pending', 'privada pendiente';
  assert public.follow_user('destino_101') = 'pending', 'repetir pendiente';
end $$;
reset role;
do $$
begin
  assert (select count(*) from public.follow_quota_events where user_id = '00000000-0000-0000-0000-00000000000b') = 2,
    'las llamadas idempotentes consumieron cuota';
end $$;

-- Criterio 3: ventana móvil con reloj fijado. now() es el inicio de la transacción, así que se
-- envejecen los consumos de ana: los de hace más de 60 minutos dejan de contar y los de dentro siguen.
update public.follow_quota_events set created_at = now() - interval '60 minutes'
  where user_id = '00000000-0000-0000-0000-00000000000a'
    and ctid in (select ctid from public.follow_quota_events where user_id = '00000000-0000-0000-0000-00000000000a' limit 1);
update public.follow_quota_events set created_at = now() - interval '59 minutes 59 seconds'
  where user_id = '00000000-0000-0000-0000-00000000000a' and created_at > now() - interval '59 minutes';
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
begin
  -- Un consumo justo en el límite (now() - 60 min) ya no cuenta: hay 199 dentro de la ventana.
  assert public.follow_user('destino_202') = 'pending', 'el consumo fuera de la ventana debía caducar';
end $$;
select pg_temp.expect_error($$select public.follow_user('destino_203')$$, 'FOLLOW_RATE_LIMITED');
reset role;

-- Retención: follow_user purga los consumos de esa cuenta que han salido de la ventana.
do $$
begin
  assert not exists (select 1 from public.follow_quota_events
    where user_id = '00000000-0000-0000-0000-00000000000a' and created_at <= now() - interval '60 minutes'),
    'quedaron consumos caducados';
end $$;

-- Las validaciones previas siguen antes de consumir: ni perfil inexistente ni seguirse a uno mismo cuentan.
select pg_temp.login('00000000-0000-0000-0000-00000000000b');
select pg_temp.expect_error($$select public.follow_user('nadie_existe')$$, 'USER_NOT_FOUND');
select pg_temp.expect_error($$select public.follow_user('beto')$$, 'CANNOT_FOLLOW_SELF');
reset role;
do $$
begin
  assert (select count(*) from public.follow_quota_events where user_id = '00000000-0000-0000-0000-00000000000b') = 2,
    'un intento rechazado consumió cuota';
end $$;

-- Borrar la cuenta borra sus consumos.
delete from auth.users where id = '00000000-0000-0000-0000-00000000000a';
do $$
begin
  assert not exists (select 1 from public.follow_quota_events where user_id = '00000000-0000-0000-0000-00000000000a'),
    'los consumos no se borraron en cascada';
end $$;

rollback;
select 'ok 025_follow_quota' as result;
