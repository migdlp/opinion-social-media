-- FEED-006: seguir categorías.
-- Siguiendo = encuestas de autores con seguimiento ACEPTADO o de categorías seguidas, sin duplicados
-- (un único WHERE con OR, no una unión), con el mismo orden y cursor. Siempre se aplican
-- can_view_author, bloqueos, silencios, descartes, retención de cerradas y el filtro de categoría:
-- seguir una categoría no da acceso a cuentas privadas. Seguir una categoría es privado.
-- La tabla no es de ningún cliente: sólo se gestiona con follow_category, unfollow_category y
-- list_my_categories sobre la lista propia.
create table public.category_follows (
  user_id uuid not null references auth.users (id) on delete cascade,
  category_slug text not null references public.categories (slug) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, category_slug)
);
alter table public.category_follows enable row level security;
revoke all on public.category_follows from anon, authenticated;

-- Para recorrer por categoría en orden de feed sin escanear todas las publicadas.
create index if not exists polls_category_feed_idx
  on public.polls (category_slug, created_at desc, id desc) where status = 'published';

-- Orden de errores: AUTH_REQUIRED → INVALID_CATEGORY (el slug se compara tal cual: distingue
-- mayúsculas). Idempotente.
create function public.follow_category(p_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  if p_slug is null or not exists (select 1 from public.categories c where c.slug = p_slug) then
    raise exception using errcode = 'P0001', message = 'INVALID_CATEGORY';
  end if;
  insert into public.category_follows (user_id, category_slug) values (v_user, p_slug)
    on conflict do nothing;
end;
$$;

-- Idempotente: dejar de seguir una categoría que no se seguía (o que no existe) no da error.
create function public.unfollow_category(p_slug text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  delete from public.category_follows where user_id = v_user and category_slug = p_slug;
end;
$$;

-- Categorías que sigue quien llama, por categories.position. Sólo slug y nombre.
create function public.list_my_categories()
returns table (slug text, name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  return query
    select c.slug, c.name
    from public.category_follows cf
    join public.categories c on c.slug = cf.category_slug
    where cf.user_id = v_user
    order by c.position;
end;
$$;

revoke execute on function public.follow_category(text) from public, anon;
grant execute on function public.follow_category(text) to authenticated;
revoke execute on function public.unfollow_category(text) from public, anon;
grant execute on function public.unfollow_category(text) to authenticated;
revoke execute on function public.list_my_categories() from public, anon;
grant execute on function public.list_my_categories() to authenticated;

-- get_feed: cuerpo vigente de 20261104140000_dismissed_polls.sql; en «siguiendo» la condición de
-- autor pasa a «autor seguido O categoría seguida».
create or replace function public.get_feed(
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
      and not exists (
        select 1 from public.user_mutes m
        where m.muter_id = v_user and m.muted_id = p.user_id
      )
      and not exists (
        select 1 from public.dismissed_polls d
        where d.user_id = v_user and d.poll_id = p.id
      )
      and (v_category is null or p.category_slug = v_category)
      and (p.closes_at is null or now() < p.closes_at + interval '24 hours')
      and (
        p_mode = 'recientes'
        or exists (
          select 1 from public.follows f
          where f.follower_id = v_user and f.followee_id = p.user_id and f.status = 'accepted'
        )
        or p.category_slug in (
          select cf.category_slug from public.category_follows cf where cf.user_id = v_user
        )
      )
      and (v_cursor_at is null or (p.created_at, p.id) < (v_cursor_at, v_cursor_id))
    order by p.created_at desc, p.id desc
    limit 21;
end;
$$;

-- export_my_data (ACCOUNT-003, D-049): cuerpo vigente de 20261104140000_dismissed_polls.sql más la
-- clave 'categorias_seguidas' (slug y fecha de las categorías que sigo).
create or replace function public.export_my_data()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_result jsonb;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('export_my_data:' || v_user::text, 0));

  if exists (
    select 1 from public.data_export_events e
    where e.user_id = v_user and e.created_at > now() - interval '10 minutes'
  ) then
    raise exception using errcode = 'P0001', message = 'DATA_EXPORT_RATE_LIMITED';
  end if;

  delete from public.data_export_events e where e.user_id = v_user and e.created_at < now() - interval '1 day';
  insert into public.data_export_events (user_id) values (v_user);

  select jsonb_build_object(
    'formato', 'opinion-export',
    'version', 1,
    'generado_en', now(),
    'cuenta', (
      select jsonb_build_object(
        'email', u.email,
        'creada_en', u.created_at,
        'proveedor', u.raw_app_meta_data ->> 'provider')
      from auth.users u where u.id = v_user),
    'perfil', (
      select jsonb_build_object(
        'usuario', pr.username,
        'nombre', pr.display_name,
        'bio', pr.bio,
        'icono', pr.avatar_icon,
        'privada', pr.is_private,
        'visibilidad_votos', pr.vote_visibility)
      from public.profiles pr where pr.user_id = v_user),
    'encuestas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'pregunta', p.question,
        'categoria', p.category_slug,
        'opciones', coalesce((
          select jsonb_agg(jsonb_build_object('posicion', o.position, 'texto', o.text) order by o.position)
          from public.poll_options o where o.poll_id = p.id), '[]'::jsonb),
        'creada_en', p.created_at,
        'cierra_en', p.closes_at,
        'estado', p.status,
        'comentarios_activados', p.comments_enabled) order by p.created_at, p.id)
      from public.polls p where p.user_id = v_user), '[]'::jsonb),
    'votos', coalesce((
      select jsonb_agg(jsonb_build_object(
        'encuesta_id', v.poll_id,
        'pregunta', case when p.status = 'published' then p.question end,
        'opcion', o.text,
        'votado_en', v.created_at) order by v.created_at, v.poll_id)
      from public.votes v
      join public.polls p on p.id = v.poll_id
      join public.poll_options o on o.id = v.option_id
      where v.user_id = v_user), '[]'::jsonb),
    'comentarios', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id,
        'encuesta_id', c.poll_id,
        'texto', c.body,
        'creado_en', c.created_at,
        'estado', c.status) order by c.created_at, c.id)
      from public.comments c where c.user_id = v_user), '[]'::jsonb),
    'seguimientos', jsonb_build_object(
      'sigo', coalesce((
        select jsonb_agg(jsonb_build_object('usuario', pr.username, 'estado', f.status, 'desde', f.created_at)
                         order by f.created_at, pr.username)
        from public.follows f join public.profiles pr on pr.user_id = f.followee_id
        where f.follower_id = v_user), '[]'::jsonb),
      'me_siguen', coalesce((
        select jsonb_agg(jsonb_build_object('usuario', pr.username, 'estado', f.status, 'desde', f.created_at)
                         order by f.created_at, pr.username)
        from public.follows f join public.profiles pr on pr.user_id = f.follower_id
        where f.followee_id = v_user), '[]'::jsonb)),
    'bloqueadas', coalesce((
      select jsonb_agg(jsonb_build_object('usuario', pr.username, 'desde', b.created_at)
                       order by b.created_at, pr.username)
      from public.user_blocks b join public.profiles pr on pr.user_id = b.blocked_id
      where b.blocker_id = v_user), '[]'::jsonb),
    'silenciadas', coalesce((
      select jsonb_agg(jsonb_build_object('usuario', pr.username, 'desde', m.created_at)
                       order by m.created_at, pr.username)
      from public.user_mutes m join public.profiles pr on pr.user_id = m.muted_id
      where m.muter_id = v_user), '[]'::jsonb),
    'descartadas', coalesce((
      select jsonb_agg(jsonb_build_object('encuesta_id', d.poll_id, 'desde', d.created_at)
                       order by d.created_at, d.poll_id)
      from public.dismissed_polls d where d.user_id = v_user), '[]'::jsonb),
    'categorias_seguidas', coalesce((
      select jsonb_agg(jsonb_build_object('categoria', cf.category_slug, 'desde', cf.created_at)
                       order by cf.created_at, cf.category_slug)
      from public.category_follows cf where cf.user_id = v_user), '[]'::jsonb),
    'guardadas', coalesce((
      select jsonb_agg(jsonb_build_object('encuesta_id', s.poll_id, 'guardada_en', s.created_at)
                       order by s.created_at, s.poll_id)
      from public.saved_polls s where s.user_id = v_user), '[]'::jsonb),
    'denuncias', jsonb_build_object(
      'encuestas', coalesce((
        select jsonb_agg(jsonb_build_object(
          'encuesta_id', r.poll_id, 'motivo', r.reason, 'detalle', r.details, 'creada_en', r.created_at)
          order by r.created_at, r.poll_id)
        from public.poll_reports r where r.reporter_id = v_user), '[]'::jsonb),
      'personas', coalesce((
        select jsonb_agg(jsonb_build_object(
          'usuario', pr.username, 'motivo', r.reason, 'detalle', r.details, 'creada_en', r.created_at)
          order by r.created_at, pr.username)
        from public.user_reports r join public.profiles pr on pr.user_id = r.reported_id
        where r.reporter_id = v_user), '[]'::jsonb),
      'comentarios', coalesce((
        select jsonb_agg(jsonb_build_object(
          'comentario_id', r.comment_id, 'motivo', r.reason, 'detalle', r.details, 'creada_en', r.created_at)
          order by r.created_at, r.comment_id)
        from public.comment_reports r where r.reporter_id = v_user), '[]'::jsonb))
  ) into v_result;

  return v_result;
end;
$$;
