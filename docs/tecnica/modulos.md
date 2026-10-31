# Módulos y clases clave

No hay clases: el código es funcional. Estos son los módulos donde está la lógica y los puntos de extensión.

## Capa de datos (`src/lib/data/`)

### `operations.ts` — adaptadores de dominio
Única puerta entre la UI y Supabase. Cada función recibe un `SupabaseClient` y devuelve `Promise<Result<T>>` (`{ ok: true, data } | { ok: false, error: AppErrorCode }`), envuelta en `guard()` para que ninguna excepción (red caída) llegue a la interfaz.
- **Depende de:** `polls.ts`, `errors.ts`, `types.ts`.
- **Funciones clave:**
  - `getFeed(supabase, { mode, category, cursor }, viewer)` — `get_feed` + datos por RLS + votos propios + `get_feed_results` + guardados, en pocas consultas.
  - `getPollDetail(supabase, id, viewer)` — calcula el `PollViewerState` (`anonymous`, `not_voted`, `voted`, `closed`) que decide qué ve cada usuario.
  - `votePoll` — llama a `vote_poll` y, si va bien **o** es `ALREADY_VOTED`, pide `get_poll_results`.
  - `createPoll`, `followUser`/`unfollowUser`, `respondFollowRequest`, `blockUser`, `listComments`/`addComment`, `searchPolls`, `setVoteVisibility`, `getProfileView`, `getProfileVotes`…
- **Notas:** `Viewer.signedIn` lo decide quien llama; la RLS sigue siendo la barrera. Los marcadores secundarios (guardado) degradan sin fallar la página.

### `polls.ts` — lecturas públicas de encuestas
Columnas fijas (`PUBLIC_POLL_COLUMNS`, nunca `user_id`), orden, cursor `(created_at,id)` codificado (`encodeFeedCursor`/`decodeFeedCursor`) y autores vía `get_poll_authors`.

### `types.ts` / `errors.ts`
`AppErrorCode` es la lista cerrada de errores que conoce la UI. `toAppError(error)` traduce errores de supabase-js (`P0001` + código, `42501` → `AUTH_REQUIRED`, fallo de fetch → `NETWORK_ERROR`, resto → `UNKNOWN`). `ERROR_MESSAGES` da el texto en español. **Añadir un error = tocar los dos archivos y la RPC.**

### `testing/fake-supabase.ts`
Doble del cliente para tests de adaptadores y acciones sin red.

## Supabase y entorno (`src/lib/supabase/`)

| Módulo | Para qué |
|---|---|
| `server.ts` → `createClient()` | Server Components, Server Actions y Route Handlers; lee cookies (ruta dinámica) |
| `client.ts` → `createClient()` | Client Components (p. ej. botón de Google) |
| `anonymous.ts` → `createAnonymousClient()` | Lecturas sin sesión y sin caché (imagen Open Graph, metadatos) |
| `env.ts` → `getSupabaseEnv()` | Valida URL + clave `sb_publishable_…` y **bloquea producción fuera de producción** |
| `database.types.ts` | Tipos generados del esquema; `database.typecheck.ts` comprueba el encaje |

## Server Actions (`src/app/`)

| Archivo | Acciones |
|---|---|
| `vote-actions.ts` | `castVote`, `loadOwnVote` (recuperación tras caída de red) |
| `create-actions.ts` | Crear encuesta con `create_poll` (el formulario valida antes con `lib/validation/poll.ts`) |
| `feed-actions.ts` | `loadMoreFeed` (paginación) |
| `follow-actions.ts` | Seguir, dejar de seguir, aceptar/rechazar solicitudes, quitar seguidor |
| `profile-actions.ts` | Onboarding/edición de perfil, privacidad, avatar, bio, audiencia del historial |
| `block-actions.ts`, `report-actions.ts`, `save-actions.ts` | Bloqueo, denuncias, guardados |
| `polls/[id]/comment-actions.ts` | Listar/añadir comentarios y activar/desactivar debate |
| `auth/actions.ts`, `auth/callback/route.ts` | Cerrar sesión; canje del código OAuth y envío a onboarding |

Patrón común: `createClient()` → `auth.getUser()` si hace falta sesión → adaptador → `Result`.

## Componentes clave (`src/components/`)

- **`poll-voting.tsx`** — máquina de estados del voto (elegir → confirmar → resultados), login/onboarding cuando falta sesión o perfil, reintento seguro. Emite el evento `opinion:voted` para refrescar el debate.
- **`poll-card.tsx` / `poll-detail-view.tsx` / `poll-results.tsx`** — tarjeta de feed, vista de detalle y barras de resultados.
- **`feed-list.tsx` + `feed-more.tsx` + `feed-controls.tsx`** — lista, «Cargar más» y pestañas/categorías (`category-rail.tsx`).
- **`poll-creation-form.tsx`** — formulario de 2–6 opciones, cierre y categoría.
- **`profile-header.tsx`, `follow-button.tsx`, `profile-votes.tsx`** — perfil y relación con quien mira.
- **`header.tsx`, `mobile-navigation.tsx`, `account-menu.tsx`, `theme-selector.tsx`** — navegación y tema (claro por defecto; `src/lib/theme.ts` aplica el tema guardado antes de pintar).

## SQL clave (`supabase/migrations/`)

| Función | Papel |
|---|---|
| `can_view_author` | Regla central de visibilidad (privacidad + bloqueos) |
| `create_poll` | Normaliza, valida, cuota 5/hora con cerrojo por cuenta, inserta atómicamente |
| `vote_poll` + triggers de `votes` | Voto único, opción válida, encuesta visible, abierta y con perfil |
| `get_poll_results` / `get_feed_results` | Agregados sólo tras votar (o si está cerrada); sincronizadas entre sí |
| `get_feed` / `search_polls` | Devuelven ids + cursor; los datos salen por RLS |
| `private.comments_check_access` | Acceso a comentarios según voto y visibilidad |

Para encontrar el cuerpo vigente de una función: la **última** migración que la define.
