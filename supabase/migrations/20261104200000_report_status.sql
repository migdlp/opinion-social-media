-- MOD-003 (D-052): estado de las denuncias propias. Las tres tablas de denuncias ganan
--   status      pending (pendiente) | actioned (revisada y con medidas) | dismissed (revisada sin medidas)
--   reviewed_at momento de la revisión; nulo si y sólo si está pending.
-- Las filas existentes quedan en pending. Sólo un operador cambia el estado (SQL con la clave de
-- servicio, procedimiento en docs/moderacion.md); los clientes siguen sin ningún permiso sobre las tablas.
-- No se guarda ni se muestra qué medida se tomó ni quién revisó.
--
-- list_my_reports devuelve únicamente las denuncias de quien llama. La etiqueta y el enlace del objetivo
-- salen sólo si quien llama puede ver ahora ese objetivo; si no, ambos son null y la denuncia sigue.
--   poll     pregunta y /polls/<id>            encuesta publicada y visible (can_view_author)
--   user     @usuario y /u/<usuario>           sin bloqueo en ningún sentido
--   comment  80 primeros caracteres y          comentario publicado y que pasa la comprobación de
--            /polls/<id>#comentario-<id>       acceso a comentarios (debate activo, y voto si sigue abierta)
-- Orden created_at desc, tipo asc, id desc; 21 filas; cursor «<created_at UTC>|<tipo>|<id>».
-- export_my_data se recrea con estado y revisada_en en cada denuncia.

alter table public.poll_reports
  add column status text not null default 'pending' check (status in ('pending', 'actioned', 'dismissed')),
  add column reviewed_at timestamptz,
  add constraint poll_reports_review_check check ((status = 'pending') = (reviewed_at is null));
alter table public.user_reports
  add column status text not null default 'pending' check (status in ('pending', 'actioned', 'dismissed')),
  add column reviewed_at timestamptz,
  add constraint user_reports_review_check check ((status = 'pending') = (reviewed_at is null));
alter table public.comment_reports
  add column status text not null default 'pending' check (status in ('pending', 'actioned', 'dismissed')),
  add column reviewed_at timestamptz,
  add constraint comment_reports_review_check check ((status = 'pending') = (reviewed_at is null));

