-- MVP-014 y MVP-015: create_poll (docs/contratos-api.md §3.1).
-- Normaliza, valida, aplica la cuota de 5 encuestas por 60 minutos y crea la
-- encuesta con sus opciones en una sola transacción. Cualquier error la revierte.
-- SECURITY DEFINER porque los clientes no tienen permisos de escritura en las
-- tablas; el autor sale siempre de auth.uid().

create function public.create_poll(p_question text, p_options text[])
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_question text;
  v_options text[];
  v_poll_id uuid;
begin
  if v_user is null then
    raise exception using errcode = 'P0001', message = 'AUTH_REQUIRED';
  end if;

  if p_options is null or array_ndims(p_options) <> 1 or cardinality(p_options) not between 2 and 4 then
    raise exception using errcode = 'P0001', message = 'VALIDATION_OPTION_COUNT';
  end if;

  -- Normalización del contrato §1: colapsar rachas de espacios y recortar.
  v_question := btrim(regexp_replace(coalesce(p_question, ''), '[ \t\n\r\f\v]+', ' ', 'g'));
  if char_length(v_question) not between 10 and 280 then
    raise exception using errcode = 'P0001', message = 'VALIDATION_QUESTION_LENGTH';
  end if;

  select array_agg(btrim(regexp_replace(coalesce(o, ''), '[ \t\n\r\f\v]+', ' ', 'g')) order by n)
    into v_options
    from unnest(p_options) with ordinality as t (o, n);

  if exists (select 1 from unnest(v_options) as o where char_length(o) not between 1 and 100) then
    raise exception using errcode = 'P0001', message = 'VALIDATION_OPTION_LENGTH';
  end if;

  if (select count(distinct lower(o)) from unnest(v_options) as o) < cardinality(v_options) then
    raise exception using errcode = 'P0001', message = 'VALIDATION_OPTION_DUPLICATE';
  end if;

  -- Cuota: serializa las creaciones de la misma cuenta hasta el fin de la
  -- transacción, así dos peticiones simultáneas no pueden superar el límite.
  perform pg_advisory_xact_lock(hashtextextended('create_poll:' || v_user::text, 0));
  if (
    select count(*) from public.polls p
    where p.user_id = v_user and p.created_at > now() - interval '60 minutes'
  ) >= 5 then
    raise exception using errcode = 'P0001', message = 'RATE_LIMITED';
  end if;

  insert into public.polls (user_id, question)
    values (v_user, v_question)
    returning id into v_poll_id;

  insert into public.poll_options (poll_id, text, position)
    select v_poll_id, o, n::smallint
    from unnest(v_options) with ordinality as t (o, n);

  return v_poll_id;
end;
$$;

revoke execute on function public.create_poll(text, text[]) from public, anon;
grant execute on function public.create_poll(text, text[]) to authenticated;
