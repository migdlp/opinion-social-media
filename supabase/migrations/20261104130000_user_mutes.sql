-- SOCIAL-003 (D-050): silenciar cuentas.
-- Silenciar oculta, SÓLO a quien silencia, las encuestas de la cuenta silenciada en get_feed
-- (Recientes y Siguiendo). No afecta a búsqueda, perfil, enlace directo, comentarios, seguimiento ni
-- permisos, y la cuenta silenciada no recibe ninguna señal. get_ranked_feed y list_notifications aún
-- no existen en main (TREND-001, NOTIF-001): cuando existan deberán aplicar el mismo filtro.
-- La tabla no es de ningún cliente: sólo se gestiona con mute_user, unmute_user y list_muted_users
-- sobre la lista propia.
create table public.user_mutes (
  muter_id uuid not null references auth.users (id) on delete cascade,
  muted_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (muter_id, muted_id),
  check (muter_id <> muted_id)
);
create index user_mutes_muted_idx on public.user_mutes (muted_id);
alter table public.user_mutes enable row level security;
revoke all on public.user_mutes from anon, authenticated;

-- Orden de errores: AUTH_REQUIRED → PROFILE_REQUIRED → USER_NOT_FOUND (inexistente o con bloqueo en
-- cualquier sentido) → CANNOT_MUTE_SELF. Idempotente.
create function public.mute_user(p_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_target uuid;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  if not exists (select 1 from public.profiles where user_id = v_user) then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;
  select user_id into v_target
    from public.profiles where lower(username) = lower(coalesce(p_username, ''));
  if v_target is null or exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_user and b.blocked_id = v_target)
       or (b.blocker_id = v_target and b.blocked_id = v_user)
  ) then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;
  if v_target = v_user then
    raise exception using errcode = 'P0001', message = 'CANNOT_MUTE_SELF';
  end if;
  insert into public.user_mutes (muter_id, muted_id) values (v_user, v_target)
    on conflict do nothing;
end;
$$;

-- Sólo el silencio propio. Idempotente: quitar un silencio inexistente no da error.
create function public.unmute_user(p_username text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_target uuid;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  select user_id into v_target
    from public.profiles where lower(username) = lower(coalesce(p_username, ''));
  if v_target is null then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;
  delete from public.user_mutes where muter_id = v_user and muted_id = v_target;
end;
$$;

-- Lista propia, la más reciente primero. Cursor opaco «<created_at UTC>|<usuario en minúsculas>».
create function public.list_muted_users(p_cursor text default null)
returns table (username text, display_name text, cursor text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_cursor_at timestamptz;
  v_cursor_name text;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  begin
    v_cursor_at := split_part(p_cursor, '|', 1)::timestamptz;
    v_cursor_name := nullif(split_part(p_cursor, '|', 2), '');
    if v_cursor_name is null then v_cursor_at := null; end if;
  exception when others then
    v_cursor_at := null;
    v_cursor_name := null;
  end;
  return query
    select
      pr.username,
      pr.display_name,
      to_char(m.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || lower(pr.username)
    from public.user_mutes m
    join public.profiles pr on pr.user_id = m.muted_id
    where m.muter_id = v_user
      and (v_cursor_at is null or (m.created_at, lower(pr.username)) < (v_cursor_at, v_cursor_name))
    order by m.created_at desc, lower(pr.username) desc
    limit 31;
end;
$$;

revoke execute on function public.mute_user(text) from public, anon;
grant execute on function public.mute_user(text) to authenticated;
revoke execute on function public.unmute_user(text) from public, anon;
grant execute on function public.unmute_user(text) to authenticated;
revoke execute on function public.list_muted_users(text) from public, anon;
grant execute on function public.list_muted_users(text) to authenticated;

-- get_feed: cuerpo vigente de 20261028270000_feed_read.sql más el filtro de silencios propios.
-- Con auth.uid() nulo (visitante) la comparación no coincide y no filtra.
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
      and (v_category is null or p.category_slug = v_category)
      and (p.closes_at is null or now() < p.closes_at + interval '24 hours')
      and (
        p_mode = 'recientes'
        or exists (
          select 1 from public.follows f
          where f.follower_id = v_user and f.followee_id = p.user_id and f.status = 'accepted'
        )
      )
      and (v_cursor_at is null or (p.created_at, p.id) < (v_cursor_at, v_cursor_id))
    order by p.created_at desc, p.id desc
    limit 21;
end;
$$;

-- export_my_data (ACCOUNT-003, D-049): cuerpo vigente de 20261104093000_export_my_data.sql más la clave
-- 'silenciadas' (@usuario y fecha de las cuentas que silencio; nunca quién me ha silenciado).
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

-- get_profile: cuerpo vigente de 20261030130000_user_blocks.sql más is_muted (al final). Verdadero
-- sólo si quien llama tiene silenciada esa cuenta; en cualquier otro caso (visitante, otra persona,
-- la propia cuenta o la cuenta silenciada mirando) es false.
drop function public.get_profile(text);
create function public.get_profile(p_username text)
returns table (
  username text,
  display_name text,
  is_private boolean,
  followers_count integer,
  following_count integer,
  polls_count integer,
  viewer_relation text,
  can_view_content boolean,
  bio text,
  is_muted boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_viewer uuid := auth.uid();
  v_target uuid;
  v_relation text;
  v_can_view boolean;
begin
  select pr.user_id into v_target
    from public.profiles pr where lower(pr.username) = lower(coalesce(p_username, ''));
  if v_target is null or exists (
    select 1 from public.user_blocks b
    where (b.blocker_id = v_viewer and b.blocked_id = v_target)
       or (b.blocker_id = v_target and b.blocked_id = v_viewer)
  ) then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;

  v_relation := case
    when v_viewer is not null and v_viewer = v_target then 'self'
    else coalesce((
      select case f.status when 'accepted' then 'following' else 'pending' end
      from public.follows f where f.follower_id = v_viewer and f.followee_id = v_target
    ), 'none')
  end;
  v_can_view := public.can_view_author(v_target);

  return query
    select
      pr.username,
      pr.display_name,
      pr.is_private,
      (select count(*)::integer from public.follows f where f.followee_id = v_target and f.status = 'accepted'),
      (select count(*)::integer from public.follows f where f.follower_id = v_target and f.status = 'accepted'),
      (select count(*)::integer from public.polls p where p.user_id = v_target and p.status = 'published'),
      v_relation,
      v_can_view,
      case when v_can_view then pr.bio end,
      exists (select 1 from public.user_mutes m where m.muter_id = v_viewer and m.muted_id = v_target)
    from public.profiles pr where pr.user_id = v_target;
end;
$$;
revoke execute on function public.get_profile(text) from public;
grant execute on function public.get_profile(text) to anon, authenticated;