-- ¿Puede quien llama ver el debate de la encuesta? Envuelve la comprobación común, que lanza errores.
create function private.comments_accessible(p_poll_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.comments_check_access(p_poll_id);
  return true;
exception when others then
  return false;
end;
$$;
revoke execute on function private.comments_accessible(uuid) from public, anon, authenticated;

create function public.list_my_reports(p_cursor text default null)
returns table (
  report_type text,
  target_label text,
  target_path text,
  reason text,
  created_at timestamptz,
  status text,
  reviewed_at timestamptz,
  cursor text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_cursor_at timestamptz;
  v_cursor_type text;
  v_cursor_id uuid;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  if p_cursor is not null then
    begin
      v_cursor_at := split_part(p_cursor, '|', 1)::timestamptz;
      v_cursor_type := split_part(p_cursor, '|', 2);
      v_cursor_id := split_part(p_cursor, '|', 3)::uuid;
    exception when others then
      raise exception using errcode = 'P0001', message = 'INVALID_CURSOR';
    end;
    if v_cursor_type not in ('poll', 'user', 'comment') then
      raise exception using errcode = 'P0001', message = 'INVALID_CURSOR';
    end if;
  end if;

  return query
    with mine as (
      select 'poll'::text as r_type, r.id as r_id, r.created_at as r_created, r.reason as r_reason,
             r.status as r_status, r.reviewed_at as r_reviewed,
             r.poll_id as ref_poll, null::uuid as ref_user, null::uuid as ref_comment
        from public.poll_reports r where r.reporter_id = v_user
      union all
      select 'user', r.id, r.created_at, r.reason, r.status, r.reviewed_at,
             null::uuid, r.reported_id, null::uuid
        from public.user_reports r where r.reporter_id = v_user
      union all
      select 'comment', r.id, r.created_at, r.reason, r.status, r.reviewed_at,
             c.poll_id, null::uuid, r.comment_id
        from public.comment_reports r
        join public.comments c on c.id = r.comment_id
        where r.reporter_id = v_user
    ),
    page as (
      select m.* from mine m
      where p_cursor is null
         or m.r_created < v_cursor_at
         or (m.r_created = v_cursor_at and (m.r_type > v_cursor_type
              or (m.r_type = v_cursor_type and m.r_id < v_cursor_id)))
      order by m.r_created desc, m.r_type asc, m.r_id desc
      limit 21
    )
    select
      pg.r_type,
      case pg.r_type
        when 'poll' then (
          select p.question from public.polls p
          where p.id = pg.ref_poll and p.status = 'published' and public.can_view_author(p.user_id))
        when 'user' then (
          select '@' || pr.username from public.profiles pr
          where pr.user_id = pg.ref_user and not exists (select 1 from public.user_blocks b where (b.blocker_id = v_user and b.blocked_id = pr.user_id) or (b.blocker_id = pr.user_id and b.blocked_id = v_user)))
        else (
          select left(c.body, 80) from public.comments c
          where c.id = pg.ref_comment and c.status = 'published' and private.comments_accessible(c.poll_id))
      end,
      case pg.r_type
        when 'poll' then (
          select '/polls/' || p.id::text from public.polls p
          where p.id = pg.ref_poll and p.status = 'published' and public.can_view_author(p.user_id))
        when 'user' then (
          select '/u/' || pr.username from public.profiles pr
          where pr.user_id = pg.ref_user and not exists (select 1 from public.user_blocks b where (b.blocker_id = v_user and b.blocked_id = pr.user_id) or (b.blocker_id = pr.user_id and b.blocked_id = v_user)))
        else (
          select '/polls/' || c.poll_id::text || '#comentario-' || c.id::text from public.comments c
          where c.id = pg.ref_comment and c.status = 'published' and private.comments_accessible(c.poll_id))
      end,
      pg.r_reason,
      pg.r_created,
      pg.r_status,
      pg.r_reviewed,
      to_char(pg.r_created at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || pg.r_type || '|' || pg.r_id::text
    from page pg
    order by pg.r_created desc, pg.r_type asc, pg.r_id desc;
end;
$$;

revoke execute on function public.list_my_reports(text) from public, anon;
grant execute on function public.list_my_reports(text) to authenticated;

-- Cuerpo vigente de 20261104150000_category_follows.sql más estado y revisada_en en cada denuncia.
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
          'encuesta_id', r.poll_id, 'motivo', r.reason, 'detalle', r.details, 'creada_en', r.created_at,
          'estado', r.status, 'revisada_en', r.reviewed_at)
          order by r.created_at, r.poll_id)
        from public.poll_reports r where r.reporter_id = v_user), '[]'::jsonb),
      'personas', coalesce((
        select jsonb_agg(jsonb_build_object(
          'usuario', pr.username, 'motivo', r.reason, 'detalle', r.details, 'creada_en', r.created_at,
          'estado', r.status, 'revisada_en', r.reviewed_at)
          order by r.created_at, pr.username)
        from public.user_reports r join public.profiles pr on pr.user_id = r.reported_id
        where r.reporter_id = v_user), '[]'::jsonb),
      'comentarios', coalesce((
        select jsonb_agg(jsonb_build_object(
          'comentario_id', r.comment_id, 'motivo', r.reason, 'detalle', r.details, 'creada_en', r.created_at,
          'estado', r.status, 'revisada_en', r.reviewed_at)
          order by r.created_at, r.comment_id)
        from public.comment_reports r where r.reporter_id = v_user), '[]'::jsonb))
  ) into v_result;

  return v_result;
end;
$$;
