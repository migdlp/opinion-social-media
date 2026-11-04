-- PRIV-001: audiencia independiente del historial. Valor inicial conservador para
-- cuentas nuevas y existentes: Solo yo. No cambia votos, agregados ni is_private.
-- Postgres añade el DEFAULT constante sin reescribir las filas existentes.
alter table public.profiles
  add column vote_visibility text not null default 'private'
    check (vote_visibility in ('private', 'followers', 'profile'));

-- No ampliar el GRANT por columnas de profiles: la preferencia no es dato público.
create function public.get_my_vote_visibility()
returns text
language plpgsql stable security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_visibility text;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  select pr.vote_visibility into v_visibility from public.profiles pr where pr.user_id = v_user;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;
  return v_visibility;
end;
$$;
revoke execute on function public.get_my_vote_visibility() from public, anon;
grant execute on function public.get_my_vote_visibility() to authenticated;

create function public.set_vote_visibility(p_visibility text)
returns void
language plpgsql security definer set search_path = ''
as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;
  if p_visibility is null or p_visibility not in ('private', 'followers', 'profile') then
    raise exception using errcode = 'P0001', message = 'VOTE_VISIBILITY_INVALID';
  end if;
  update public.profiles
    set vote_visibility = p_visibility, updated_at = now()
    where user_id = v_user;
  if not found then
    raise exception using errcode = 'P0001', message = 'PROFILE_REQUIRED';
  end if;
end;
$$;
revoke execute on function public.set_vote_visibility(text) from public, anon;
grant execute on function public.set_vote_visibility(text) to authenticated;

create or replace function public.get_profile_votes(p_username text, p_cursor text default null)
returns table (
  poll_id uuid,
  question text,
  poll_created_at timestamptz,
  closes_at timestamptz,
  author_username text,
  author_display_name text,
  voted_at timestamptz,
  option_id uuid,
  option_text text,
  choice_hidden boolean,
  cursor text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_viewer uuid := auth.uid();
  v_target uuid;
  v_private boolean;
  v_visibility text;
  v_cursor_at timestamptz;
  v_cursor_id uuid;
begin
  select pr.user_id, pr.is_private, pr.vote_visibility into v_target, v_private, v_visibility
    from public.profiles pr where lower(pr.username) = lower(coalesce(p_username, ''));
  if v_target is null then
    raise exception using errcode = 'P0001', message = 'USER_NOT_FOUND';
  end if;

  -- Perfil visible: la propia cuenta, una pública o un seguidor aceptado.
  if v_private and not public.can_view_author(v_target) then
    raise exception using errcode = 'P0001', message = 'PROFILE_PRIVATE';
  end if;

  -- La cuenta sigue siendo el límite superior; la audiencia sólo restringe.
  -- Comprobar antes del cursor/consulta evita entregar filas, elección o metadatos.
  if v_viewer is distinct from v_target and (
    v_visibility = 'private'
    or (v_visibility = 'followers' and not exists (
      select 1 from public.follows f
      where f.follower_id = v_viewer and f.followee_id = v_target and f.status = 'accepted'
    ))
  ) then
    raise exception using errcode = 'P0001', message = 'VOTES_PRIVATE';
  end if;

  begin
    v_cursor_at := split_part(p_cursor, '|', 1)::timestamptz;
    v_cursor_id := split_part(p_cursor, '|', 2)::uuid;
  exception when others then
    v_cursor_at := null;
    v_cursor_id := null;
  end;

  return query
    select
      p.id,
      p.question,
      p.created_at,
      p.closes_at,
      pa.username,
      pa.display_name,
      v.created_at,
      case when reveal.ok then o.id end,
      case when reveal.ok then o.text end,
      not reveal.ok,
      to_char(v.created_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') || '|' || v.id::text
    from public.votes v
    join public.polls p on p.id = v.poll_id
    join public.poll_options o on o.id = v.option_id
    left join public.profiles pa on pa.user_id = p.user_id
    cross join lateral (
      select coalesce(
        v_viewer = v_target
        or (p.closes_at is not null and p.closes_at <= now())
        or exists (select 1 from public.votes mine where mine.poll_id = p.id and mine.user_id = v_viewer)
      , false) as ok
    ) reveal
    where v.user_id = v_target
      and p.status = 'published'
      and public.can_view_author(p.user_id)
      and (v_cursor_at is null or (v.created_at, v.id) < (v_cursor_at, v_cursor_id))
    order by v.created_at desc, v.id desc
    limit 21;
end;
$$;

revoke execute on function public.get_profile_votes(text, text) from public;
grant execute on function public.get_profile_votes(text, text) to anon, authenticated;
