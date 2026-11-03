# Moderación manual de encuestas (MVP-021)

El MVP no tiene panel de moderación ni borrado por usuarios (brief §6.5). Una persona con acceso administrativo al proyecto Supabase oculta la encuesta cambiando `polls.status` a `hidden`. **No se borra nada**: opciones y votos se conservan y la encuesta se puede restaurar.

## Qué provoca `hidden`

| Ruta | Efecto | Dónde se impone |
|---|---|---|
| Feed `/` y lectura de `polls` / `poll_options` | Desaparece para todos, autor incluido | RLS `polls_select_published` y `poll_options_select_published` |
| Detalle `/polls/[id]` | «No disponible» (404), igual que si no existiera | `getPublicPoll` → `POLL_UNAVAILABLE` |
| `vote_poll` | Rechazado: `POLL_UNAVAILABLE` | RPC |
| `get_poll_results` | Sin agregados, ni siquiera para quien ya votó: `POLL_UNAVAILABLE` | RPC |
| Voto propio (`votes`) | No visible | RLS `votes_select_own` |

Los clientes (`anon`, `authenticated`) no pueden modificar `status`: no tienen UPDATE en `polls` (MVP-011). Sólo puede hacerlo un rol administrativo: la persona operadora desde el Dashboard o el SQL editor (`postgres`), o `service_role` desde un entorno seguro, nunca desde el navegador.

## Procedimiento

1. **Identificar la encuesta.** El UUID es el final de su URL: `https://<dominio>/polls/<id>`.
2. **Elegir el proyecto correcto:** producción `qchpdrolulcgmiliysvr` para contenido real; desarrollo `ltlrujmqenhktiilsnis` sólo para pruebas. Ver [supabase-acceso.md](supabase-acceso.md).
3. **Ocultar**, por una de estas dos vías:
   - **Table Editor** → tabla `polls` → filtrar por `id` → cambiar `status` a `hidden` → guardar.
   - **SQL editor:**

     ```sql
     update public.polls set status = 'hidden' where id = '<id>' returning id, status;
     ```

     Debe devolver exactamente una fila con `hidden`. Si devuelve cero, el ID no existe en ese proyecto.
4. **Comprobar:** abrir `/polls/<id>` en una ventana privada → «No disponible»; la encuesta ya no aparece en `/`.
5. **Registrar** la decisión (fecha, ID, motivo y quién actuó) donde el equipo lleve los incidentes; hoy, un comentario en el issue de seguimiento correspondiente. No copiar datos personales ni contenido ofensivo en el registro más allá de lo necesario.

### Restaurar

```sql
update public.polls set status = 'published' where id = '<id>' returning id, status;
```

Vuelve a mostrarse con sus opciones y votos intactos; quien había votado recupera sus resultados.

## Denuncias (V2-020)

Los usuarios con sesión denuncian encuestas desde el menú «⋯» (motivo y texto opcional). Cada cuenta puede denunciar una encuesta una vez y hasta 20 por hora. **Una denuncia no oculta nada**: la revisa una persona operadora. Los clientes no pueden leer `poll_reports`; se consulta con acceso administrativo (SQL editor o `service_role`).

Encuestas con más denuncias, para decidir qué revisar primero:

```sql
select p.id, p.question, p.status, count(*) as denuncias,
       count(*) filter (where r.reason = 'odio') as odio,
       count(*) filter (where r.reason = 'acoso') as acoso,
       count(*) filter (where r.reason = 'sexual') as sexual,
       count(*) filter (where r.reason = 'violencia') as violencia,
       count(*) filter (where r.reason = 'spam') as spam,
       count(*) filter (where r.reason = 'otro') as otro,
       max(r.created_at) as ultima
from public.poll_reports r
join public.polls p on p.id = r.poll_id
group by p.id, p.question, p.status
order by denuncias desc, ultima desc
limit 50;
```

Detalle de una encuesta (sin identificar a las personas más de lo necesario):

```sql
select reason, details, created_at from public.poll_reports
where poll_id = '<id>' order by created_at;
```

Si procede, **ocultar** con el paso 3 del procedimiento anterior y registrar la decisión. Las denuncias se conservan, también al ocultar o restaurar; se borran en cascada si se borra la encuesta o la cuenta denunciante.

## Denuncias de personas (MOD-001)

