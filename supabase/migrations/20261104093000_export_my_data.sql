-- ACCOUNT-003 (D-049): descargar una copia de mis datos.
--
-- export_my_data() devuelve un jsonb con todos los datos PROPIOS de auth.uid(). De otras personas
-- sólo aparece su @usuario cuando forma parte de una relación propia (a quién sigo, quién me sigue,
-- a quién bloqueé o denuncié). No incluye agregados de encuestas, votos ajenos, comentarios ajenos
-- ni quién ha bloqueado a la persona. El archivo no se guarda en ningún sitio: el cliente lo
-- descarga y el servidor sólo registra que se pidió.
--
-- Límite: una exportación cada 10 minutos por cuenta. Un cerrojo por cuenta hace que dos peticiones
-- simultáneas no esquiven el límite. La tabla data_export_events no es de ningún cliente.
--
-- Las claves de tablas que aún no existen en main se omiten (fijación de encuesta, descripción,
-- silenciadas, descartadas, categorías seguidas, reclamaciones, respuesta_a de comentarios y
-- estado de las denuncias). Regla permanente (E20): las tareas que añadan tablas o columnas con
-- datos de una persona amplían esta función y su test.
create table public.data_export_events (
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index data_export_events_user_idx on public.data_export_events (user_id, created_at desc);
alter table public.data_export_events enable row level security;
revoke all on public.data_export_events from anon, authenticated;

create function public.export_my_data()
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
revoke execute on function public.export_my_data() from public, anon;
grant execute on function public.export_my_data() to authenticated;
