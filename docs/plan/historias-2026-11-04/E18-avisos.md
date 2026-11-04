# E18 · Avisos dentro de la app

**Issue de la épica:** [#347](https://github.com/migdlp/opinion-social-media/issues/347) · **Objetivo de la épica:** que cada persona se entere, dentro de Opinión, de lo que le afecta: nuevos seguidores, solicitudes, solicitudes aceptadas, encuestas que han cerrado y, en otras épicas, respuestas a sus comentarios y moderación. Decisión aplicable: D-047. Reglas comunes en el [README](README.md).

| Tarea | Historia | Prioridad | Tamaño | Dependencias |
|---|---|---|---|---|
| [NOTIF-001](https://github.com/migdlp/opinion-social-media/issues/375) | HU-75 Avisos derivados y de seguimiento (backend) | P1 | L | — |
| [NOTIF-002](https://github.com/migdlp/opinion-social-media/issues/376) | HU-74 Aviso de cierre de encuestas (backend) | P1 | M | NOTIF-001 |
| [NOTIF-003](https://github.com/migdlp/opinion-social-media/issues/377) | HU-74/75 Centro de avisos y campana (interfaz) | P1 | M | NOTIF-001 |

## Modelo de avisos (D-047)

- **No hay tabla de avisos.** Cada tipo de aviso se **calcula al leer** a partir de su tabla de origen. Por eso, si el origen se borra o deja de ser visible, el aviso desaparece solo. No hace falta cron, no hay triggers y no se guardan copias de datos.
- Quien recibe es siempre `auth.uid()`. Se muestran los avisos de los últimos **30 días**.
- Para saber qué está leído se guarda en `profiles.notifications_seen_at`. Un aviso está «no leído» si ocurrió después de ese momento.
- En todos los tipos se excluyen las personas con las que hay bloqueo en cualquier sentido y las que quien recibe tiene silenciadas (SOCIAL-003, si ya está en main).
- Cada tipo de aviso tiene un `kind`, un instante de origen (`occurred_at`) y una clave estable (`ref`) que se usa en el cursor:

| `kind` | Tarea | Origen | `occurred_at` | `ref` |
|---|---|---|---|---|
| `follow_request` | NOTIF-001 | `follows` hacia mí en estado `pending` | `created_at` | `@usuario` del solicitante |
| `new_follower` | NOTIF-001 | `follows` hacia mí, aceptado de forma directa (`accepted_at = created_at`) | `accepted_at` | `@usuario` |
| `follow_accepted` | NOTIF-001 | `follows` míos aceptados tras solicitud (`accepted_at > created_at`) | `accepted_at` | `@usuario` |
| `poll_closed` | NOTIF-002 | Encuestas que voté y que han cerrado | `closes_at` | `poll_id` |
| `my_poll_closed` | NOTIF-002 | Encuestas mías que han cerrado | `closes_at` | `poll_id` |
| `comment_reply` | CMT-004 | Respuestas a mis comentarios | `created_at` de la respuesta | `comment_id` |
| `poll_hidden` | MOD-005 | Encuestas mías ocultadas por moderación | `hidden_at` | `poll_id` |

**Coordinación:** NOTIF-002, CMT-004 y MOD-005 recrean `list_notifications` y `count_unread_notifications` para añadir su tipo. Se fusionan de una en una, partiendo siempre de la versión que esté en main.

---

### NOTIF-001 — Avisos derivados y de seguimiento: backend

**Historia (HU-75):** como persona con sesión, quiero enterarme de quién empieza a seguirme, de quién me pide seguirme y de quién acepta mis solicitudes.

- **Épica:** E18 · **Prioridad:** P1 · **Tamaño:** L
- **Etiquetas:** `backend`, `database`, `security`, `testing`, `area:perfil`
- **Dependencias:** ninguna.

**Backend**
- Migración `<ts>_notifications.sql`:
  - Añadir la columna `alter table public.follows add column accepted_at timestamptz`.
    - Rellenar las filas que ya existen: `update public.follows set accepted_at = created_at where status = 'accepted'`.
    - Recrear `follow_user` para que, cuando la cuenta seguida sea pública y el seguimiento se acepte directamente, guarde `accepted_at = created_at`.
    - Recrear `respond_follow_request` para que, al aceptar, guarde `accepted_at = now()`.
    - Como ahora hay columnas nuevas, la política `follows_select_participant` debe seguir dejando ver sólo las filas propias.
  - Añadir la columna `alter table public.profiles add column notifications_seen_at timestamptz`, sin `grant` (los clientes no la leen ni la escriben).
  - Índices: `follows (followee_id, created_at desc)` y `follows (follower_id, accepted_at desc) where status = 'accepted'`.
- `public.list_notifications(p_cursor text default null)` devuelve una tabla con estas columnas:
  - `kind text`, `occurred_at timestamptz`, `is_unread boolean`;
  - `actor_username text`, `actor_display_name text`, `actor_avatar_icon text`;
  - `poll_id uuid`, `poll_question text`, `comment_id uuid`, `detail text`;
  - `cursor text`.
  - Permisos y errores: sólo `authenticated`, `stable`, `security definer`; sin perfil da `PROFILE_REQUIRED`, sin sesión da `AUTH_REQUIRED`.
  - Construcción: es la unión de los tres tipos de esta tarea según la tabla del modelo, limitada a `occurred_at > now() - interval '30 days'` y con las exclusiones del modelo.
  - Orden y paginación: `occurred_at desc, kind asc, ref asc`, 21 filas (20 + 1). El cursor es `<occurred_at UTC>|<kind>|<ref>`; uno ilegible da `INVALID_CURSOR`.
  - `is_unread` vale `occurred_at > coalesce(notifications_seen_at, '-infinity')`.
  - Nunca devuelve `user_id`.
- `public.count_unread_notifications() returns integer`: sólo `authenticated`. Aplica la misma unión y los mismos filtros que la lista, pero cuenta sólo los no leídos. Devuelve como máximo `100`, porque la interfaz muestra «99+».
- `public.mark_notifications_seen() returns void`: sólo `authenticated`. Guarda `notifications_seen_at = now()` en el perfil propio.
- Adaptadores:
  - `listNotifications(cursor)` → `Result<{ items: AppNotification[], nextCursor }>`.
  - `countUnreadNotifications()` → `Result<number>`.
  - `markNotificationsSeen()` → `Result<void>`.

**Casos límite**
- Una solicitud que se acepta deja de ser `follow_request`. Como se aceptó tras solicitud, no genera `new_follower` para quien la acepta; para quien la pidió aparece `follow_accepted`.
- Una solicitud rechazada desaparece, y quien la envió no recibe ningún aviso.
- Si se deja de seguir, el aviso desaparece.
- Si una cuenta bloquea a otra, desaparecen todos sus avisos en ambos sentidos.

**Criterios de aceptación**
- [ ] B sigue a A, que es pública: A recibe `new_follower` de B como no leído. Si A llama a `mark_notifications_seen`, deja de estar no leído.
- [ ] C solicita seguir a A, que es privada: A recibe `follow_request`. Si A acepta, el aviso desaparece y C recibe `follow_accepted`.
- [ ] Un aviso de hace 31 días no aparece. El recuento no pasa de 100.
- [ ] Hay bloqueo entre A y B: no aparece ningún aviso entre ellas.
- [ ] Ninguna cuenta puede obtener avisos de otra. `anon` no puede ejecutar ninguna de las RPC.
- [ ] Las filas de `follows` que ya existían conservan su `created_at` y reciben `accepted_at`.
- [ ] Rendimiento: con 1000 seguidores y 1000 seguidos, la lista tarda menos de 20 ms en local. Medido en la PR.

**Pruebas (TDD)**
- SQL `<NNN>_notifications.test.sql`.
- Volver a pasar los tests de seguimiento que ya existen, como regresión de `follow_user` y `respond_follow_request`.
- Ataque HTTP en `tests/security/notifications-attacks.test.ts`.

**Fuera de alcance:** la interfaz (NOTIF-003), email, push, realtime y preferencias por tipo.

---

### NOTIF-002 — Aviso de cierre de encuestas: backend

**Historia (HU-74):** como persona que votó, quiero un aviso cuando cierre la encuesta para ver el resultado final. Como autora, quiero saber cuándo cierran mis encuestas.

- **Épica:** E18 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `backend`, `database`, `security`, `testing`, `area:encuestas`
- **Dependencias:** NOTIF-001.

**Backend**
- Recrear `list_notifications` y `count_unread_notifications` añadiendo dos tipos:
  - **`poll_closed`:** encuestas con un voto mío, en `published`, visibles para mí (`can_view_author`) y con `closes_at` en `(now() - 30 días, now()]`. Se informan `poll_id` y `poll_question`; los campos del actor van a `null`.
  - **`my_poll_closed`:** encuestas mías en `published` con `closes_at` en la misma ventana. Si además las voté, sólo se devuelve `my_poll_closed`, nunca las dos.
- Índice `polls (closes_at) where status = 'published' and closes_at is not null`.
- No se calcula ni se devuelve el resultado: el aviso sólo enlaza a la encuesta.

**Criterios de aceptación**
- [ ] Voté una encuesta que cerró hace 1 hora: recibo `poll_closed`, con el `occurred_at` igual a `closes_at`.
- [ ] Una encuesta que cierra dentro de 1 hora todavía no genera aviso.
- [ ] Soy la autora y además la voté: recibo un solo aviso, `my_poll_closed`.
- [ ] Una encuesta oculta, borrada o de una cuenta que pasa a privada sin permiso no genera aviso.
- [ ] Ningún campo devuelto contiene agregados.

**Pruebas (TDD)**
- Ampliar `<NNN>_notifications.test.sql`, o crear `<NNN>_notifications_closed.test.sql`.

**Fuera de alcance:** avisos previos al cierre («cierra en 1 hora») y resumen del resultado dentro del aviso.

---

### NOTIF-003 — Centro de avisos y campana: interfaz

**Historias (HU-74, HU-75).**

- **Épica:** E18 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `frontend`, `design`, `accessibility`, `testing`, `area:perfil`
- **Dependencias:** NOTIF-001. Los textos de los tipos de NOTIF-002, CMT-004 y MOD-005 se añaden aquí; si esos tipos todavía no existen en el backend, simplemente no aparecen.

**Interfaz**
- **Campana:**
  - Se coloca en la cabecera, tanto en escritorio como en la cabecera superior móvil, a la izquierda del menú de cuenta, y sólo aparece con sesión.
  - Es un enlace a `/avisos` con un `aria-label` que cambia según el recuento: **«Avisos»** si no hay ninguno sin leer, o **«Avisos, {n} sin leer»** si los hay.
  - Si hay avisos sin leer, muestra un globo con el número en color de acento, que pone **«99+»** cuando son 100.
  - El recuento se pide en el servidor en cada navegación con `countUnreadNotifications`. Si esa llamada falla, se muestra la campana sin globo.
- **Página `/avisos`:**
  - Está protegida: sin sesión se va al login, con retorno a `/avisos`.
  - El título es **«Avisos»**.
  - Muestra una lista paginada de 20 en 20 con **«Cargar más»**.
  - Al montarse, llama una sola vez, en cliente, a la acción de servidor `markNotificationsSeen`.
  - Los avisos no leídos se marcan con un punto de acento y el texto oculto «Nuevo».
- **Cada aviso:** lleva el `Avatar` del actor, o un icono de encuesta si no hay actor, el texto, el tiempo relativo (`Intl.RelativeTimeFormat("es")`, por ejemplo «hace 5 min») y un enlace:

| `kind` | Texto | Enlace |
|---|---|---|
| `follow_request` | **«@{actor} quiere seguirte.»** | `/solicitudes` |
| `new_follower` | **«@{actor} ha empezado a seguirte.»** | `/u/{actor}` |
| `follow_accepted` | **«@{actor} ha aceptado tu solicitud.»** | `/u/{actor}` |
| `poll_closed` | **«Ha cerrado «{pregunta}». Ya puedes ver el resultado final.»** | `/polls/{id}` |
| `my_poll_closed` | **«Tu encuesta «{pregunta}» ha cerrado.»** | `/polls/{id}` |
| `comment_reply` | **«@{actor} ha respondido a tu comentario en «{pregunta}».»** | `/polls/{id}#comentario-{comment_id}` |
| `poll_hidden` | **«Hemos retirado tu encuesta «{pregunta}». Motivo: {detail}.»** | `/settings#retiradas` |

- La pregunta se recorta a 80 caracteres con «…».
- **Estado vacío:** título **«No tienes avisos»** y descripción **«Aquí verás nuevos seguidores, solicitudes y cierres de encuestas.»**
- **Navegación móvil:** la barra inferior no cambia, porque la campana ya está en la cabecera superior.

**Criterios de aceptación**
- [ ] Con 3 avisos nuevos, la campana muestra «3». Al abrir `/avisos` se ven los 3 marcados como nuevos y, tras navegar a otra página, la campana ya no tiene globo.
- [ ] Cada tipo muestra su texto y lleva a su enlace.
- [ ] El visitante no ve la campana, y si abre `/avisos` va al login.
- [ ] El `aria-label` de la campana cambia según el recuento. La lista funciona con teclado, a 320 px y en ambos temas.

**Pruebas (TDD)**
- Vitest de la campana (0, n y 100) y de `NotificationItem` (un caso por `kind`).
- E2E `e2e/avisos.spec.ts`, con seguimiento, solicitud y una encuesta que se siembra ya cerrada.

**Fuera de alcance:** actualización en tiempo real, sonido, borrar avisos uno a uno y preferencias.
