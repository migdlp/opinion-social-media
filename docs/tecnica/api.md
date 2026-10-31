# API

No hay API REST propia. La «API» del sistema es **Supabase (PostgREST + RPC)**, llamada desde el servidor de Next.js con la sesión del usuario. Contrato exacto (argumentos, columnas, orden de errores) en [`docs/contratos-api.md`](../contratos-api.md); aquí está el mapa.

**Base URL:** `NEXT_PUBLIC_SUPABASE_URL` · **Auth:** JWT de Supabase en cookies (`@supabase/ssr`), rol `anon` sin sesión y `authenticated` con ella; la identidad sale siempre de `auth.uid()`, nunca de argumentos · **Errores:** `RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='<CÓDIGO>'` → `AppErrorCode` (`src/lib/data/errors.ts`).

## RPC (`supabase.rpc(...)`)

`anon` = también sin sesión. Las demás exigen `authenticated`.

### Encuestas y votos
| RPC | Descripción | anon |
|---|---|---|
| `create_poll(p_question, p_options, p_closes_at?, p_category?, p_comments_enabled?)` | Crea encuesta con opciones; cuota 5/hora; devuelve uuid | No |
| `vote_poll(p_poll_id, p_option_id)` | Voto único e inmutable | No |
| `get_poll_results(p_poll_id)` | Agregados por opción; abiertas sólo tras votar | Sólo cerradas |
| `get_feed_results(p_poll_ids[])` | Igual que la anterior para ≤ 20 encuestas, omite las no autorizadas | Sólo cerradas |
| `get_poll_authors(...)` | Autor público (@usuario, nombre, avatar) de encuestas visibles | Sí |
| `get_feed(p_mode, p_category, p_cursor)` | ids + cursor; `recientes` o `siguiendo` (este exige sesión) | Recientes |
| `search_polls(p_query, p_cursor?)` | Búsqueda ILIKE + trigram por pregunta, 2–100 caracteres | Sí |
| `report_poll(p_poll_id, p_reason, p_details?)` | Denuncia; 20/hora | No |

### Perfil y privacidad
`get_my_profile`, `upsert_my_profile(p_username, p_display_name)`, `set_profile_privacy(p_private)`, `set_profile_avatar(p_icon)`, `set_profile_bio`, `get_my_vote_visibility`, `set_vote_visibility`, `get_profile` (cabecera pública + relación con quien mira), `get_profile_polls`, `get_profile_votes`.

### Seguimiento y bloqueo
`follow_user(p_username)` → `'accepted' | 'pending'`, `unfollow_user`, `respond_follow_request(p_username, p_accept)`, `remove_follower`, `list_followers`, `list_following`, `list_follow_requests`, `count_follow_requests`, `block_user`, `unblock_user`, `list_blocked_users`, `report_user`.

### Comentarios
`list_comments`, `add_comment` (10/min), `set_poll_comments` (sólo autora), `report_comment`.

## Lecturas directas por tabla (RLS)

| Tabla | Quién | Qué |
|---|---|---|
| `polls`, `poll_options`, `categories` | anon, authenticated | Sólo publicadas y visibles (`can_view_author`); columnas por GRANT, sin `user_id` |
| `profiles` | anon, authenticated | `username`, `display_name`, `is_private`, `avatar_icon`, `created_at` (la `bio` sólo por `get_profile` / `get_my_profile`) |
| `votes` | authenticated | Sólo los votos propios |
| `saved_polls` | authenticated | Sólo los propios (leer, insertar, borrar) |

Ninguna tabla admite escrituras directas salvo `saved_polls`; el resto se modifica por RPC.

## Rutas HTTP de Next.js

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/auth/callback?code&next` | Canje OAuth → `next` seguro o `/onboarding` | — |
| GET | `/me` | Redirige a `/u/<usuario>`, `/login` u `/onboarding` | — |
| GET | `/polls/[id]/opengraph-image` | Imagen social generada con cliente anónimo, sin resultados de abiertas | No |

Páginas: `/`, `/login`, `/onboarding`, `/create`, `/polls/[id]`, `/u/[username]` (+ `/seguidores`, `/siguiendo`), `/search`, `/settings`, `/solicitudes`. Las mutaciones desde la UI son **Server Actions**, no endpoints públicos (ver [módulos](./modulos.md)).

## Ejemplo

```ts
const { data, error } = await supabase.rpc("vote_poll", { p_poll_id, p_option_id }).single();
// error.code === "P0001" && error.message === "ALREADY_VOTED" → toAppError → "ALREADY_VOTED"
```