`public.report_user(p_username, p_reason, p_details)` guarda una denuncia en `public.user_reports` (denunciante, cuenta denunciada, motivo, detalle opcional de hasta 500 caracteres). Mismos motivos que en las encuestas. **La tabla no es legible ni escribible por ningún cliente**: ni el denunciado ni el denunciante pueden consultarla, así que nadie deduce quién le ha denunciado. Una denuncia por pareja (`ALREADY_REPORTED`), 10 por hora y cuenta (`REPORT_RATE_LIMITED`), y no se puede denunciar a uno mismo (`CANNOT_REPORT_SELF`). Entre cuentas bloqueadas la persona «no existe» (`USER_NOT_FOUND`).

**Denunciar no hace nada automático**: no oculta, suspende ni bloquea la cuenta, ni cambia sus seguimientos, votos o encuestas. La revisión es manual y el bloqueo es una capacidad independiente que cada persona ejerce sobre la suya.

Revisión (SQL editor de Supabase con la clave de servicio; nunca desde la app):

```sql
-- Cuentas con más denuncias, con motivo y fecha; sin identificar a quien denuncia más de lo necesario.
select pr.username, count(*) as denuncias, array_agg(distinct r.reason) as motivos, max(r.created_at) as ultima
from public.user_reports r
join public.profiles pr on pr.user_id = r.reported_id
group by pr.username order by denuncias desc, ultima desc;

-- Detalle de una cuenta.
select r.reason, r.details, r.created_at from public.user_reports r
join public.profiles pr on pr.user_id = r.reported_id
where lower(pr.username) = lower('<usuario>') order by r.created_at;
```

Las medidas disponibles hoy son las manuales sobre contenido (ocultar encuestas, arriba); no hay suspensión de cuentas ni panel. **Retención**: las denuncias se conservan mientras existan la cuenta denunciante y la denunciada; se borran en cascada si se elimina cualquiera de las dos. El plazo de conservación, el acceso de la persona denunciada a los datos y la base legal son una decisión de la revisión legal (LEGAL-003); hasta entonces no se borran por antigüedad.

## Comentarios (CMT-003)

`public.report_comment(p_comment_id, p_reason, p_details)` guarda la denuncia en `public.comment_reports` (sin ningún permiso para clientes; una por comentario y cuenta; 20 por hora y cuenta). Sólo se puede denunciar un comentario que quien llama podría ver en ese momento: encuesta visible, debate activo, voto previo si la encuesta está abierta y sin bloqueos. **Cualquier otro caso responde `COMMENT_UNAVAILABLE`**, igual que un comentario inexistente u oculto, para no dar pistas. No se puede denunciar el propio comentario (`CANNOT_REPORT_SELF`).

**Ocultar un comentario** lo hace un operador con la clave de servicio; los clientes no tienen `update`:

```sql
-- Comentarios más denunciados.
select c.id, pr.username as autor, left(c.body, 80) as texto, count(r.*) as denuncias, array_agg(distinct r.reason) as motivos
from public.comment_reports r
join public.comments c on c.id = r.comment_id
join public.profiles pr on pr.user_id = c.user_id
where c.status = 'published'
group by c.id, pr.username, c.body order by denuncias desc;

-- Ocultar y restaurar.
update public.comments set status = 'hidden' where id = '<id>';
update public.comments set status = 'published' where id = '<id>';
```

Un comentario oculto desaparece de `list_comments` y de las denuncias nuevas, y **no reaparece al apagar y reactivar el debate** (el estado es independiente de `polls.comments_enabled`). Las denuncias se conservan al ocultar o restaurar y se borran en cascada con el comentario o con la cuenta denunciante. El plazo de conservación y la base legal quedan para la revisión legal (LEGAL-003).

## No hacer

- No borrar filas de `polls`, `poll_options` ni `votes` para moderar: borrar una encuesta elimina en cascada sus opciones y votos y no se puede deshacer.
- No usar otros valores de `status`: la base sólo admite `published` y `hidden` (`CHECK`).
- No dar a la app ni a ningún cliente permisos para cambiar `status`.

## Verificación

`supabase/tests/009_moderation.test.sql` (en `npm run test:db` y en CI) recorre el flujo completo: un usuario normal, autor incluido, no puede ocultar ni restaurar; el operador oculta; anon y el autor dejan de verla; quien votó pierde los resultados y su voto deja de ser visible; nadie puede votar; los datos se conservan; al restaurar vuelven los resultados.
