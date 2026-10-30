# Contratos de datos y RPC (MVP-013)

**Estado:** contrato definido; **no implementado**. Lo implementan MVP-014 a MVP-019 y MVP-023. Sirve para que frontend prepare mocks sin esperar al backend. Cualquier cambio posterior se registra aquí y en `decisiones.md`.

Modelo de datos: el del [brief §5](brief-producto.md#5-modelo-de-datos-obligatorio), sin cambios de nombres. Todas las operaciones usan Supabase JS SDK contra el esquema `public`.

## 1. Convenciones comunes

| Tema | Regla |
|---|---|
| Identidad | El usuario sale siempre de `auth.uid()`. Ninguna operación acepta `user_id`, `status` ni autor como argumento. |
| Argumentos RPC | Prefijo `p_` (`p_poll_id`). Los nombres son parte del contrato porque supabase-js los envía por nombre. |
| Fechas | `timestamptz` serializado por PostgREST como ISO 8601 con microsegundos y zona (`2026-10-26T22:33:31.123456+00:00`). El cliente no recorta la precisión: el cursor la necesita. |
| Longitudes | Se cuentan en **puntos de código Unicode**: `char_length()` en SQL; `[...texto].length` en TypeScript (no `texto.length`). |
| Normalización | Recortar extremos y colapsar cada racha de espacio, tabulador, salto de línea o retorno (`[ \t\n\r\f\v]+`) en un solo espacio. Se aplica antes de validar y es lo que se guarda. La base de datos es la autoridad; el cliente repite la regla sólo para mostrar errores pronto. |
| Duplicados | Dos opciones normalizadas son iguales si `lower(a) = lower(b)`. No se quitan tildes: «Sí» y «Si» son distintas. |
| Autor público | Las respuestas públicas no incluyen `user_id`. La interfaz muestra un autor genérico («Anónimo»). |
| Errores de negocio | La RPC aborta con `RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = '<CÓDIGO>'`. Así la transacción se revierte entera y supabase-js entrega `error.code = 'P0001'` y `error.message = '<CÓDIGO>'`. El mensaje es sólo el código, sin datos ni SQL. |

## 2. Códigos de error

`AppErrorCode` es la única lista de errores que ve la interfaz. El adaptador de MVP-023 traduce cualquier otro error a `UNKNOWN` o `NETWORK_ERROR`.

| Código | Origen | Cuándo | Mensaje de interfaz propuesto |
|---|---|---|---|
| `AUTH_REQUIRED` | `create_poll`, `vote_poll`, `get_poll_results`; también `42501` (sin permiso EXECUTE para `anon`) | No hay sesión válida | «Inicia sesión para continuar.» |
| `VALIDATION_QUESTION_LENGTH` | `create_poll` | Pregunta normalizada fuera de 10–280 | «La pregunta debe tener entre 10 y 280 caracteres.» |
| `VALIDATION_OPTION_COUNT` | `create_poll` | `p_options` nulo o con menos de 2 / más de 6 elementos | «Añade entre 2 y 6 opciones.» |
| `VALIDATION_OPTION_LENGTH` | `create_poll` | Alguna opción normalizada fuera de 1–100 (incluye vacías) | «Cada opción debe tener entre 1 y 100 caracteres.» |
| `VALIDATION_OPTION_DUPLICATE` | `create_poll` | Dos opciones iguales según §1 | «Hay opciones repetidas.» |
| `INVALID_CLOSES_AT` | `create_poll` | `p_closes_at` fuera de [ahora + 1 hora, ahora + 30 días] | «El cierre debe estar entre 1 hora y 30 días desde ahora.» |
| `INVALID_CATEGORY` | `create_poll` | `p_category` no nulo que no existe en `categories` (distingue mayúsculas) | «Elige una categoría válida.» |
| `POLL_CLOSED` | `vote_poll` (trigger en `votes`) | `now() >= closes_at`; gana también sobre `ALREADY_VOTED` | «Esta encuesta ya está cerrada y no admite votos.» |
| `RATE_LIMITED` | `create_poll` | Ya hay 5 encuestas de la cuenta en los últimos 60 minutos | «Has alcanzado el límite de 5 encuestas por hora. Inténtalo más tarde.» |
| `POLL_UNAVAILABLE` | `vote_poll`, `get_poll_results`, detalle | UUID mal formado, inexistente u oculto; no se distingue entre ellos | «Esta encuesta no está disponible.» |
| `OPTION_INVALID` | `vote_poll` | La opción no existe o pertenece a otra encuesta | «Esa opción no es válida para esta encuesta.» |
| `ALREADY_VOTED` | `vote_poll` | La cuenta ya tenía voto en la encuesta (incluida una carrera perdida) | No es un fallo: la interfaz pasa a «Ya has votado» y pide resultados |
| `NOT_VOTED` | `get_poll_results` | La cuenta (incluido el autor) aún no ha votado | No se muestra: la interfaz enseña el selector de voto |
| `ALREADY_REPORTED` | `report_poll` | La cuenta ya había denunciado esa encuesta | «Ya has denunciado esta encuesta.» |
| `REPORT_RATE_LIMITED` | `report_poll` | 20 denuncias de la cuenta en los últimos 60 minutos | «Has enviado demasiadas denuncias. Inténtalo más tarde.» |
| `REPORT_INVALID` | `report_poll` | Motivo ausente o fuera de la lista, o detalle de más de 500 caracteres | «Elige un motivo; el detalle admite hasta 500 caracteres.» |
| `USERNAME_INVALID` | `upsert_my_profile` | `p_username` nulo o fuera de `^[a-z][a-z0-9_]{2,19}$` tras pasar a minúsculas (sin recortar espacios) | «El usuario debe tener de 3 a 20 caracteres (letras minúsculas, números o _) y empezar por una letra.» |
| `USERNAME_TAKEN` | `upsert_my_profile` | Otro perfil ya usa ese `@usuario` (sin distinguir mayúsculas) | «Ese nombre ya está en uso.» |
| `USERNAME_RESERVED` | `upsert_my_profile` | Nombre de la lista reservada (`admin`, `settings`, `u`, `api`…) | «Ese usuario está reservado. Prueba con otro.» |
| `DISPLAY_NAME_INVALID` | `upsert_my_profile` | Nombre visible normalizado fuera de 1–50 (vacío incluido; `null` es válido) | «El nombre debe tener entre 1 y 50 caracteres.» |
| `PROFILE_REQUIRED` | `set_profile_privacy`; `create_poll` y `vote_poll` (trigger) | La cuenta aún no tiene perfil | «Elige primero tu usuario.» |
| `USER_NOT_FOUND` | `follow_user`, `unfollow_user`, `respond_follow_request`, `remove_follower` | El `@usuario` no existe; en `respond_follow_request`, tampoco hay solicitud pendiente de esa cuenta | «No existe ese usuario.» |
| `PROFILE_PRIVATE` | `get_profile_votes` | El perfil es privado y quien mira no es el dueño ni un seguidor aceptado | «Esta cuenta es privada.» |
| `CANNOT_FOLLOW_SELF` | `follow_user` | El `@usuario` es el propio | «No puedes seguirte a ti mismo.» |
| `FOLLOW_RATE_LIMITED` | `follow_user` | 200 seguimientos nuevos de la cuenta en 60 minutos (el límite cuenta filas creadas; repetir uno existente no cuenta) | «Has seguido a demasiadas cuentas. Inténtalo más tarde.» |
| `NETWORK_ERROR` | Adaptador (cliente) | `fetch` falla o no llega respuesta | «No hay conexión. Comprueba tu red y vuelve a intentarlo.» |
| `UNKNOWN` | Adaptador (cliente) | Cualquier otro error | «Algo ha fallado. Vuelve a intentarlo.» |

Orden de comprobación dentro de cada RPC (determina qué código gana si hay varios fallos):

- `create_poll`: `AUTH_REQUIRED` → `VALIDATION_OPTION_COUNT` → `VALIDATION_QUESTION_LENGTH` → `VALIDATION_OPTION_LENGTH` → `VALIDATION_OPTION_DUPLICATE` → `INVALID_CLOSES_AT` → `INVALID_CATEGORY` → `RATE_LIMITED`.
- `vote_poll`: `AUTH_REQUIRED` → `POLL_UNAVAILABLE` → `OPTION_INVALID` → `POLL_CLOSED` → `ALREADY_VOTED`.
- `get_poll_results`: `AUTH_REQUIRED` → `POLL_UNAVAILABLE` → `NOT_VOTED`. Ningún agregado se calcula antes de superar las tres. **Excepción D-020 (V2-014):** si la encuesta está publicada, es visible para quien llama y `closes_at <= now()`, no se exige sesión ni voto y se devuelven los agregados. Para un visitante, una cerrada privada o inexistente sigue siendo `AUTH_REQUIRED`; con sesión, `POLL_UNAVAILABLE`.
- `report_poll`: `AUTH_REQUIRED` → `POLL_UNAVAILABLE` → `REPORT_INVALID` → `ALREADY_REPORTED` → `REPORT_RATE_LIMITED`.
- `upsert_my_profile`: `AUTH_REQUIRED` → `USERNAME_INVALID` → `USERNAME_RESERVED` → `DISPLAY_NAME_INVALID` → `USERNAME_TAKEN`.
- `set_profile_privacy`: `AUTH_REQUIRED` → `PROFILE_REQUIRED`.
- `follow_user`: `AUTH_REQUIRED` → `PROFILE_REQUIRED` → `USER_NOT_FOUND` → `CANNOT_FOLLOW_SELF` → `FOLLOW_RATE_LIMITED`. `unfollow_user` y `remove_follower`: `AUTH_REQUIRED` → `USER_NOT_FOUND`. `respond_follow_request`: `AUTH_REQUIRED` → `USER_NOT_FOUND`.

## 3. RPC

Las funciones: `EXECUTE` sólo para `authenticated`, revocado a `PUBLIC` y `anon`. Si son `SECURITY DEFINER`, llevan `SET search_path = ''` y referencias cualificadas (`public.polls`). Detalle de endurecimiento en MVP-020.

### 3.1. `create_poll`

```sql
public.create_poll(p_question text, p_options text[], p_closes_at timestamptz default null, p_category text default null) returns uuid
```

- Normaliza y valida según §1 y §2; el orden del array define `position` 1..n.
- Inserta `polls` (`status = 'published'`, `user_id = auth.uid()`, `created_at = now()`) y sus opciones en la misma transacción. Cualquier error revierte todo.
- Cuota: cuenta las encuestas de `auth.uid()` con `created_at > now() - interval '60 minutes'` tras serializar por cuenta (p. ej. `pg_advisory_xact_lock` sobre el usuario). La técnica concreta se decide en MVP-015; el contrato sólo fija `RATE_LIMITED`.
- `p_closes_at` (V2-013, opcional): si se indica debe estar entre 1 hora y 30 días desde ahora (`INVALID_CLOSES_AT`). Se guarda en `polls.closes_at` y no se puede editar. La firma de dos argumentos sigue valiendo.
- `p_category` (V2-021, opcional): `slug` de `public.categories` (`deportes`, `tecnologia`, `politica`, `entretenimiento`, `ciencia`, `estilo-de-vida`, `otros`); si no existe, `INVALID_CATEGORY`. Se guarda en `polls.category_slug`.
- Devuelve el `id` de la encuesta.

```ts
const { data, error } = await supabase.rpc('create_poll', {
  p_question: '¿Cuál es tu bebida favorita para el desayuno?',
  p_options: ['Café', 'Té', 'Zumo'],
}) // data: string (uuid)
```

### 3.2. `vote_poll`

```sql
public.vote_poll(p_poll_id uuid, p_option_id uuid)
  returns table (poll_id uuid, option_id uuid, created_at timestamptz)
```

- Comprueba que la encuesta existe y es `published`, y que la opción pertenece a ella.
- Inserta en `votes` con `user_id = auth.uid()`. El duplicado se resuelve con `UNIQUE(poll_id,user_id)` (p. ej. `ON CONFLICT DO NOTHING`); si no se insertó fila, `ALREADY_VOTED`. Dos peticiones simultáneas producen un voto y un `ALREADY_VOTED`.
- Devuelve una fila con el voto creado (llamar con `.single()`). No devuelve recuentos: los resultados se piden con `get_poll_results`.
- El autor puede votar en su encuesta con las mismas reglas.
- Encuesta cerrada (`closes_at <= now()`): el trigger `votes_reject_closed_poll` (BEFORE INSERT) rechaza con `POLL_CLOSED`; `vote_poll` no cambia.

### 3.3. `get_poll_results`

```sql
public.get_poll_results(p_poll_id uuid)
  returns table (
    option_id    uuid,
    "position"   smallint,
    text         text,
    votes        integer,       -- >= 0; aparecen todas las opciones
    percentage   numeric(4,1),  -- ROUND(100.0 * votes / total_votes, 1); 100.0 evita división entera
    total_votes  integer,       -- igual en todas las filas; >= 1 (>= 0 si está cerrada)
    my_option_id uuid           -- igual en todas las filas; nulo en una cerrada si no votó o no hay sesión
  )
```

- Una fila por opción, ordenadas por `position`. Las opciones con 0 votos aparecen con `votes = 0` y `percentage = 0.0`.
- La suma de porcentajes puede no ser exactamente 100,0 por el redondeo; se acepta.
- **No contiene** `user_id`, identidades de votantes, fechas de voto ni otro dato por votante. Sólo agregados por opción, el total y la opción propia.
- Sin caché compartida: se llama con la sesión del usuario y la página que la usa es dinámica (`no-store`).
- **Encuestas cerradas (V2-014, D-020):** `EXECUTE` también para `anon`. Si `closes_at <= now()` y la encuesta es visible (§3.8), devuelve los resultados a quien los pida, con o sin sesión y haya votado o no; `my_option_id` es nulo si no votó o no hay sesión. Con 0 votos devuelve todas las opciones con `votes = 0`, `percentage = 0.0` y `total_votes = 0`. El estado de la interfaz es `closed` (o `voted` si la cuenta votó). Las abiertas no cambian en nada.

### 3.5. `report_poll` (V2-020)

```sql
public.report_poll(p_poll_id uuid, p_reason text, p_details text default null) returns void
```

- Motivos: `spam`, `odio`, `acoso`, `sexual`, `violencia`, `otro`. `p_details` (opcional, ≤ 500) se normaliza; vacío se guarda como `null`.
- Guarda una fila en `poll_reports` (única por encuesta y denunciante; máx. 20 por hora y cuenta). Sólo se puede denunciar una encuesta publicada. La tabla no es legible ni escribible por clientes; no se oculta nada automáticamente (S-8): ver [moderacion.md](moderacion.md).
### 3.4. `upsert_my_profile` y `set_profile_privacy` (V2-001)

```sql
public.upsert_my_profile(p_username text, p_display_name text)
  returns table (username text, display_name text, is_private boolean, created_at timestamptz)
public.set_profile_privacy(p_private boolean) returns void
```

- `upsert_my_profile` crea o edita el perfil de `auth.uid()`; `username` se guarda en minúsculas y `display_name` se normaliza como en §1. No cambia `is_private`. Nunca devuelve `user_id`.
- `set_profile_privacy` cambia `is_private`. Al pasar a pública acepta todas las solicitudes pendientes (S-6, V2-004).
- `get_my_profile()` (V2-002) → `table (username, display_name, is_private)` de la cuenta con sesión; ninguna fila si aún no tiene perfil. Es la forma de saber si hay perfil sin exponer `user_id`; la usa el callback de OAuth para enviar a `/onboarding`.
- **Perfil obligatorio (S-1):** triggers `BEFORE INSERT` en `polls` y `votes` lanzan `PROFILE_REQUIRED` cuando hay sesión de cliente (`auth.uid()` no nulo) y el autor/votante no tiene perfil. `create_poll` y `vote_poll` no cambian. La interfaz lo convierte en un enlace a `/onboarding?next=…`.
- Lectura directa: `profiles.select('username, display_name, is_private, created_at')` para `anon` y `authenticated`. `user_id` y `updated_at` no se conceden.

### 3.6. Seguimiento (V2-004)

```sql
public.follow_user(p_username text) returns text                       -- 'accepted' | 'pending'
public.unfollow_user(p_username text) returns void
public.respond_follow_request(p_username text, p_accept boolean) returns void
public.remove_follower(p_username text) returns void
```

- Todas por `@usuario` (sin distinguir mayúsculas), nunca por `user_id`. Exigen sesión; `follow_user` además exige perfil propio (`PROFILE_REQUIRED`, S-1).
- `follow_user` es idempotente: cuenta pública → `accepted`; privada → `pending`. `unfollow_user` también cancela una solicitud pendiente. `respond_follow_request` lo ejecuta el **seguido** sobre la solicitud de `p_username`: aceptar la pasa a `accepted`, rechazar la borra. `remove_follower` borra la relación de un seguidor (o una solicitud) hacia la cuenta propia.
- Lectura directa: `follows` solo para `authenticated`, solo las filas donde la cuenta es `follower_id` o `followee_id`. Los contadores públicos y las listas se sirven por RPC en V2-006/V2-009.

### 3.7. `get_poll_authors` (V2-003)

```sql
public.get_poll_authors(p_poll_ids uuid[])
  returns table (poll_id uuid, username text, display_name text)
```

- Firma las encuestas con `@usuario` sin dar `polls.user_id` a los clientes. Se eligió una RPC definer en lugar de una vista `security_invoker`, porque ésta exigiría permiso de columna sobre los `user_id` de `polls` y `profiles`.
- Ejecutable por `anon` y `authenticated` (datos públicos). Devuelve sólo autores de encuestas **publicadas** con perfil; sin perfil, oculta o inexistente no produce fila (la interfaz muestra «Anónimo», S-5). Máximo 50 ids por llamada (los demás se ignoran); el feed usa lotes de 20.
- **V2-005 debe añadir `can_view_author`** a esta función para no delatar encuestas de cuentas privadas.
- El adaptador pide los autores de cada lote con una sola llamada (feed y detalle) y los guarda en `PublicPoll.author` (`null` = sin perfil).

### 3.8. Visibilidad de cuentas privadas (V2-005)

```sql
public.can_view_author(p_author uuid) returns boolean   -- stable, security definer
```

- Verdadera si el autor no tiene perfil o su perfil es público, si es la propia cuenta o si la cuenta tiene un seguimiento `accepted` hacia él. Una solicitud `pending` no basta. Ejecutable por `anon` y `authenticated` porque la evalúan las políticas de RLS con el rol del cliente; sólo devuelve un booleano.
- **Dónde se impone:** política `polls_select_published` (`status = 'published' AND can_view_author(user_id)`; `poll_options` la hereda por su subconsulta), `vote_poll`, `get_poll_results`, `report_poll` y `get_poll_authors` (todas con `POLL_UNAVAILABLE`, indistinguible de una encuesta inexistente incluso con una opción inválida) y el trigger `votes_require_visible_poll` como defensa en profundidad.
- Efectos: pasar a privada oculta de inmediato las encuestas a quien no sea seguidor aceptado (también para quien ya había votado, que pierde los resultados); volver a pública las devuelve. El feed (`getFeedPolls`) y el detalle no cambian: sólo ven lo que RLS permite.
- Rendimiento medido en local (5.000 encuestas, 2.000 perfiles con un 40 % privados y 50 seguimientos): el feed de 21 filas tarda 1,8 ms con sesión y 0,4 ms sin ella, usando `polls_feed_idx`; no hacen falta índices nuevos.

### 3.9. `get_profile_votes` (V2-007)

```sql
public.get_profile_votes(p_username text, p_cursor text default null)
  returns table (poll_id uuid, question text, poll_created_at timestamptz, closes_at timestamptz,
                 author_username text, author_display_name text, voted_at timestamptz,
                 option_id uuid, option_text text, choice_hidden boolean, cursor text)
```

- Ejecutable por `anon` y `authenticated`. Errores: `USER_NOT_FOUND`, `PROFILE_PRIVATE` (perfil privado y quien mira no es el dueño ni seguidor aceptado) y `VOTES_PRIVATE` (historial no compartido con quien consulta, PRIV-001). Se comprueban los permisos antes de procesar cursor o entregar filas.
- Orden `votes.created_at DESC, votes.id DESC`; hasta **21 filas** (20 + 1 para saber si hay más). `cursor` de cada fila es opaco (`<created_at UTC>|<id del voto>`); se pasa el de la última fila entregada para la página siguiente. Un cursor ilegible se ignora.
- Sólo encuestas publicadas que el visitante puede ver (`can_view_author` del autor): una encuesta de una cuenta privada no aparece aunque el votante sea público.
- **P-1:** `option_id` y `option_text` sólo vienen informados si el visitante es el propio usuario, si ya votó esa encuesta o si está cerrada; si no, `choice_hidden = true` y ambos `null`. Nunca recuentos ni porcentajes (esos se piden con `get_poll_results`, §3.3).
- Adaptador: `getProfileVotes(supabase, username, cursor)` → `{ votes: ProfileVote[], nextCursor }`.

#### Audiencia del historial (PRIV-001)

```sql
public.get_my_vote_visibility() returns text
public.set_vote_visibility(p_visibility text) returns void
```

- Sólo `authenticated`, con `auth.uid()` no nulo y perfil existente. Sin identidad objetivo en los parámetros. Errores: `AUTH_REQUIRED`, `PROFILE_REQUIRED`, `VOTE_VISIBILITY_INVALID`. `p_visibility` admite exactamente `private`, `followers` o `profile`; `null` y cualquier otro valor se rechazan.
- Columna privada `profiles.vote_visibility`: sin lectura directa ni escritura para clientes, pese a que otras columnas del perfil sean públicas. No se añade a `get_profile` ni `get_my_profile`; el titular la lee mediante la RPC específica.
- `private` («Solo yo»): únicamente el titular consulta el historial; `followers`: además seguidores aceptados; `profile`: reglas previas de la privacidad de cuenta. El permiso de cuenta y el de cada encuesta siguen siendo límites superiores. P-1 continúa ocultando la opción ajena de abiertas hasta que quien consulta haya votado.
- Valor inicial elegido: `private` para cuentas nuevas y existentes. La migración agrega un DEFAULT constante; no elimina votos ni cambia `is_private`, agregados o relaciones. El cambio sólo restringe la exposición anterior del historial. Ensayo de actualización sobre cuentas/votos existentes en `scripts/check-vote-history-upgrade.sh`.
- Adaptadores: `getMyVoteVisibility(supabase)` → `Result<VoteVisibility>` y `setVoteVisibility(supabase, visibility)` → `Result<void>`. No se crea una caché pública ni se consulta esta preferencia desde el feed.
- Un cambio o retirada de seguimiento se refleja en futuras consultas al servidor. No puede retirar copias de información que un visitante ya hubiera recibido lícitamente. La UI de ajustes y su invalidación tras guardar corresponden a PRIV-002; esta tarea no aplica SQL en proyectos compartidos.

#### Icono de perfil (AVATAR-001)

```sql
public.set_profile_avatar(p_icon text) returns void
public.get_my_profile() returns table (username text, display_name text, is_private boolean, avatar_icon text)
```

- `set_profile_avatar`: sólo `authenticated`, con perfil. `p_icon` es uno de `sol`, `luna`, `estrella`, `hoja`, `ola`, `montana`, `nube`, `llama`, o `null` para volver a las iniciales. Errores: `AUTH_REQUIRED`, `PROFILE_REQUIRED`, `AVATAR_INVALID` (cualquier otro valor, incluida otra capitalización o una URL). Actúa siempre sobre la cuenta de `auth.uid()`; no cambia nombre, @usuario ni privacidad. La restricción de catálogo también está como `check` en la tabla.
- `profiles.avatar_icon`: columna **pública** (`grant select` a `anon` y `authenticated`), como `username`; sin escritura directa.
- `get_my_profile` pasa a devolver también `avatar_icon`, para que la cabecera lo obtenga en la misma consulta. Se recrea con `drop function` + `create function` y mantiene los mismos permisos (sólo `authenticated`).
- El resto del contrato no cambia: `get_profile` y las listas de seguidores no devuelven el icono; los adaptadores `getProfileView`, `listFollowers`, `listFollowing` y `listFollowRequests` lo leen de la columna pública con una consulta aparte (cabecera en paralelo; una por página de lista). Un fallo de esa lectura sólo hace que se vean las iniciales.
- Adaptadores: `setProfileAvatar(supabase, icon | null)` → `Result<void>`; `Profile.avatarIcon`, `ProfileView.avatarIcon` y `FollowEntry.avatarIcon` son opcionales. Detalle de catálogo y procedencia: [avatares.md](avatares.md).

#### Bloqueo de personas (SOCIAL-001)

```sql
public.block_user(p_username text) returns void
public.unblock_user(p_username text) returns void
public.list_blocked_users(p_cursor text default null) returns table (username text, display_name text, cursor text)
```

- Tabla `user_blocks (blocker_id, blocked_id, created_at)`, con RLS y **sin ningún permiso para clientes**: sólo se gestiona con las tres RPC, todas `authenticated`. La lista es la propia (31 filas por página, cursor opaco `<created_at UTC>|<usuario en minúsculas>`); nunca devuelve `user_id` ni muestra quién ha bloqueado a quien llama.
- `block_user`: con sesión y perfil. `@usuario` propio → `CANNOT_BLOCK_SELF`; inexistente → `USER_NOT_FOUND`. Idempotente. **En la misma transacción** borra los seguimientos y solicitudes pendientes entre ambos, en los dos sentidos. Toma un cerrojo por pareja de cuentas.
- `unblock_user`: borra sólo el bloqueo propio (quien fue bloqueado no puede levantarlo); idempotente; **no restaura seguimientos**.
- **Efecto**: un bloqueo activo en cualquier sentido hace que `can_view_author` sea falso para el par, lo que oculta el contenido, el historial, los resultados y las denuncias del otro en polls, feed, listas y votos (todo el contrato de visibilidad ya pasa por esa función). `get_profile` responde `USER_NOT_FOUND`. Un trigger `BEFORE INSERT` en `follows` rechaza (`USER_NOT_FOUND`) cualquier seguimiento entre bloqueados, también por inserción directa, y comparte el cerrojo con `block_user` para que un seguimiento simultáneo no sobreviva al bloqueo.
- **No cambia** ningún voto ni agregado: no se borran ni se recalculan.
- **Límites**: sin sesión (anon) el contenido público sigue siendo visible; el bloqueo no es anonimato ni protege frente a otra cuenta. Las listas de seguidores y el historial de una cuenta bloqueada responden como "privada" (`PROFILE_PRIVATE`), no como inexistente.
- Adaptadores: `blockUser(supabase, username)` y `unblockUser(supabase, username)` → `Result<void>`; error nuevo `CANNOT_BLOCK_SELF`. La lista y la interfaz son SOCIAL-002.

#### Biografía de perfil (PROFILE-001)

```sql
public.set_profile_bio(p_bio text) returns void
public.get_my_profile() returns table (username text, display_name text, is_private boolean, avatar_icon text, bio text)
public.get_profile(p_username text) returns table (..., can_view_content boolean, bio text)
```

- `profiles.bio`: texto plano de 0 a 280 caracteres Unicode (no bytes), con `check` en la tabla. **No es una columna pública**: no hay `grant select` ni `update` sobre ella para ningún rol; no hay escritura directa.
- `set_profile_bio`: sólo `authenticated`, con perfil. Recorta espacios, tabulaciones y saltos de línea de los extremos; vacío o `null` la borra. Rechaza más de 280 caracteres y caracteres de control (salvo salto de línea y tabulación). El HTML se guarda como texto literal: la interfaz lo muestra siempre escapado. Errores: `AUTH_REQUIRED`, `PROFILE_REQUIRED`, `BIO_INVALID`. Actúa siempre sobre `auth.uid()`.
- `get_my_profile` devuelve la bio propia. `get_profile` la devuelve **sólo si `can_view_author`** (cuenta pública, titular o seguidor aceptado); a solicitantes pendientes, extraños y `anon` de una cuenta privada les llega `null`. La cabecera pública, los metadatos OG y el resto de RPC no la incluyen.
- Ambas funciones se recrean con `drop function` + `create function` conservando columnas anteriores (`avatar_icon`, contadores, relación, `can_view_content`) y permisos.
- Bloqueos (SOCIAL-001): entre cuentas bloqueadas `get_profile` responde `USER_NOT_FOUND`, así que tampoco se entrega la bio.
- Adaptadores: `setProfileBio(supabase, bio | null)` → `Result<void>`; `Profile.bio` y `ProfileView.bio` son opcionales (ausentes si no hay bio o no se puede ver).

### 3.10. `get_profile` y `get_profile_polls` (V2-006)

```sql
public.get_profile(p_username text)
  returns table (username text, display_name text, is_private boolean, followers_count integer,
                 following_count integer, polls_count integer, viewer_relation text, can_view_content boolean)
public.get_profile_polls(p_username text, p_cursor text default null)
  returns table (poll_id uuid, created_at timestamptz, cursor text)
```

- Ejecutables por `anon` y `authenticated`. Errores: `USER_NOT_FOUND` y, en `get_profile_polls`, `PROFILE_PRIVATE`.
- `get_profile` devuelve la cabecera y los contadores (seguidores y seguidos **aceptados**, encuestas publicadas), que son públicos también en cuentas privadas (S-4). `viewer_relation`: `self`, `following`, `pending` o `none` (sin sesión, `none`). `can_view_content` = `can_view_author` del perfil.
- `get_profile_polls` sólo devuelve ids y cursor (hasta 21 filas, mismo formato de cursor que `get_profile_votes`); el adaptador `getProfilePolls` pide después las encuestas por RLS (`polls ... in (ids)`) y les añade el estado de voto como el feed.
- Adaptadores: `getProfileView`, `getProfilePolls`, `followUser`, `unfollowUser`.

### 3.11. `get_feed_results` (V2-023)

```sql
public.get_feed_results(p_poll_ids uuid[])
  returns table (poll_id uuid, option_id uuid, "position" smallint, text text, votes integer,
                 percentage numeric(4,1), total_votes integer, my_option_id uuid)
```

- Máximo 20 ids por llamada (los demás se ignoran). Por **cada** encuesta aplica la misma autorización que `get_poll_results` (publicada, visible para quien llama, y cerrada o votada por quien llama) y devuelve sólo las autorizadas, **sin error** por las demás: una lista mezclada no filtra agregados de las no votadas. Las filas de una encuesta salen ordenadas por `position`.
- `EXECUTE` también para `anon` (las cerradas son públicas). Hay que mantenerla sincronizada con `get_poll_results` si cambia la autorización.
- Adaptador: `getFeedPage` hace, como máximo, una consulta de encuestas, una de votos propios y una de resultados por página (más la de autores).

### 3.12. Listas de seguidores y solicitudes (V2-009)

```sql
public.list_followers(p_username text, p_cursor text default null)  -- anon + authenticated
public.list_following(p_username text, p_cursor text default null)  -- anon + authenticated
public.list_follow_requests(p_cursor text default null)             -- sólo authenticated
public.count_follow_requests() returns integer                      -- sólo authenticated
  -- las tres primeras: returns table (username text, display_name text, cursor text)
```

- `list_followers` / `list_following` siguen las reglas del contenido del perfil (`can_view_author`): errores `USER_NOT_FOUND` y `PROFILE_PRIVATE` (cuenta privada y quien mira no es ella ni seguidor aceptado, ni siquiera con solicitud pendiente). Sólo aparecen relaciones **aceptadas**; las pendientes no cuentan como seguidor ni como seguido.
- Hasta **31 filas** (30 + 1 para saber si hay más), orden `follows.created_at DESC, lower(username) DESC`. `cursor` opaco (`<created_at UTC>|<usuario en minúsculas>`): lleva el `@usuario`, nunca `user_id`; un cursor ilegible se ignora.
- `list_follow_requests` y `count_follow_requests` devuelven las solicitudes pendientes **recibidas por quien llama**; sin sesión, `AUTH_REQUIRED` (y `anon` no tiene `EXECUTE`).
- Aceptar/rechazar usa `respond_follow_request` y eliminar a un seguidor `remove_follower` (§3.6). Rechazar o eliminar borra la fila; aceptar no cambia `created_at`.
- Adaptadores: `listFollowers`, `listFollowing`, `listFollowRequests` → `{ users: FollowEntry[], nextCursor }`; `countFollowRequests`; `respondFollowRequest`, `removeFollower`.
- Rutas: `/u/[username]/seguidores`, `/u/[username]/siguiendo` (aviso de cuenta privada sin pedir la lista; «Eliminar» sólo en los seguidores propios) y `/solicitudes` (sólo propio; sin sesión lleva al login). El indicador de pendientes está en la cabecera del perfil propio.

### 3.13. `saved_polls` (V2-022)

```sql
public.saved_polls (user_id uuid default auth.uid(), poll_id uuid, created_at timestamptz, PK (user_id, poll_id))
```

- Tabla con RLS y escritura directa **sólo** para `authenticated` (`select`, `insert`, `delete`; nunca `update`) y sin acceso para `anon`. Cada cuenta lee, inserta y borra únicamente sus filas (`user_id = auth.uid()`); `user_id` se rellena solo y no se envía.
- `insert` exige que la encuesta sea **visible para quien guarda**: la política consulta `polls` con la RLS del propio cliente, así que una encuesta privada sin acceso, oculta o inexistente se rechaza. Una guardada que deja de ser visible no se lee al unirla con `polls`, que es como se lista.
- Adaptadores: `savePoll` (idempotente, `upsert` con `ignoreDuplicates`; la violación de RLS se informa como `POLL_UNAVAILABLE`), `unsavePoll` (idempotente) y `getSavedPolls(cursor)` → `FeedPage` con `saved: true` y el estado de voto de cada encuesta; cursor por `(created_at de guardado, poll_id)`, 20 por página.
- `getFeedPage`, `getProfilePolls` y `getPollDetail` añaden `saved` (sólo con sesión) con **una** consulta por página; si esa consulta falla, la página se entrega sin el marcador.
- La lista no se ve desde fuera: la pestaña «Guardadas» sólo existe en el perfil propio.

### 3.14. `get_feed` (V2-031)

```sql
public.get_feed(p_mode text default 'recientes', p_category text default null, p_cursor text default null)
  returns table (poll_id uuid, created_at timestamptz, cursor text)
```

- Ejecutable por `anon` y `authenticated`. **Sólo ids, fecha y cursor**: ni `user_id`, ni autor, ni agregados. Los datos de cada encuesta salen por la RLS de `polls` y los resultados por `get_feed_results` / `get_poll_results` (§3.3, §3.11), con la autorización de siempre.
- `p_mode`: `recientes` (todo lo publicado que quien llama puede ver, `can_view_author`) o `siguiendo` (sólo autores con relación **aceptada** de `auth.uid()` hacia ellos; no hay parámetro de identidad; sin sesión, `AUTH_REQUIRED`). Otro valor o nulo: `INVALID_FEED_MODE`.
- `p_category`: nulo o vacío = Todas; si no, debe existir en `categories` (`INVALID_CATEGORY`).
- Retención (D-025): una encuesta cerrada sale del feed cuando `now() >= closes_at + 24 h` (límite exclusivo, hora del servidor). No se borra ni se oculta: detalle y perfil siguen funcionando. Sin `closes_at` no caduca.
- Orden `created_at DESC, id DESC`; hasta **21 filas** (20 + 1). `p_cursor` es el `cursor` de la última fila entregada (`<created_at UTC>|<id>`, opaco); uno ilegible es `INVALID_CURSOR` (a diferencia de las listas de perfil, que lo ignoran).
- Adaptador: `getFeed(supabase, { mode, category, cursor }, viewer)` → `FeedPage` con el mismo estado de voto, resultados y «guardada» que el resto de listas. `getFeedPage` (la lectura anterior, sin modos) sigue existiendo hasta que V2-032 integre la interfaz.

### 3.15. `search_polls` (SEARCH-001)

```sql
public.search_polls(p_query text, p_cursor text default null) returns table (poll_id uuid, created_at timestamptz, cursor text)
```

- Ejecutable por `anon` y `authenticated` (la búsqueda sobre contenido público no exige sesión). Como `get_feed`, devuelve **sólo ids, fecha y cursor**: los datos de cada encuesta salen por la RLS de `polls` y los resultados por la ruta autorizada del resto de listas. **Nunca** devuelve recuentos, porcentajes, totales ni `user_id`.
- Consulta: 2–100 caracteres tras recortar y colapsar espacios; si no, `INVALID_QUERY`. Coincidencia de subcadena sin distinguir mayúsculas (`ILIKE`), con `%`, `_` y `\` escapados (son texto, nunca comodines). No distingue acentos: «cafe» no encuentra «café». Sin servicio externo ni búsqueda semántica.
- Alcance: encuestas `published` que quien llama puede ver (`can_view_author`: cuentas privadas y bloqueos); las cerradas se encuentran aunque ya hayan salido del feed de 24 h. Las ocultas no aparecen.
- Orden `created_at DESC, id DESC`; 21 filas (20 + 1). Cursor `<created_at UTC>|<id>|<md5 de la consulta>`: el de otra búsqueda o uno ilegible es `INVALID_CURSOR`. No hay total de resultados.
- Índice: `polls_question_trgm_idx` (GIN `pg_trgm`, parcial `status = 'published'`), en el esquema `extensions`. A 5000 filas el planificador puede preferir recorrer `polls_feed_idx` con el `LIMIT`; el trigram gana al crecer la tabla o ser selectiva la coincidencia (comprobado en `030_search_polls`). Sin Redis.
- Adaptador: `searchPolls(supabase, query, cursor, viewer)` → `Result<FeedPage>`; error nuevo `INVALID_QUERY`.
- Interfaz (SEARCH-002): `/search?q=` (GET, la consulta vive en la URL; sin consulta o de menos de 2 caracteres no se busca nada), acción de servidor `loadMoreSearch(query, cursor)` para «Cargar más», tarjetas y voto del feed, pestaña «Buscar» (lupa) en la barra móvil y enlace «Buscar» en la cabecera de escritorio. Sin autocompletado ni analítica.

### 3.16. Comentarios (CMT-001)

```sql
public.set_poll_comments(p_poll_id uuid, p_enabled boolean) returns void
public.add_comment(p_poll_id uuid, p_body text) returns uuid
public.list_comments(p_poll_id uuid, p_cursor text default null)
  returns table (comment_id uuid, username text, display_name text, body text, created_at timestamptz, cursor text)
public.create_poll(p_question, p_options, p_closes_at default null, p_category default null, p_comments_enabled boolean default false) returns uuid
```

- `polls.comments_enabled` (false por defecto) es **público** como `closes_at` (`grant select`); sólo lo escribe quien crea la encuesta (`create_poll`) y después la autora con `set_poll_comments` (para otra cuenta, `POLL_UNAVAILABLE`; no hay `update` directo). Apagarlo **no borra** comentarios; reactivarlo los devuelve. `create_poll` se recrea con un parámetro final opcional; la firma anterior de cuatro argumentos desaparece.
- `comments` no es de ningún cliente (RLS sin permisos). Se escribe con `add_comment` y se lee con `list_comments`; nunca se devuelve `user_id`.
- **Acceso** (mismo orden de errores en lectura y escritura): encuesta oculta, inexistente o de una cuenta que quien llama no puede ver (privada o bloqueo) → `POLL_UNAVAILABLE`; debate apagado → `COMMENTS_DISABLED` (también para la autora); **abierta** sin voto de quien llama → `VOTE_REQUIRED` (también la autora y los visitantes); **cerrada** → rige la visibilidad de la encuesta y no hace falta voto. La comprobación vive en `private.comments_check_access` (esquema sin permisos para clientes).
- `add_comment`: sesión y perfil (`AUTH_REQUIRED`, `PROFILE_REQUIRED`). Texto plano de 1–1000 caracteres tras recortar; sin caracteres de control salvo salto de línea y tabulación (`COMMENT_INVALID`); el HTML se guarda como texto literal y la interfaz lo muestra escapado. **10 comentarios por minuto y cuenta** (`RATE_LIMITED`), con cerrojo por cuenta para que las peticiones simultáneas no lo superen. Un bloqueo con la autora devuelve `POLL_UNAVAILABLE`.
- `list_comments`: ejecutable por `anon` (cerradas públicas). Más recientes primero, cursor opaco `<created_at UTC>|<id>` (`INVALID_CURSOR`), 21 filas (20 + 1). **Se omiten** los comentarios de cuentas con bloqueo con quien lee o con la autora de la encuesta, en cualquier sentido.
- Fuera de alcance: hilos, respuestas, likes, edición y borrado; la interfaz es CMT-002. La denuncia y la moderación (`comments.status`) están en §3.18. `PublicPoll` aún no expone `comments_enabled` (CMT-002).
- Adaptadores: `listComments(supabase, pollId, cursor)` → `Result<CommentPage>`, `addComment(supabase, pollId, body)` → `Result<{ id }>`, `setPollComments(supabase, pollId, enabled)` y `createPoll(..., commentsEnabled?)`. Errores nuevos: `COMMENTS_DISABLED`, `VOTE_REQUIRED`, `COMMENT_INVALID`.

### 3.17. `report_user` (MOD-001)

```sql
public.report_user(p_username text, p_reason text, p_details text default null) returns void
```

- Sólo `authenticated` (sin perfil propio obligatorio). La cuenta se identifica por `@usuario` sin distinguir mayúsculas; entre cuentas bloqueadas o si no existe, `USER_NOT_FOUND`; a uno mismo, `CANNOT_REPORT_SELF`. Motivo `spam|odio|acoso|sexual|violencia|otro` y detalle de hasta 500 caracteres normalizados (`REPORT_INVALID`).
- Tabla `user_reports` propia (no se mezcla con `poll_reports`), sin permisos para clientes: no se lee, escribe ni deduce quién denunció. Una por pareja (`ALREADY_REPORTED`), 10 por hora y cuenta con cerrojo por cuenta (`REPORT_RATE_LIMITED`). Borrado en cascada con la cuenta denunciante o la denunciada.
- No oculta, bloquea ni cambia la cuenta. Procedimiento de revisión y retención en `docs/moderacion.md`.
- Adaptador: `reportUser(supabase, username, reason, details?)` → `Result<void>`; error nuevo `CANNOT_REPORT_SELF`. La acción en la interfaz es MOD-002.

### 3.18. `report_comment` y moderación de comentarios (CMT-003)

```sql
public.report_comment(p_comment_id uuid, p_reason text, p_details text default null) returns void
```

- Sólo `authenticated`. Sólo se denuncia un comentario que quien llama podría ver ahora (misma comprobación que `list_comments`, bloqueos incluidos); cualquier otro caso —inexistente, oculto, debate apagado, encuesta no visible, sin voto en una abierta, bloqueo— es `COMMENT_UNAVAILABLE`, sin pistas. Propio → `CANNOT_REPORT_SELF`. Motivo y detalle como en `report_poll` (`REPORT_INVALID`); una por comentario y cuenta (`ALREADY_REPORTED`); 20 por hora y cuenta (`REPORT_RATE_LIMITED`).
- `comment_reports` no tiene permisos para clientes. `comments.status` (`published` | `hidden`) lo cambia sólo un operador con la clave de servicio; `list_comments` omite los ocultos y un comentario oculto no reaparece al reactivar el debate.
- Adaptador: `reportComment(supabase, commentId, reason, details?)` → `Result<void>`; error nuevo `COMMENT_UNAVAILABLE`. Procedimiento de revisión en `docs/moderacion.md`. Los controles en la interfaz y el E2E son CMT-002.

## 4. Lecturas directas (RLS)

`categories` (V2-021) es de lectura pública (`slug, name, position`) y sin escrituras de clientes; el formulario de creación la lee con `getCategories`. Feed y detalle incluyen `category:categories(slug, name)`.

No son RPC: el adaptador consulta tablas con el SDK. RLS (MVP-011, MVP-012) limita lo visible a encuestas `published`, sus opciones y los votos propios. El adaptador selecciona columnas explícitas: nunca `*`, nunca `user_id` de `polls`.

### 4.1. Feed (MVP-018)

- Lote de 20 (`FEED_PAGE_SIZE`). Orden `created_at DESC, id DESC`. Se piden 21 filas para saber si hay más.
- Cursor opaco: base64url de `{"c": created_at, "i": id}` del último elemento entregado. Siguiente página: `created_at < c OR (created_at = c AND id < i)`.
- Cursor ilegible: se ignora y se sirve la primera página.

```ts
let q = supabase
  .from('polls')
  .select('id, question, created_at, closes_at, poll_options(id, text, position)')
  .order('created_at', { ascending: false })
  .order('id', { ascending: false })
  .order('position', { referencedTable: 'poll_options', ascending: true })
  .limit(FEED_PAGE_SIZE + 1)
if (cursor) q = q.or(`created_at.lt."${cursor.c}",and(created_at.eq."${cursor.c}",id.lt.${cursor.i})`)
```

La fecha va entre comillas dobles porque contiene `:` y `.`, caracteres reservados en los filtros `or()` de PostgREST. Antes de usarlo, el adaptador valida que `c` es una fecha ISO e `i` un UUID; si no, trata el cursor como ilegible.

- Con sesión, después de la página: `votes.select('poll_id, option_id').in('poll_id', ids)` (RLS devuelve sólo los propios). Los resultados de las votadas y de las cerradas llegan con **una sola** llamada por página a `get_feed_results` (§3.11; V2-023).
- Sin sesión no se consulta `votes` ni resultados.

### 4.2. Detalle (MVP-019)

1. Si `id` no es un UUID válido → `POLL_UNAVAILABLE` sin consultar (evita el error `22P02`).
2. `polls.select('id, question, created_at, closes_at, poll_options(id, text, position)').eq('id', id).maybeSingle()`; `null` → `POLL_UNAVAILABLE` (inexistente u oculta, indistinguibles). La ruta responde 404.
3. Con sesión: `votes.select('option_id').eq('poll_id', id).maybeSingle()` → opción propia o `null`.
4. Si hay voto propio: `get_poll_results`. Si no, no se llama.

### 4.3. Reconciliación tras respuesta perdida

Si `vote_poll` termina en `NETWORK_ERROR`, el cliente repite el paso 3 del detalle antes de reintentar. Si ya existe el voto, pasa al estado votado; si no, permite reintentar. `create_poll` no se reintenta automáticamente; si la publicación pudo llegar, se informa y el usuario lo comprueba en el feed.

## 5. Tipos TypeScript para la interfaz y los mocks

Tipos del dominio que consumen los componentes. Los tipos generados del esquema (MVP-022) quedan dentro del adaptador; este los transforma en estos.

```ts
export type AppErrorCode =
  | 'AUTH_REQUIRED'
  | 'VALIDATION_QUESTION_LENGTH'
  | 'VALIDATION_OPTION_COUNT'
  | 'VALIDATION_OPTION_LENGTH'
  | 'VALIDATION_OPTION_DUPLICATE'
  | 'RATE_LIMITED'
  | 'POLL_UNAVAILABLE'
  | 'OPTION_INVALID'
  | 'ALREADY_VOTED'
  | 'NOT_VOTED'
  | 'ALREADY_REPORTED'
  | 'REPORT_RATE_LIMITED'
  | 'REPORT_INVALID'
  | 'INVALID_CLOSES_AT'
  | 'POLL_CLOSED'
  | 'INVALID_CATEGORY'
  | 'USERNAME_INVALID'
  | 'USERNAME_TAKEN'
  | 'USERNAME_RESERVED'
  | 'DISPLAY_NAME_INVALID'
  | 'PROFILE_REQUIRED'
  | 'USER_NOT_FOUND'
  | 'PROFILE_PRIVATE'
  | 'VOTES_PRIVATE'
  | 'VOTE_VISIBILITY_INVALID'
  | 'CANNOT_FOLLOW_SELF'
  | 'FOLLOW_RATE_LIMITED'
  | 'NETWORK_ERROR'
  | 'UNKNOWN'

export type Result<T> = { ok: true; data: T } | { ok: false; error: AppErrorCode }

export interface PollOption {
  id: string        // uuid
  text: string
  position: number  // 1..6
}

export interface PublicPoll {
  id: string
  question: string
  createdAt: string // ISO 8601
  closesAt?: string | null // ISO 8601; V2-013, null/ausente = sin cierre
  author?: { username: string; displayName: string | null } | null // V2-003; null = Anónimo
  category?: { slug: string; name: string } | null // V2-021; null = sin categoría
  options: PollOption[] // ordenadas por position
}

export interface OptionResult extends PollOption {
  votes: number
  percentage: number // un decimal
}

export interface PollResults {
  pollId: string
  totalVotes: number // >= 1
  myOptionId: string | null // V2-014: nulo en una cerrada si no votó o no hay sesión
  options: OptionResult[] // todas, ordenadas por position
}

/** Estado de una encuesta para quien la mira. */
export type PollViewerState =
  | { kind: 'anonymous' }                         // sin sesión: puede seleccionar, no votar
  | { kind: 'not_voted' }                         // con sesión, sin voto: selector
  | { kind: 'voted'; results: PollResults }       // con sesión y voto: resultados
  | { kind: 'closed'; results: PollResults; signedIn: boolean } // V2-014: cerrada, resultados públicos (D-020)

export interface FeedItem {
  poll: PublicPoll
  viewer: PollViewerState
}

export interface FeedPage {
  items: FeedItem[]        // máximo 20
  nextCursor: string | null // null: no hay más
}

export interface PollDetail {
  poll: PublicPoll
  viewer: PollViewerState
}

// Firmas del adaptador (MVP-023)
export declare function getFeedPage(cursor?: string | null): Promise<Result<FeedPage>>
export declare function getPollDetail(id: string): Promise<Result<PollDetail>> // POLL_UNAVAILABLE → 404
export declare function createPoll(question: string, options: string[]): Promise<Result<{ id: string }>>
export declare function votePoll(pollId: string, optionId: string): Promise<Result<PollResults>> // ALREADY_VOTED: el adaptador pide resultados y devuelve ok
export declare function getPollResults(pollId: string): Promise<Result<PollResults>>
```

`votePoll` encadena `vote_poll` y `get_poll_results`. Ante `ALREADY_VOTED` pide igualmente los resultados y devuelve `ok: true`: para la interfaz, el estado final es «votado». `getPollDetail` y `getFeedPage` nunca incluyen resultados cuando `viewer.kind` no es `voted`.

## 6. Ejemplo de mocks

```json
{
  "poll": {
    "id": "8d0f6f5e-2b7a-4d8e-9a51-2f1f2f6b9c10",
    "question": "¿Cuál es tu bebida favorita para el desayuno?",
    "createdAt": "2026-10-26T22:33:31.123456+00:00",
    "options": [
      { "id": "0b6c1c3e-6a51-4c55-9b0e-1c1d7a1e2f01", "text": "Café", "position": 1 },
      { "id": "0b6c1c3e-6a51-4c55-9b0e-1c1d7a1e2f02", "text": "Té", "position": 2 },
      { "id": "0b6c1c3e-6a51-4c55-9b0e-1c1d7a1e2f03", "text": "Zumo", "position": 3 }
    ]
  },
  "viewer": {
    "kind": "voted",
    "results": {
      "pollId": "8d0f6f5e-2b7a-4d8e-9a51-2f1f2f6b9c10",
      "totalVotes": 3,
      "myOptionId": "0b6c1c3e-6a51-4c55-9b0e-1c1d7a1e2f02",
      "options": [
        { "id": "0b6c1c3e-6a51-4c55-9b0e-1c1d7a1e2f01", "text": "Café", "position": 1, "votes": 2, "percentage": 66.7 },
        { "id": "0b6c1c3e-6a51-4c55-9b0e-1c1d7a1e2f02", "text": "Té", "position": 2, "votes": 1, "percentage": 33.3 },
        { "id": "0b6c1c3e-6a51-4c55-9b0e-1c1d7a1e2f03", "text": "Zumo", "position": 3, "votes": 0, "percentage": 0.0 }
      ]
    }
  }
}
```

Para los estados `anonymous` y `not_voted` el mismo objeto sin `results`: `"viewer": { "kind": "not_voted" }`.

## 7. Puntos abiertos para las tareas de implementación

- ~~Columna `polls.user_id` legible por API directa.~~ Resuelto en MVP-011: `anon` y `authenticated` sólo tienen `SELECT (id, question, created_at)` en `polls`; pedir `user_id`, `status` o `*` devuelve `42501`. Por eso el adaptador debe seleccionar columnas explícitas.
- **Recuento de llamadas en el feed.** Si las hasta 20 llamadas a `get_poll_results` resultan lentas, se valorará una variante por lotes con las mismas comprobaciones; no se añade ahora.
