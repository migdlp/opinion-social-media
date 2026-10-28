-- V2-021: categorías fijas, polls.category_slug y create_poll con p_category.

begin;
insert into auth.users (id) values ('00000000-0000-0000-0000-00000000000a');

-- Lista inicial cerrada, de lectura pública y sin escrituras.
select pg_temp.logout();
do $$
begin
  assert (select string_agg(slug, ',' order by position) from public.categories)
    = 'deportes,tecnologia,politica,entretenimiento,ciencia,estilo-de-vida,otros', 'categorías iniciales';
  assert (select count(*) from public.categories where name is null or btrim(name) = '') = 0, 'nombres vacíos';
  assert has_column_privilege('anon', 'public.polls', 'category_slug', 'select'), 'anon no lee category_slug';
end $$;
select pg_temp.expect_denied($$insert into public.categories (slug, name, position) values ('x', 'X', 9)$$);
select pg_temp.expect_denied($$update public.categories set name = 'Otra'$$);
select pg_temp.expect_denied($$delete from public.categories$$);
reset role;
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$ begin assert (select count(*) from public.categories) = 7, 'authenticated lee las categorías'; end $$;
select pg_temp.expect_denied($$insert into public.categories (slug, name, position) values ('x', 'X', 9)$$);
select pg_temp.expect_denied($$update public.categories set name = 'Otra'$$);
select pg_temp.expect_denied($$delete from public.categories$$);

-- Criterio 2: una categoría inventada se rechaza y no escribe nada.
select pg_temp.expect_error($$select public.create_poll('¿Qué categoría tengo?', array['A','B'], null, 'inventada')$$, 'INVALID_CATEGORY');
select pg_temp.expect_error($$select public.create_poll('¿Qué categoría tengo?', array['A','B'], null, '')$$, 'INVALID_CATEGORY');
select pg_temp.expect_error($$select public.create_poll('¿Qué categoría tengo?', array['A','B'], null, 'Deportes')$$, 'INVALID_CATEGORY');
reset role;
do $$ begin assert (select count(*) from public.polls) = 0, 'intentos fallidos dejaron filas'; end $$;

-- Criterios 1 y 3: con categoría se guarda; sin ella (omitida o nula) la encuesta se crea igual.
select pg_temp.login('00000000-0000-0000-0000-00000000000a');
do $$
declare v uuid;
begin
  v := public.create_poll('¿Quién ganará la liga?', array['A','B'], null, 'deportes');
  perform set_config('role', 'postgres', true);
  assert (select category_slug from public.polls where id = v) = 'deportes', 'categoría no guardada';
  perform set_config('role', 'authenticated', true);
  v := public.create_poll('¿Una de dos argumentos?', array['A','B']);
  v := public.create_poll('¿Con fecha y sin categoría?', array['A','B'], now() + interval '2 hours');
  v := public.create_poll('¿Con categoría nula explícita?', array['A','B'], null, null);
  perform set_config('role', 'postgres', true);
  assert (select count(*) from public.polls where category_slug is null) = 3, 'sin categoría';
end $$;
reset role;

-- Anon lee la categoría de una encuesta publicada.
select pg_temp.logout();
do $$ begin assert (select count(*) from public.polls where category_slug = 'deportes') = 1, 'anon lee polls.category_slug'; end $$;
reset role;

-- Integridad: la FK impide categorías inexistentes y borrar una categoría en uso.
do $$
begin
  begin
    update public.polls set category_slug = 'inventada' where category_slug = 'deportes';
    raise exception 'admitió una categoría inexistente';
  exception when foreign_key_violation then null;
  end;
  begin
    delete from public.categories where slug = 'deportes';
    raise exception 'permitió borrar una categoría en uso';
  exception when foreign_key_violation then null;
  end;
  assert not exists (select 1 from pg_proc where proname = 'create_poll' and pronargs = 3), 'sigue la firma antigua';
end $$;

rollback;
select 'ok 017_categories' as result;
