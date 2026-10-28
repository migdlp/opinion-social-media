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
| `POLL_CLOSED` | `vote_poll` (trigger en `votes`) | `now() >= closes_at`; gana también sobre `ALREADY_VOTED` | «Esta encuesta ya está cerrada y no admite votos.» |
| `RATE_LIMITED` | `create_poll` | Ya hay 5 encuestas de la cuenta en los últimos 60 minutos | «Has alcanzado el límite de 5 encuestas por hora. Inténtalo más tarde.» |
| `POLL_UNAVAILABLE` | `vote_poll`, `get_poll_results`, detalle | UUID mal formado, inexistente u oculto; no se distingue entre ellos | «Esta encuesta no está disponible.» |
| `OPTION_INVALID` | `vote_poll` | La opción no existe o pertenece a otra encuesta | «Esa opción no es válida para esta encuesta.» |
| `ALREADY_VOTED` | `vote_poll` | La cuenta ya tenía voto en la encuesta (incluida una carrera perdida) | No es un fallo: la interfaz pasa a «Ya has votado» y pide resultados |
| `NOT_VOTED` | `get_poll_results` | La cuenta (incluido el autor) aún no ha votado | No se muestra: la interfaz enseña el selector de voto |
| `USERNAME_INVALID` | `upsert_my_profile` | `p_username` nulo o fuera de `^[a-z][a-z0-9_]{2,19}$` tras pasar a minúsculas (sin recortar espacios) | «El usuario debe tener de 3 a 20 caracteres (letras minúsculas, números o _) y empezar por una letra.» |
| `USERNAME_TAKEN` | `upsert_my_profile` | Otro perfil ya usa ese `@usuario` (sin distinguir mayúsculas) | «Ese usuario ya está en uso. Prueba con otro.» |
| `USERNAME_RESERVED` | `upsert_my_profile` | Nombre de la lista reservada (`admin`, `settings`, `u`, `api`…) | «Ese usuario está reservado. Prueba con otro.» |
| `DISPLAY_NAME_INVALID` | `upsert_my_profile` | Nombre visible normalizado fuera de 1–50 (vacío incluido; `null` es válido) | «El nombre debe tener entre 1 y 50 caracteres.» |
| `PROFILE_REQUIRED` | `set_profile_privacy` | La cuenta aún no tiene perfil | «Elige primero tu usuario.» |
| `NETWORK_ERROR` | Adaptador (cliente) | `fetch` falla o no llega respuesta | «No hay conexión. Comprueba tu red y vuelve a intentarlo.» |
| `UNKNOWN` | Adaptador (cliente) | Cualquier otro error | «Algo ha fallado. Vuelve a intentarlo.» |

Orden de comprobación dentro de cada RPC (determina qué código gana si hay varios fallos):

- `create_poll`: `AUTH_REQUIRED` → `VALIDATION_OPTION_COUNT` → `VALIDATION_QUESTION_LENGTH` → `VALIDATION_OPTION_LENGTH` → `VALIDATION_OPTION_DUPLICATE` → `INVALID_CLOSES_AT` → `RATE_LIMITED`.
- `vote_poll`: `AUTH_REQUIRED` → `POLL_UNAVAILABLE` → `OPTION_INVALID` → `POLL_CLOSED` → `ALREADY_VOTED`.
- `get_poll_results`: `AUTH_REQUIRED` → `POLL_UNAVAILABLE` → `NOT_VOTED`. Ningún agregado se calcula antes de superar las tres.
- `upsert_my_profile`: `AUTH_REQUIRED` → `USERNAME_INVALID` → `USERNAME_RESERVED` → `DISPLAY_NAME_INVALID` → `USERNAME_TAKEN`.
- `set_profile_privacy`: `AUTH_REQUIRED` → `PROFILE_REQUIRED`.

## 3. RPC

