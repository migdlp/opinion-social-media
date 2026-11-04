# E13 · Explorar mejor el feed

**Issue de la épica:** [#342](https://github.com/migdlp/opinion-social-media/issues/342) · **Objetivo de la épica:** que cada persona encuentre rápido algo nuevo que votar y no pierda su sitio. Incluye el filtro «Sin votar», el descarte con «No me interesa», la restauración de la posición y el seguimiento de categorías. Decisión aplicable: D-054. Reglas comunes en el [README](README.md).

| Tarea | Historia | Prioridad | Tamaño | Dependencias |
|---|---|---|---|---|
| [FEED-002](https://github.com/migdlp/opinion-social-media/issues/351) | HU-57 Filtrar por «Sin votar» | P1 | M | PERF-005 #330 |
| [FEED-003](https://github.com/migdlp/opinion-social-media/issues/352) | HU-58 Descartar encuestas (backend) | P1 | M | — |
| [FEED-004](https://github.com/migdlp/opinion-social-media/issues/353) | HU-58 Descartar encuestas (interfaz) | P1 | M | FEED-003, PERF-005 #330 |
| [FEED-005](https://github.com/migdlp/opinion-social-media/issues/354) | HU-61 Volver al mismo punto del feed | P1 | M | PERF-005 #330 |
| [FEED-006](https://github.com/migdlp/opinion-social-media/issues/355) | HU-72 Seguir categorías (backend) | P1 | M | — |
| [FEED-007](https://github.com/migdlp/opinion-social-media/issues/356) | HU-72 Seguir categorías (interfaz) | P1 | M | FEED-006, PERF-005 #330 |

---

### FEED-002 — Filtro «Sin votar» en el feed

**Historia (HU-57):** como persona con sesión, quiero ver sólo las encuestas que aún no he votado para encontrar enseguida algo nuevo que votar.

- **Épica:** E13 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `backend`, `database`, `frontend`, `testing`, `area:feed`
- **Dependencias:** PERF-005 [#330](https://github.com/migdlp/opinion-social-media/issues/330), que reescribe el feed con `get_poll_cards`. Empezar tras su merge.

**Decisiones fijadas**
- El filtro es un interruptor independiente de la pestaña y de la categoría. Se combina con Recientes, Siguiendo y las secciones de E14 cuando existan.
- «Sin votar» significa que la cuenta no tiene voto en la encuesta **y** que la encuesta sigue abierta (`closes_at` nulo o futuro). Las cerradas se excluyen porque ya no se pueden votar.
- Las encuestas propias no votadas sí aparecen.
- Sólo existe con sesión. Los visitantes no ven el control.
- Vive en la URL como `?sinvotar=1`, junto a `tab` y `categoria`.

**Backend**
- Migración `<ts>_feed_unvoted.sql`: recrear `public.get_feed` con un **cuarto parámetro** `p_unvoted boolean default false`. Firma final: `get_feed(p_mode text default 'recientes', p_category text default null, p_cursor text default null, p_unvoted boolean default false)`. Hay que borrar la firma anterior (`drop function` de la versión de 3 argumentos) para que PostgREST no tenga dos sobrecargas.
- Con `p_unvoted = true` y sin sesión: `AUTH_REQUIRED`.
- Con `p_unvoted = true`: añadir `and not exists (select 1 from public.votes v where v.poll_id = p.id and v.user_id = auth.uid()) and (p.closes_at is null or p.closes_at > now())`.
- El cursor, el orden, el límite de 21 filas, la retención de 24 h y los permisos no cambian. Con `p_unvoted = false` el resultado es idéntico al actual.
- Adaptador: `getFeed(supabase, { mode, category, cursor, unvoted }, viewer)`, con `unvoted` opcional y `false` por defecto.

**Interfaz**
- En `FeedControls`, a la derecha de las pestañas en escritorio o en la fila de categorías en móvil, un botón conmutador con `aria-pressed`, texto **«Sin votar»** e icono de check vacío.
  - Activo: estilo de chip seleccionado de la fila de categorías y URL con `sinvotar=1`.
  - Inactivo: se quita el parámetro.
  - Cambiar el filtro reinicia la paginación, igual que cambiar de categoría.
- Si se vota una tarjeta con el filtro activo, la tarjeta **no desaparece**: muestra sus resultados como siempre. Las páginas siguientes ya la excluyen.
- `loadMoreFeed` recibe y propaga `unvoted`.
- Estado vacío con filtro activo:
  - Título: **«No te queda nada por votar aquí»**.
  - Descripción: **«Quita el filtro Sin votar o prueba otra categoría.»**
  - Acción: **«Quitar filtro»**, que lleva a la misma URL sin `sinvotar`.
- Un visitante que abre `/?sinvotar=1` ve el feed sin filtro, sin error y sin el control.

**Casos límite**
- Una encuesta que se vota en otra pestaña puede aparecer hasta recargar. Se acepta.
- Si una encuesta cierra mientras se pagina, la página siguiente ya no la trae.
- Un cursor obtenido con filtro y usado sin él (o al revés) es válido: el cursor sólo codifica fecha e id.

**Criterios de aceptación**
- [ ] Dada una cuenta con votos en A y B, sin voto en C y con D cerrada sin votar, cuando pide `p_unvoted = true`, entonces sólo recibe C.
- [ ] Dado un visitante con `p_unvoted = true`, entonces la RPC responde `AUTH_REQUIRED` y la página muestra el feed normal sin el control.
- [ ] Dado `p_unvoted = false`, entonces el resultado es idéntico al de antes de la migración (test de regresión con el mismo dataset).
- [ ] El filtro se combina con Siguiendo y con una categoría, y la URL lo conserva al recargar y al ir atrás o adelante.
- [ ] Votar con el filtro activo no hace saltar la lista; el estado vacío y su acción funcionan.
- [ ] Ninguna respuesta nueva incluye reparto de encuestas no votadas.

**Pruebas (TDD)**
- SQL `<NNN>_feed_unvoted.test.sql`: los cuatro casos anteriores, la combinación con categoría y con `siguiendo`, y que el visitante recibe `AUTH_REQUIRED`.
- Vitest para `FeedControls` (`aria-pressed` y construcción de la URL) y para el adaptador.
- E2E `e2e/feed-sin-votar.spec.ts`: activar, votar, cargar más, estado vacío y visitante. A 320/390/1280 y en ambos temas.

**Fuera de alcance:** recordar el filtro entre sesiones, contadores de pendientes y filtros por cerradas o votadas.

---

### FEED-003 — Descartar encuestas: backend

**Historia (HU-58):** como persona con sesión, quiero marcar una encuesta como «No me interesa» para que no vuelva a aparecer en mi feed.

- **Épica:** E13 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `backend`, `database`, `security`, `testing`, `area:feed`
- **Dependencias:** ninguna.

**Decisiones fijadas**
- El descarte es privado: sólo lo conoce quien descarta y no altera votos ni agregados.
- Afecta a Recientes, Siguiendo y a las secciones de E14. **No** afecta a la búsqueda, al perfil, a Guardadas ni al enlace directo.
- No se pueden descartar encuestas propias.
- Descartar y recuperar son operaciones idempotentes.

**Backend**
- Migración `<ts>_dismissed_polls.sql`:
  - Tabla `public.dismissed_polls (user_id uuid not null references auth.users(id) on delete cascade, poll_id uuid not null references public.polls(id) on delete cascade, created_at timestamptz not null default now(), primary key (user_id, poll_id))`.
  - Índice `(user_id, created_at desc, poll_id desc)`.
  - RLS activada y `revoke all` a `anon` y `authenticated`: sólo se accede mediante las RPC.
- `public.dismiss_poll(p_poll_id uuid) returns void`: sólo `authenticated`.
  - Orden de errores: `AUTH_REQUIRED` → `POLL_UNAVAILABLE` (no publicada, inexistente o `can_view_author` falso) → `CANNOT_DISMISS_OWN` (código nuevo).
  - Inserta con `on conflict do nothing`.
- `public.undismiss_poll(p_poll_id uuid) returns void`: sólo `authenticated` y `AUTH_REQUIRED`. Borra la fila si existe y no da error si no existe.
- `public.list_dismissed_polls(p_cursor text default null) returns table (poll_id uuid, dismissed_at timestamptz, cursor text)`: sólo `authenticated`.
  - Orden `created_at desc, poll_id desc`, 21 filas (20 + 1).
  - Cursor `<created_at UTC>|<poll_id>`. Uno ilegible es `INVALID_CURSOR`.
  - Sólo devuelve encuestas aún visibles para quien llama.
- Recrear `get_feed` (ambos modos y con el parámetro de FEED-002 si ya está en main) añadiendo `and not exists (select 1 from public.dismissed_polls d where d.poll_id = p.id and d.user_id = auth.uid())`. Sin sesión no hay filtro.
- Si TREND-001 ya está en main, aplicar el mismo filtro a `get_ranked_feed`. Si no, lo hará TREND-001, que lo tiene en sus criterios.
- Adaptadores: `dismissPoll`, `undismissPoll` → `Result<void>`; `listDismissedPolls(cursor)` → `Result<{ pollIds: string[], nextCursor }>`. Texto de `CANNOT_DISMISS_OWN`: «No puedes descartar tus propias encuestas.»

**Casos límite**
- Descartar una encuesta y que después se vuelva privada sin permiso: deja de listarse en «descartadas» y no da error.
- Hay que tomar un cerrojo por cuenta (`pg_advisory_xact_lock`) si se añade límite. **No hay límite de cantidad** en esta tarea.

**Criterios de aceptación**
- [ ] Dada una encuesta ajena visible, cuando la descarto, entonces desaparece de mis páginas de `get_feed` (Recientes y Siguiendo) pero no de las de otra cuenta.
- [ ] Dada una encuesta descartada, sigue apareciendo en `search_polls`, en el perfil de su autora, en mis guardadas y en `/polls/[id]`.
- [ ] Descartar la propia da `CANNOT_DISMISS_OWN`. Una oculta, inexistente o privada sin permiso da `POLL_UNAVAILABLE`, sin diferencias entre ellas.
- [ ] `undismiss_poll` la devuelve al feed. Repetir cualquiera de las dos operaciones no da error.
- [ ] `anon` no puede ejecutar ninguna de las tres RPC. Ninguna cuenta lee los descartes de otra, ni por la API REST ni por las RPC.

**Pruebas (TDD)**
- SQL `<NNN>_dismissed_polls.test.sql`, con todos los criterios y la paginación de la lista.
- Ataque HTTP en `tests/security/dismiss-attacks.test.ts`: lectura directa de la tabla, RPC con `anon` y descarte de una privada sin permiso.

**Fuera de alcance:** la interfaz (FEED-004), descartar desde la búsqueda y usar los descartes para recomendaciones.

---

### FEED-004 — Descartar encuestas: interfaz

**Historia (HU-58).**

- **Épica:** E13 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `frontend`, `design`, `testing`, `area:feed`
- **Dependencias:** FEED-003 y PERF-005 [#330](https://github.com/migdlp/opinion-social-media/issues/330).

**Interfaz**
- **Dónde:** en el menú «Más opciones» de la tarjeta, el mismo que hoy contiene «Denunciar», añadir arriba **«No me interesa»**.
  - Sólo en las tarjetas renderizadas en `/` (cualquier pestaña o sección).
  - Sólo con sesión y sólo si la encuesta no es propia.
  - No aparece en búsqueda, perfil, Guardadas ni detalle.
- **Al pulsar:**
  - Llamar a `dismissPoll` y sustituir la tarjeta, en el mismo hueco de la cuadrícula y sin mover el resto, por un bloque compacto con el texto **«Encuesta descartada. No volverá a aparecer en tu feed.»** y el botón **«Deshacer»**.
  - El bloque se anuncia por `aria-live="polite"` y el foco pasa a «Deshacer».
  - «Deshacer» llama a `undismissPoll` y restaura la tarjeta tal como estaba, sin recargar.
  - El bloque permanece hasta salir de la página. No hay temporizador.
- **Error:** la tarjeta se queda como estaba y se muestra junto al menú el mensaje estándar del código. `NETWORK_ERROR` sigue la regla de reconciliación: se consulta `listDismissedPolls` antes de reintentar.
- **Ajustes:** nuevo apartado **«Encuestas descartadas»** en la sección **Privacidad** de `/settings`, con ancla `#descartadas`.
  - Lista paginada de 20 en 20 con «Cargar más». Cada fila muestra la pregunta enlazada a `/polls/[id]` y el botón **«Recuperar»**.
  - Al recuperar, la fila desaparece con el anuncio «Encuesta recuperada.».
  - Estado vacío: **«No has descartado ninguna encuesta.»**

**Criterios de aceptación**
- [ ] Con sesión, en una tarjeta ajena del feed, «No me interesa» la sustituye por el bloque y, tras recargar, ya no aparece.
- [ ] «Deshacer» la restaura en el mismo sitio y vuelve a aparecer tras recargar.
- [ ] La opción no existe en tarjetas propias, para visitantes, ni fuera de `/`.
- [ ] Ajustes lista las descartadas, las recupera y muestra el estado vacío.
- [ ] Todo el flujo funciona con teclado, el foco nunca se pierde en el `body` y no hay desbordamiento a 320 px.

**Pruebas (TDD)**
- Vitest del menú (visibilidad según sesión y autoría), del bloque descartado (foco y `aria-live`) y de la lista de Ajustes.
- E2E `e2e/descartar.spec.ts`: descartar, deshacer, recargar, recuperar desde Ajustes y error de red simulado. A 320/390/1280 y en ambos temas.

**Fuera de alcance:** gestos de deslizar, descartes masivos y motivos del descarte.

---

### FEED-005 — Volver al mismo punto del feed

**Historia (HU-61):** como persona que explora, quiero que al volver de una encuesta el feed siga donde lo dejé, con las mismas páginas cargadas.

- **Épica:** E13 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `frontend`, `testing`, `area:feed`
- **Dependencias:** PERF-005 [#330](https://github.com/migdlp/opinion-social-media/issues/330).

**Decisiones fijadas**
- Se guarda en `sessionStorage`, nunca en `localStorage`, bajo la clave `opinion:feed-pos:<ruta+query>`. Sólo se guardan:
  - `cursors`: lista de cursores de las páginas cargadas tras la primera, como máximo 4 (hasta 100 encuestas).
  - `anchorPollId`: id de la primera tarjeta visible.
  - `offset`: píxeles entre el borde superior de esa tarjeta y el viewport.
  - `savedAt`: fecha y hora del guardado.
- **Nunca** se guardan preguntas, opciones, votos ni resultados.
- La caducidad es de **30 minutos**. Con datos caducados o ilegibles se borra la clave y se empieza arriba.
- Sólo se restaura al volver con la navegación **atrás** del navegador o con el enlace «Volver» del detalle hacia la misma URL del feed. Entrar desde el menú o el logo empieza arriba y borra la clave.

**Interfaz / implementación**
- Guardar en `pagehide`, al hacer clic en cualquier enlace de una tarjeta y con un *throttle* de 500 ms durante el scroll.
- Al montar el feed, si existe una entrada válida:
  1. Pedir en serie con `loadMoreFeed` cada cursor guardado, con un máximo de 4 llamadas.
  2. Desactivar `scrollRestoration` automático mientras tanto (`history.scrollRestoration = "manual"`) y restablecerlo a `auto` después.
  3. Hacer scroll a `#poll-<anchorPollId>` (las tarjetas deben tener ese `id`; añadirlo si falta) y ajustar con `offset`.
  4. Si la tarjeta ancla ya no está (descartada, oculta o borrada), quedarse en la última posición alcanzada sin error.
- Durante la restauración se muestran los skeletons existentes. La restauración se interrumpe si quien usa la página hace scroll o pulsa una tecla.
- Respetar `prefers-reduced-motion`: el salto nunca es animado.

**Casos límite**
- Si falla la red al pedir una página, se para la restauración, se queda en lo cargado y se muestra el «Cargar más» normal.
- Si entretanto se votó o descartó una encuesta, se ven los datos frescos del servidor, porque no se cachea contenido.
- Con `sessionStorage` bloqueado (todo envuelto en `try/catch`), el feed funciona como hoy.

**Criterios de aceptación**
- [ ] Tras cargar 3 páginas, abrir la encuesta n.º 45 y volver atrás, el feed muestra esa tarjeta en la misma posición (±1 tarjeta) en menos de 2 s con red local.
- [ ] Con más de 5 páginas cargadas, se restauran las 5 primeras y la posición queda en la última restaurada.
- [ ] Entrar desde el logo o la pestaña Feed empieza arriba.
- [ ] `sessionStorage` sólo contiene las claves y campos descritos (el test inspecciona su contenido).
- [ ] Con almacenamiento bloqueado, no hay errores en la consola.

**Pruebas (TDD)**
- Vitest del módulo `src/lib/feed-position.ts`: serializar, caducar, rechazar datos ilegibles y limitar a 4 cursores.
- E2E `e2e/volver-feed.spec.ts`: ir atrás, entrar por el logo, caducidad (simulando el reloj) y almacenamiento bloqueado.

**Fuera de alcance:** restaurar en búsqueda, perfil o Guardadas, y sincronizar entre pestañas.

---

### FEED-006 — Seguir categorías: backend

**Historia (HU-72):** como persona con sesión, quiero seguir una categoría para que sus encuestas aparezcan en mi pestaña Siguiendo.

- **Épica:** E13 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `backend`, `database`, `security`, `testing`, `area:feed`
- **Dependencias:** ninguna. Si FEED-002 o FEED-003 ya recrearon `get_feed`, partir de esa versión.

**Decisiones fijadas**
- Siguiendo = encuestas de autores con seguimiento **aceptado** **o** de categorías seguidas, sin duplicados, con el mismo orden y cursor actuales.
- Siempre se aplican `can_view_author`, los bloqueos y los filtros de FEED-002 y FEED-003. Seguir una categoría no da acceso a cuentas privadas.
- Seguir una categoría es privado: nadie más ve qué categorías sigue otra cuenta.

**Backend**
- Migración `<ts>_category_follows.sql`:
  - Tabla `public.category_follows (user_id uuid not null references auth.users(id) on delete cascade, category_slug text not null references public.categories(slug) on delete cascade, created_at timestamptz not null default now(), primary key (user_id, category_slug))`.
  - RLS activada y `revoke all` a los clientes.
- `public.follow_category(p_slug text) returns void`: `AUTH_REQUIRED` → `INVALID_CATEGORY` (no existe, distingue mayúsculas). Idempotente.
- `public.unfollow_category(p_slug text) returns void`: `AUTH_REQUIRED`. Idempotente y sin error si no existía.
- `public.list_my_categories() returns table (slug text, name text)`: `AUTH_REQUIRED`. Orden por `categories.position`.
- Recrear `get_feed`: en `siguiendo`, cambiar la condición de autor por `(exists follow accepted ... or p.category_slug in (select category_slug from public.category_follows where user_id = auth.uid()))`.
- Añadir índice `polls (category_slug, created_at desc, id desc) where status = 'published'` si no existe. Comprobarlo con `EXPLAIN` en el test de rendimiento y dejar el plan en la PR.
- Adaptadores: `followCategory`, `unfollowCategory` → `Result<void>`; `listMyCategories()` → `Result<Category[]>`.

**Criterios de aceptación**
- [ ] Siguiendo `deportes` y a nadie, Siguiendo devuelve todas las publicadas y visibles de `deportes`, sin duplicados, aunque además siga a su autora.
- [ ] Una encuesta de `deportes` de una cuenta privada que no sigo no aparece.
- [ ] Una de una cuenta bloqueada (en cualquier sentido) no aparece.
- [ ] `INVALID_CATEGORY` para `Deportes` (mayúscula) o un slug inexistente.
- [ ] `anon` no ejecuta las RPC y nadie lee la tabla directamente.
- [ ] Rendimiento: con 5000 encuestas, 20 categorías seguidas y 50 seguimientos, `get_feed('siguiendo')` tarda menos de 10 ms en local (medir y anotar).

**Pruebas (TDD)**
- SQL `<NNN>_category_follows.test.sql` con todos los criterios.
- Ataque HTTP en `tests/security/category-follows-attacks.test.ts`.

**Fuera de alcance:** la interfaz (FEED-007), notificaciones por categoría y recomendar categorías.

---

### FEED-007 — Seguir categorías: interfaz

**Historia (HU-72).**

- **Épica:** E13 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `frontend`, `design`, `testing`, `area:feed`
- **Dependencias:** FEED-006 y PERF-005 [#330](https://github.com/migdlp/opinion-social-media/issues/330).

**Interfaz**
- Cuando hay una categoría seleccionada en `/`, en cualquier pestaña, aparece bajo la fila de categorías una línea con el nombre de la categoría y un botón conmutador:
  - **«Seguir categoría»** (contorno) ↔ **«Siguiendo»** (relleno), con `aria-pressed`.
  - Sin sesión, el botón lleva a `loginPath` con retorno a la URL actual. No se sigue automáticamente al volver.
  - Hay estado de carga y el error se muestra junto al botón.
- **Ajustes:** apartado **«Categorías que sigues»** en la sección **Perfil** de `/settings`, con ancla `#categorias`.
  - Lista con el nombre y el botón **«Dejar de seguir»**.
  - Estado vacío: **«Aún no sigues ninguna categoría. Elige una en el feed y pulsa Seguir categoría.»**
- Estado vacío de Siguiendo, que sustituye al texto actual:
  - Título: **«Aún no hay nada en Siguiendo»**.
  - Descripción: **«Sigue a personas o categorías para ver aquí sus encuestas.»**
  - Acción: **«Ver Recientes»**.

**Criterios de aceptación**
- [ ] Seguir una categoría desde el feed hace que sus encuestas aparezcan en Siguiendo tras recargar. Dejar de seguirla desde Ajustes las retira.
- [ ] El visitante va al login y vuelve a la misma categoría.
- [ ] El estado del botón persiste entre recargas y es coherente con Ajustes.
- [ ] Teclado, foco visible, ambos temas y 320 px sin desbordamiento.

**Pruebas (TDD)**
- Vitest del botón (estados, error y visitante) y del apartado de Ajustes.
- E2E `e2e/seguir-categoria.spec.ts`.

**Fuera de alcance:** chips de categoría con indicador de seguida en la fila y contadores de seguidores de una categoría.
