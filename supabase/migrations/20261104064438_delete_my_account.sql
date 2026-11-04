-- ACCOUNT-001 (D-049): eliminar mi cuenta.
--
-- El borrado es inmediato e irreversible: se elimina la fila de auth.users y todo lo que la
-- referencia cae en cascada (perfil, encuestas con sus opciones, votos y comentarios ajenos,
-- votos y comentarios propios, seguimientos, bloqueos, guardados, denuncias hechas y recibidas y
-- consumos de cuota). Los totales de las encuestas ajenas en las que votó bajan.
--
-- El @usuario queda reservado 30 días en released_usernames para que nadie se haga pasar por la
-- cuenta borrada nada más desaparecer. upsert_my_profile rechaza un nombre reservado con el mismo
-- USERNAME_TAKEN que uno en uso, sin revelar el motivo.
--
-- Regla permanente (E20): toda tabla futura con datos de una persona debe borrarse en cascada con
-- auth.users; supabase/tests/035_delete_my_account.test.sql lo comprueba por catálogo.
--
-- Storage: hoy no hay objetos por persona. AVATAR-002 (#252) y MEDIA-002 (#289) deberán borrar los
-- suyos al eliminar la cuenta; esta función sólo borra filas.

create table public.released_usernames (
  username text primary key check (username = lower(username)),
  released_at timestamptz not null default now()
);

-- RLS sin políticas y sin GRANT: ningún cliente lee ni escribe; sólo las funciones SECURITY DEFINER.
alter table public.released_usernames enable row level security;
revoke all on public.released_usernames from anon, authenticated;

-- Sin parámetro de identidad: la cuenta que se borra es siempre auth.uid(). La confirmación es el
-- @usuario propio, o «eliminar» si la cuenta aún no tiene perfil; no se recorta ni se normaliza más
-- que a minúsculas.
create function public.delete_my_account(p_confirm text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_username text;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  select pr.username into v_username from public.profiles pr where pr.user_id = v_user;

  if lower(coalesce(p_confirm, '')) is distinct from coalesce(v_username, 'eliminar') then
    raise exception using errcode = 'P0001', message = 'CONFIRMATION_MISMATCH';
  end if;

  -- Misma transacción que el borrado: o se hacen las dos cosas o ninguna. Si el nombre ya figuraba
  -- (lo registró otra persona pasado el plazo y también se elimina), el plazo se renueva.
  if v_username is not null then
    insert into public.released_usernames (username) values (lower(v_username))
      on conflict (username) do update set released_at = now();
  end if;

  delete from auth.users where id = v_user;
end;
$$;
revoke execute on function public.delete_my_account(text) from public, anon;
grant execute on function public.delete_my_account(text) to authenticated;

-- Mismo cuerpo que V2-001 (orden de errores, validaciones y upsert); sólo añade la reserva de
-- 30 días antes de escribir, con el mismo código que un nombre ocupado.
create or replace function public.upsert_my_profile(p_username text, p_display_name text)
returns table (username text, display_name text, is_private boolean, created_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_user uuid := auth.uid();
  v_username text;
  v_display text;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  -- Sin recortar espacios: «ana 23» y « ana» se rechazan.
  v_username := lower(coalesce(p_username, ''));
  if v_username !~ '^[a-z][a-z0-9_]{2,19}$' then
    raise exception using errcode = 'P0001', message = 'USERNAME_INVALID';
  end if;

  -- Lista fija en la función: cambiarla es una migración, no un dato.
  if v_username = any (array[
    'admin', 'me', 'settings', 'login', 'logout', 'create', 'polls', 'u', 'api',
    'auth', 'onboarding', 'opinion', 'soporte', 'support', 'moderacion'
  ]) then
    raise exception using errcode = 'P0001', message = 'USERNAME_RESERVED';
  end if;

  if p_display_name is not null then
    v_display := btrim(regexp_replace(p_display_name, '[ \t\n\r\f\v]+', ' ', 'g'));
    if char_length(v_display) not between 1 and 50 then
      raise exception using errcode = 'P0001', message = 'DISPLAY_NAME_INVALID';
    end if;
  end if;

  -- Nombre liberado por una cuenta eliminada hace menos de 30 días (ACCOUNT-001).
  if exists (
    select 1 from public.released_usernames ru
    where ru.username = v_username and ru.released_at > now() - interval '30 days'
  ) then
    raise exception using errcode = 'P0001', message = 'USERNAME_TAKEN';
  end if;

  begin
    return query
      insert into public.profiles as p (user_id, username, display_name)
        values (v_user, v_username, v_display)
        on conflict (user_id) do update
          set username = excluded.username,
              display_name = excluded.display_name,
              updated_at = now()
        returning p.username, p.display_name, p.is_private, p.created_at;
  exception when unique_violation then
    raise exception using errcode = 'P0001', message = 'USERNAME_TAKEN';
  end;
end;
$$;
revoke execute on function public.upsert_my_profile(text, text) from public, anon;
grant execute on function public.upsert_my_profile(text, text) to authenticated;
