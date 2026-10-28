-- MVP-020: inventario de permisos. Falla si aparece cualquier ruta de cliente no prevista.

do $$
declare r record;
begin
  -- Funciones de public: SECURITY DEFINER con search_path vacío, sin EXECUTE para PUBLIC ni anon.
  for r in select p.oid, p.proname, p.prosecdef, p.proconfig, p.proacl from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.prorettype <> 'trigger'::regtype loop
    assert r.prosecdef, r.proname || ' no es SECURITY DEFINER';
    assert r.proconfig = array['search_path=""'], r.proname || ' sin search_path vacío';
    assert r.proacl is not null and not exists (select 1 from aclexplode(r.proacl) a where a.grantee = 0),
      r.proname || ' ejecutable por PUBLIC';
    assert not has_function_privilege('anon', r.oid, 'execute'), r.proname || ' ejecutable por anon';
    assert has_function_privilege('authenticated', r.oid, 'execute'), r.proname || ' no ejecutable por authenticated';
  end loop;
  assert (select count(*) from pg_proc where pronamespace = 'public'::regnamespace and prorettype <> 'trigger'::regtype) = 10,
    'funciones en public distintas de las RPC previstas';

  -- Perfiles (V2-001): sólo se leen columnas públicas; user_id nunca.
  assert has_column_privilege('anon', 'public.profiles', 'username', 'select'), 'anon no lee profiles.username';
  assert not has_column_privilege('anon', 'public.profiles', 'user_id', 'select'), 'anon lee profiles.user_id';
  assert not has_column_privilege('authenticated', 'public.profiles', 'user_id', 'select'), 'authenticated lee profiles.user_id';
  assert not has_function_privilege('anon', 'public.upsert_my_profile(text, text)', 'execute'), 'anon ejecuta upsert_my_profile';
  assert not has_function_privilege('anon', 'public.set_profile_privacy(boolean)', 'execute'), 'anon ejecuta set_profile_privacy';

  -- Seguidores (V2-004): sólo authenticated lee follows, y nunca anon.
  assert not has_table_privilege('anon', 'public.follows', 'select'), 'anon lee follows';
  assert has_table_privilege('authenticated', 'public.follows', 'select'), 'authenticated no lee follows';

  -- Funciones de trigger: SECURITY DEFINER con search_path vacío y sin EXECUTE para clientes.
  for r in select p.oid, p.proname, p.prosecdef, p.proconfig from pg_proc p
           where p.pronamespace = 'public'::regnamespace and p.prorettype = 'trigger'::regtype loop
    assert r.prosecdef, r.proname || ' no es SECURITY DEFINER';
    assert r.proconfig = array['search_path=""'], r.proname || ' sin search_path vacío';
    assert not has_function_privilege('anon', r.oid, 'execute'), r.proname || ' ejecutable por anon';
    assert not has_function_privilege('authenticated', r.oid, 'execute'), r.proname || ' ejecutable por authenticated';
  end loop;

  -- Tablas: ningún cliente escribe; anon no lee votes; nadie lee polls.user_id ni polls.status.
  for r in select c.relname, role from pg_class c, unnest(array['anon', 'authenticated']) as role
           where c.relnamespace = 'public'::regnamespace and c.relkind = 'r' loop
    assert not has_table_privilege(r.role, 'public.' || r.relname, 'insert, update, delete, truncate, references, trigger'),
      r.role || ' puede escribir en ' || r.relname;
  end loop;
  assert not has_table_privilege('anon', 'public.votes', 'select'), 'anon puede leer votes';
  assert not has_table_privilege('anon', 'public.poll_reports', 'select'), 'anon puede leer poll_reports';
  assert not has_table_privilege('authenticated', 'public.poll_reports', 'select'), 'authenticated puede leer poll_reports';
  assert not has_column_privilege('anon', 'public.polls', 'user_id', 'select'), 'anon lee polls.user_id';
  assert not has_column_privilege('authenticated', 'public.polls', 'user_id', 'select'), 'authenticated lee polls.user_id';
  assert not has_column_privilege('anon', 'public.polls', 'status', 'select'), 'anon lee polls.status';
  assert (select count(*) from pg_class where relnamespace = 'public'::regnamespace and relkind in ('v', 'm')) = 0,
    'hay vistas en public';
end $$;

-- Los objetos nuevos nacen sin permisos para clientes.
begin;
create function public.tmp_new_function() returns int language sql as 'select 1';
create table public.tmp_new_table (id int);
do $$
begin
  assert not has_function_privilege('anon', 'public.tmp_new_function()', 'execute'), 'función nueva ejecutable por anon';
  assert not has_function_privilege('authenticated', 'public.tmp_new_function()', 'execute'), 'función nueva ejecutable por authenticated';
  assert not has_table_privilege('anon', 'public.tmp_new_table', 'select'), 'tabla nueva legible por anon';
  assert not has_table_privilege('authenticated', 'public.tmp_new_table', 'insert'), 'tabla nueva escribible por authenticated';
end $$;
rollback;

select 'ok 008_privileges' as result;
