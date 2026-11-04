# E15 · Resultados ampliados

**Issue de la épica:** [#344](https://github.com/migdlp/opinion-social-media/issues/344) · **Objetivo de la épica:** hacer más interesante el momento de descubrir resultados sin romper la regla crítica. Antes de votar se ve el total de votos; después, qué votaron las personas que sigo y cómo evolucionó la votación; además, se puede compartir que he votado. Decisiones: D-044 y D-051. Reglas comunes en el [README](README.md).

| Tarea | Historia | Prioridad | Tamaño | Dependencias |
|---|---|---|---|---|
| [RESULTS-005](https://github.com/migdlp/opinion-social-media/issues/359) | HU-63 Total de votos antes de votar (backend y reglas) | P1 | M | PERF-004 #329 |
| [RESULTS-006](https://github.com/migdlp/opinion-social-media/issues/360) | HU-63 Total de votos (interfaz) | P1 | M | RESULTS-005, PERF-005 #330, PERF-008 #333, PERF-009 #334 |
| [RESULTS-001](https://github.com/migdlp/opinion-social-media/issues/361) | HU-59 Votos de las personas que sigo (backend) | P1 | M | — |
| [RESULTS-002](https://github.com/migdlp/opinion-social-media/issues/362) | HU-59 Votos de las personas que sigo (interfaz) | P1 | M | RESULTS-001 |
| [RESULTS-003](https://github.com/migdlp/opinion-social-media/issues/363) | HU-60 Evolución temporal (backend) | P1 | M | — |
| [RESULTS-004](https://github.com/migdlp/opinion-social-media/issues/364) | HU-60 Evolución temporal (interfaz) | P1 | M | RESULTS-003 |
| [SHARE-001](https://github.com/migdlp/opinion-social-media/issues/365) | HU-62 Compartir que he votado | P1 | S | — |

---

### RESULTS-005 — Total de votos antes de votar: backend y regla

**Historia (HU-63):** como persona que explora, quiero ver cuántas personas han votado una encuesta antes de votar, sin ver el reparto, para saber si está animada.

- **Épica:** E15 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `backend`, `database`, `security`, `testing`, `docs`, `area:encuestas`
- **Dependencias:** PERF-004 [#329](https://github.com/migdlp/opinion-social-media/issues/329), que crea `get_poll_cards`.

**Decisiones fijadas (D-044)**
- Antes de votar sólo se libera `total_votes` (entero ≥ 0) de cualquier encuesta **visible** para quien llama, con o sin sesión.
- No se libera nada más: ni votos por opción, ni porcentajes, ni opción líder, ni orden de opciones por votos, ni «empate».
- `get_poll_results` y `get_feed_results` **no cambian**: siguen exigiendo voto o encuesta cerrada.

**Backend**
- Migración `<ts>_poll_vote_counts.sql`:
  - `public.get_poll_vote_counts(p_poll_ids uuid[]) returns table (poll_id uuid, total_votes integer)`: `stable`, `security definer` y `EXECUTE` para `anon` y `authenticated`. Como mucho 20 ids (el resto se ignora). Sólo devuelve filas de encuestas `published` con `can_view_author` verdadero; las demás se omiten sin error. Una encuesta visible con 0 votos devuelve `0`.
  - Recrear `public.get_poll_cards` (`drop` + `create`, partiendo de la versión de main) añadiendo la columna `vote_count integer`, **siempre informada** para cada tarjeta devuelta. Conservar todas las columnas, la autorización y los permisos.
- Documentación en la misma PR:
  - [AGENTS.md](../../../AGENTS.md), sección «Contratos a preservar»: cambiar la regla crítica por **«ningún usuario, incluido el autor, puede obtener el reparto de una encuesta abierta (votos por opción, porcentajes o cualquier dato derivado) antes de votar; el número total de votos es público para quien puede ver la encuesta (D-044)»**.
  - [contexto-aplicacion.md](../../contexto-aplicacion.md): la misma regla.
  - [contratos-api.md](../../contratos-api.md): §3.3, una sección nueva para `get_poll_vote_counts` y la columna nueva de `get_poll_cards`.
- Adaptador: `getPollVoteCounts(supabase, ids)` → `Result<Record<string, number>>`. `PollCard.voteCount: number`.

**Pruebas que cambian**
- Buscar en `supabase/tests`, `tests/security` y `e2e` las aserciones que prohíben **cualquier** recuento antes de votar (por ejemplo `e2e/busqueda.spec.ts:47` y `:117`, con `/\d\s?%|\d\s+votos?|en total/i`).
- Sustituirlas por aserciones que prohíben el **reparto** y permiten el total: sin `%`, sin votos por opción y sin «en total» junto a opciones. Cada test cambiado se lista en la PR con el motivo D-044.
- Las aserciones de que `get_poll_results` devuelve `NOT_VOTED` **se mantienen**.

**Criterios de aceptación**
- [ ] Un visitante obtiene el `total_votes` de una abierta pública y no obtiene nada de una privada sin permiso, de una oculta ni entre cuentas bloqueadas.
- [ ] La autora sin voto obtiene el total de su encuesta abierta, y `get_poll_results` le sigue respondiendo `NOT_VOTED`.
- [ ] `get_poll_cards` devuelve `vote_count` en todas las tarjetas y **ninguna** columna de reparto para abiertas no votadas. Reutilizar la tabla de casos de PERF-004.
- [ ] Más de 20 ids: se procesan los 20 primeros. Un id inexistente se omite.
- [ ] AGENTS.md, contexto y contratos reflejan la regla nueva con el mismo texto.

**Pruebas (TDD)**
- SQL `<NNN>_poll_vote_counts.test.sql`.
- Ataque HTTP en `tests/security/vote-counts-attacks.test.ts`: intentar deducir el reparto combinando `get_poll_vote_counts`, `get_poll_cards` y `get_feed_results` sin votar. Debe fallar.

**Fuera de alcance:** mostrar el total en la interfaz (RESULTS-006), totales en la imagen OG y contadores en tiempo real.

---

### RESULTS-006 — Total de votos antes de votar: interfaz

**Historia (HU-63).**

- **Épica:** E15 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `frontend`, `design`, `testing`, `area:encuestas`
- **Dependencias:** RESULTS-005, PERF-005 [#330](https://github.com/migdlp/opinion-social-media/issues/330), PERF-008 [#333](https://github.com/migdlp/opinion-social-media/issues/333) y PERF-009 [#334](https://github.com/migdlp/opinion-social-media/issues/334), para que todas las listas usen `get_poll_cards`.

**Interfaz**
- **Dónde:** en todas las tarjetas (feed, secciones, búsqueda, perfil y Guardadas) y en el detalle, en la línea de metadatos junto a la categoría y la etiqueta de cierre. Siempre que la encuesta **no** muestre resultados.
- **Cuándo muestra resultados:** si ya votó o está cerrada, el componente de resultados ya enseña el total, así que la etiqueta nueva no se repite.
- **Formato** con `Intl.NumberFormat("es-ES")`:
  - 0: **«Aún no hay votos»**.
  - 1: **«1 voto»**.
  - 2–9999: **«{n} votos»**, con separador de miles (`1.234 votos`).
  - ≥ 10 000: compacto, como **«12,3 mil votos»**.
- **Accesibilidad:** el texto es legible por lectores de pantalla tal cual, sin icono que lo sustituya.
- Al votar, la etiqueta se sustituye por los resultados como hoy.

**Criterios de aceptación**
- [ ] Un visitante ve «N votos» en las tarjetas abiertas y ningún porcentaje ni recuento por opción.
- [ ] Tras votar, el total aparece una sola vez (en los resultados).
- [ ] Los formatos 0/1/n/≥10 000 se ven como en la ficha (test unitario del formateador).
- [ ] 320 px sin desbordamiento con categoría, cierre y total en la misma tarjeta; ambos temas.

**Pruebas (TDD)**
- Vitest de `formatVoteCount` y de `PollCard` y `PollDetailView` (con y sin resultados).
- E2E: ampliar `e2e/feed.spec.ts` y `e2e/busqueda.spec.ts` con «ve el total y no ve el reparto».

**Fuera de alcance:** animar el contador y mostrar el total en la imagen OG.

---

### RESULTS-001 — Qué han votado las personas que sigo: backend

**Historia (HU-59):** como persona que ya votó, quiero ver qué eligieron las personas que sigo, para comparar mi opinión con la de mi gente.

- **Épica:** E15 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `backend`, `database`, `security`, `testing`, `area:encuestas`
- **Dependencias:** ninguna (usa PRIV-001 y SOCIAL-001, ya completadas).

**Decisiones fijadas (D-051)**
- Sólo cuentan las cuentas que **sigo con seguimiento aceptado**.
- Cada una aparece sólo si su preferencia `vote_visibility` me lo permite:
  - `private`: nunca.
  - `followers`: sí, porque soy seguidor aceptado.
  - `profile`: sí, porque `can_view_author` es verdadero para mí.
- Hay bloqueos que lo impiden siempre.
- Requisito previo: haber votado esta encuesta, o que esté cerrada. Es la misma regla P-1 del historial.

**Backend**
- Migración `<ts>_poll_following_votes.sql`: `public.get_poll_following_votes(p_poll_id uuid) returns table (option_id uuid, username text, display_name text, avatar_icon text, voted_at timestamptz)`. Sólo `authenticated`, `stable` y `security definer`.
- Errores en orden:
  1. `AUTH_REQUIRED`.
  2. `POLL_UNAVAILABLE`: no publicada, inexistente o `can_view_author` de la autora falso.
  3. `NOT_VOTED`: abierta y quien llama no votó.
- Filas: votos de esa encuesta cuyo `user_id` cumple las reglas de D-051, excluida quien llama. Orden `voted_at desc, lower(username) asc`, **máximo 100 filas**. Nunca devuelve `user_id`.
- Adaptador: `getPollFollowingVotes(supabase, pollId)` → `Result<FollowingVote[]>`.

**Criterios de aceptación**
- [ ] Sigo a A (`followers`), B (`profile`, cuenta pública), C (`private`) y D (pendiente, no aceptado), y los cuatro votaron. Entonces sólo recibo A y B, con su opción.
- [ ] Si A me bloquea o la bloqueo, desaparece.
- [ ] Si la encuesta está abierta y no voté, `NOT_VOTED`, también siendo la autora. Si está cerrada, recibo las filas sin haber votado.
- [ ] Una encuesta de una cuenta privada que no sigo da `POLL_UNAVAILABLE`.
- [ ] Con 150 coincidencias, devuelve 100.
- [ ] `anon` no ejecuta la RPC.

**Pruebas (TDD)**
- SQL `<NNN>_poll_following_votes.test.sql` con todos los criterios.
- Ataque HTTP en `tests/security/following-votes-attacks.test.ts`: intentar ver el voto de una cuenta `private` cambiando mi seguimiento o mediante otra encuesta.

**Fuera de alcance:** la interfaz (RESULTS-002), «personas que me siguen» y estadísticas por grupo.

---

### RESULTS-002 — Qué han votado las personas que sigo: interfaz

**Historia (HU-59).**

- **Épica:** E15 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `frontend`, `design`, `testing`, `area:encuestas`
- **Dependencias:** RESULTS-001.

**Interfaz**
- **Dónde:** sólo en el detalle `/polls/[id]`, bajo los resultados y sólo cuando se muestran (votada o cerrada) con sesión. **No** en tarjetas.
- **Carga:** se pide `getPollFollowingVotes` en el servidor junto al detalle, o en cliente tras el evento `opinion:voted`.
- **Bloque «Personas que sigues»:**
  - Con filas: bajo cada opción de los resultados, una línea con hasta 3 avatares solapados (componente `Avatar` existente, 24 px) y el texto:
    - 1 persona: **«@ana»**.
    - 2: **«@ana y @luis»**.
    - 3: **«@ana, @luis y @eva»**.
    - Más de 3: **«@ana, @luis y {n} más»**.
  - Sólo en las opciones con al menos una persona.
  - Al final del bloque, el botón **«Ver quién votó qué»**, que abre un diálogo modal (`dialog`, foco atrapado, Escape cierra) con la lista agrupada por opción en el orden de `position`. Cada fila lleva avatar, nombre visible y `@usuario` enlazado a `/u/[username]`.
  - Si se devolvieron 100 filas, el pie dice **«Se muestran las 100 más recientes.»**
  - Siempre una nota pequeña: **«Solo aparecen las personas que sigues y comparten su historial de votos contigo.»**
  - Con 0 filas: **«Ninguna de las personas que sigues comparte aquí su voto.»**, con la misma nota. Si quien mira no sigue a nadie, no se muestra el bloque.
- **Error:** el bloque se oculta y queda un aviso discreto con «Reintentar». El resto del detalle no se ve afectado.

**Criterios de aceptación**
- [ ] Tras votar, sin recargar, aparece el bloque con los nombres correctos bajo cada opción.
- [ ] El diálogo lista a todas las personas devueltas, enlaza a sus perfiles y es usable con teclado.
- [ ] Sin sesión, sin votar en una abierta o sin seguir a nadie, el bloque no aparece y no se hace la llamada.
- [ ] A 320 px los avatares y textos no desbordan; ambos temas.

**Pruebas (TDD)**
- Vitest del formateo de nombres (1, 2, 3 y más de 3), del diálogo y de los estados.
- E2E `e2e/votos-seguidos.spec.ts` con tres cuentas sembradas y preferencias distintas.

**Fuera de alcance:** mostrarlo en el feed y enviar avisos de «tu amiga ha votado».

---

### RESULTS-003 — Evolución de los resultados: backend

**Historia (HU-60):** como persona que ya votó, quiero ver cómo han cambiado los resultados con el tiempo.

- **Épica:** E15 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `backend`, `database`, `security`, `testing`, `area:encuestas`
- **Dependencias:** ninguna.

**Decisiones fijadas (D-051)**
- Requiere **10 votos o más** en total.
- Los tramos nunca duran menos de 6 h. Así baja (sin eliminarse del todo) la posibilidad de deducir el voto de una persona concreta sabiendo cuándo votó. Este riesgo residual se documenta en contratos-api.md.

**Backend**
- Migración `<ts>_poll_timeline.sql`: `public.get_poll_timeline(p_poll_id uuid) returns table (bucket_start timestamptz, option_id uuid, cumulative_votes integer)`. `stable`, `security definer` y `EXECUTE` para `anon` y `authenticated`.
- La autorización es **idéntica** a `get_poll_results`: abiertas sólo con voto propio; cerradas visibles para cualquiera. Los errores también son los suyos (`AUTH_REQUIRED`, `POLL_UNAVAILABLE`, `NOT_VOTED`), más `NOT_ENOUGH_VOTES` (código nuevo) si el total es menor de 10.
- **Tramos:** la duración es `fin - created_at`, donde `fin = least(coalesce(closes_at, now()), now())`.
  - Duración ≤ 15 días: tramos de 6 h.
  - ≤ 60 días: de 1 día.
  - Más: de 1 semana.
- Los tramos se alinean con `date_bin(intervalo, created_at, created_at)`.
- Una fila por tramo y opción, **todas** las opciones incluidas aunque tengan 0. El valor es el acumulado hasta el final del tramo. Orden `bucket_start asc, position asc`. Como máximo 60 tramos: si hubiera más, se devuelven los 60 últimos.
- Adaptador: `getPollTimeline(supabase, pollId)` → `Result<TimelinePoint[]>`. Texto de `NOT_ENOUGH_VOTES`: «La evolución se muestra a partir de 10 votos.»

**Criterios de aceptación**
- [ ] Un dataset con votos en tiempos fijos produce exactamente los tramos y acumulados esperados en los tres tamaños de tramo.
- [ ] Una abierta sin voto da `NOT_VOTED` (también a la autora); una cerrada funciona para un visitante; 9 votos dan `NOT_ENOUGH_VOTES`.
- [ ] El último tramo coincide con los totales de `get_poll_results`.
- [ ] Privadas sin permiso y bloqueos dan `POLL_UNAVAILABLE`.

**Pruebas (TDD)**
- SQL `<NNN>_poll_timeline.test.sql`.
- Ataque HTTP en `tests/security/timeline-attacks.test.ts`: abierta sin voto, por `anon` y con sesión.

**Fuera de alcance:** la gráfica (RESULTS-004) y tramos configurables.

---

### RESULTS-004 — Evolución de los resultados: interfaz

**Historia (HU-60).**

- **Épica:** E15 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `frontend`, `design`, `accessibility`, `testing`, `area:encuestas`
- **Dependencias:** RESULTS-003.

**Interfaz**
- **Dónde:** sólo en el detalle, bajo los resultados (y bajo RESULTS-002 si existe), cuando se muestran resultados.
- **Botón:** **«Ver evolución»** (desplegable con `aria-expanded`). Los datos se piden al abrirlo por primera vez y no se repite la petición.
- **Gráfica:** componente propio `PollTimelineChart` en **SVG inline**, sin dependencias nuevas.
  - Eje X con fechas (`Intl.DateTimeFormat("es-ES")`: «4 nov, 18:00» para tramos de 6 h y «4 nov» para días y semanas). Eje Y de 0 a 100 %.
  - Una línea por opción con el **porcentaje acumulado** (`ROUND(100 * acumulado_opción / acumulado_total, 1)`) y los colores de opción ya definidos en DESIGN.md.
  - Leyenda con el texto de cada opción. Debe funcionar en claro y oscuro.
  - Alto 200 px en móvil y 260 px en escritorio, y ancho del contenedor.
- **Accesibilidad:** `role="img"` con `aria-label` **«Evolución del porcentaje de cada opción»**, y el botón **«Ver como tabla»**, que alterna con una `<table>` de fechas por filas y opciones por columnas (porcentajes).
- **Estados:**
  - Carga: skeleton del tamaño de la gráfica.
  - `NOT_ENOUGH_VOTES`: el texto de su código, sin gráfica.
  - Error: mensaje estándar con «Reintentar».

**Criterios de aceptación**
- [ ] Con 10 votos o más, tras abrir, la gráfica muestra una línea por opción y la tabla tiene los mismos valores.
- [ ] Con menos de 10 votos se ve el aviso.
- [ ] Sin resultados visibles, el botón no existe.
- [ ] Teclado, foco y lectores de pantalla (la tabla es la alternativa completa); 320 px y ambos temas.

**Pruebas (TDD)**
- Vitest del cálculo de porcentajes y coordenadas (función pura) y del conmutador gráfica/tabla.
- E2E `e2e/evolucion.spec.ts` con datos sembrados.

**Fuera de alcance:** zoom, *tooltips* interactivos, exportar la gráfica y mostrarla en tarjetas.

---

### SHARE-001 — Compartir que he votado sin revelar los resultados

**Historia (HU-62):** como persona que acaba de votar, quiero invitar a otras personas a votar diciendo que yo ya voté, sin desvelar los porcentajes.

- **Épica:** E15 · **Prioridad:** P1 · **Tamaño:** S
- **Etiquetas:** `frontend`, `testing`, `area:encuestas`
- **Dependencias:** ninguna.
- **Relación:** V2-042 [#164](https://github.com/migdlp/opinion-social-media/issues/164) (imagen «Mi voto», bloqueada hasta V2-040) es una propuesta distinta, con imagen. SHARE-001 es la versión de sólo texto y no la sustituye. Si V2-042 se aprueba, añadirá la imagen a este mismo botón.

**Decisiones fijadas**
- El mensaje se genera **en el cliente** con datos que la persona ya tiene. No hay URL nueva, parámetros, imagen nueva ni endpoint de servidor.
- El enlace compartido es el normal `https://<origen>/polls/<id>`, con la imagen OG existente, que no muestra resultados.
- Incluir la opción elegida es **opcional y desactivado por defecto**.

**Interfaz**
- **Dónde:** en el detalle y en la tarjeta, junto a «Copiar enlace», sólo cuando quien mira **ha votado**.
- **Botón:** **«Compartir mi voto»**. Abre un pequeño panel (popover accesible o `dialog` en móvil) con:
  - La casilla **«Incluir mi respuesta»** (desmarcada).
  - La vista previa del texto.
  - El botón **«Compartir»**.
- **Textos exactos:**
  - Sin respuesta: **«He votado en «{pregunta}». ¿Y tú? {url}»**.
  - Con respuesta: **«He votado «{opción}» en «{pregunta}». ¿Y tú? {url}»**.
- **«Compartir»:** usa `navigator.share({ text })` si existe. Si no existe o falla (salvo `AbortError`), copia el texto al portapapeles con la misma alternativa que «Copiar enlace» y anuncia **«Texto copiado.»**
- Nunca incluye porcentajes, totales ni votos de otras personas.

**Criterios de aceptación**
- [ ] Sin votar, el botón no existe.
- [ ] Tras votar, el texto por defecto no contiene la opción. Al marcar la casilla, sí.
- [ ] Ningún texto generado contiene `%` ni números de votos (test unitario).
- [ ] Sin Web Share se copia al portapapeles y se anuncia. Con el portapapeles bloqueado se ve la alternativa existente.
- [ ] Teclado y lector de pantalla; 320 px y ambos temas.

**Pruebas (TDD)**
- Vitest de `buildShareVoteText` y del panel.
- E2E `e2e/compartir-voto.spec.ts`, con `navigator.share` simulado y sin él.

**Fuera de alcance:** imagen OG personalizada, contar cuántas veces se comparte y enlaces de referido.