Las funciones: `EXECUTE` sólo para `authenticated`, revocado a `PUBLIC` y `anon`. Si son `SECURITY DEFINER`, llevan `SET search_path = ''` y referencias cualificadas (`public.polls`). Detalle de endurecimiento en MVP-020.

### 3.1. `create_poll`

```sql
public.create_poll(p_question text, p_options text[], p_closes_at timestamptz default null) returns uuid
```

- Normaliza y valida según §1 y §2; el orden del array define `position` 1..n.
- Inserta `polls` (`status = 'published'`, `user_id = auth.uid()`, `created_at = now()`) y sus opciones en la misma transacción. Cualquier error revierte todo.
- Cuota: cuenta las encuestas de `auth.uid()` con `created_at > now() - interval '60 minutes'` tras serializar por cuenta (p. ej. `pg_advisory_xact_lock` sobre el usuario). La técnica concreta se decide en MVP-015; el contrato sólo fija `RATE_LIMITED`.
- `p_closes_at` (V2-013, opcional): si se indica debe estar entre 1 hora y 30 días desde ahora (`INVALID_CLOSES_AT`). Se guarda en `polls.closes_at` y no se puede editar. La firma de dos argumentos sigue valiendo.
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
    total_votes  integer,       -- igual en todas las filas; >= 1
    my_option_id uuid           -- igual en todas las filas
  )
```

- Una fila por opción, ordenadas por `position`. Las opciones con 0 votos aparecen con `votes = 0` y `percentage = 0.0`.
- La suma de porcentajes puede no ser exactamente 100,0 por el redondeo; se acepta.
- **No contiene** `user_id`, identidades de votantes, fechas de voto ni otro dato por votante. Sólo agregados por opción, el total y la opción propia.
- Sin caché compartida: se llama con la sesión del usuario y la página que la usa es dinámica (`no-store`).

### 3.4. `upsert_my_profile` y `set_profile_privacy` (V2-001)

```sql
public.upsert_my_profile(p_username text, p_display_name text)
  returns table (username text, display_name text, is_private boolean, created_at timestamptz)
public.set_profile_privacy(p_private boolean) returns void
```

- `upsert_my_profile` crea o edita el perfil de `auth.uid()`; `username` se guarda en minúsculas y `display_name` se normaliza como en §1. No cambia `is_private`. Nunca devuelve `user_id`.
- `set_profile_privacy` cambia `is_private`. Al pasar a pública deberá aceptar las solicitudes pendientes (hueco para V2-004).
- Lectura directa: `profiles.select('username, display_name, is_private, created_at')` para `anon` y `authenticated`. `user_id` y `updated_at` no se conceden.

## 4. Lecturas directas (RLS)

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

- Con sesión, después de la página: `votes.select('poll_id, option_id').in('poll_id', ids)` (RLS devuelve sólo los propios). Para cada encuesta votada se llama a `get_poll_results` (hasta 20 llamadas en paralelo; aceptable para el MVP sin RPC adicional).
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
  | 'INVALID_CLOSES_AT'
  | 'POLL_CLOSED'
  | 'USERNAME_INVALID'
  | 'USERNAME_TAKEN'
  | 'USERNAME_RESERVED'
  | 'DISPLAY_NAME_INVALID'
  | 'PROFILE_REQUIRED'
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
  options: PollOption[] // ordenadas por position
}

export interface OptionResult extends PollOption {
  votes: number
  percentage: number // un decimal
}

export interface PollResults {
  pollId: string
  totalVotes: number // >= 1
  myOptionId: string
  options: OptionResult[] // todas, ordenadas por position
}

/** Estado de una encuesta para quien la mira. */
export type PollViewerState =
  | { kind: 'anonymous' }                         // sin sesión: puede seleccionar, no votar
  | { kind: 'not_voted' }                         // con sesión, sin voto: selector
  | { kind: 'voted'; results: PollResults }       // con sesión y voto: resultados

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
