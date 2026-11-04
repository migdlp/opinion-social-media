# E14 · Secciones: Tendencias, Populares, Cierran pronto y Reñidas

**Issue de la épica:** [#343](https://github.com/migdlp/opinion-social-media/issues/343) · **Objetivo de la épica:** dar al feed secciones que muestren lo que se mueve, lo más votado, lo que está a punto de cerrar y los resultados más ajustados, sin romper la regla de resultados. Es la HU-73, ampliada a petición del propietario. Decisiones: D-044 (total visible) y D-045 (secciones y fórmulas). Reglas comunes en el [README](README.md).

| Tarea | Historia | Prioridad | Tamaño | Dependencias |
|---|---|---|---|---|
| [TREND-001](https://github.com/migdlp/opinion-social-media/issues/357) | HU-73 Secciones (backend) | P1 | L | RESULTS-005, FEED-003 |
| [TREND-002](https://github.com/migdlp/opinion-social-media/issues/358) | HU-73 Secciones (interfaz) | P1 | L | TREND-001, RESULTS-006, PERF-005 #330 |

## Definición de las secciones (D-045)

Las fórmulas son fijas; cualquier cambio requiere una decisión nueva. «Visible» significa siempre: `status = 'published'`, `can_view_author(user_id)` verdadero (incluye cuentas privadas y bloqueos), encuesta no descartada por quien mira (FEED-003) y la misma retención que `get_feed`, es decir, una cerrada sale cuando `now() >= closes_at + 24 h`. Reñidas es la excepción y usa su propia ventana.

| Sección | URL `tab=` | Qué entra | Orden | Mínimo |
|---|---|---|---|---|
| Recientes (existe) | `recientes` o nada | Igual que hoy | `created_at desc, id desc` | — |
| Siguiendo (existe) | `siguiendo` | Igual que hoy (+ categorías con FEED-006) | `created_at desc, id desc` | — |
| **Tendencias** | `tendencias` | Encuestas con votos emitidos en las últimas 24 h | Votos de las últimas 24 h, desc; desempate `created_at desc, id desc` | 3 votos en 24 h |
| **Populares** | `populares` | Encuestas creadas en los últimos 7 días | Total de votos, desc; desempate `created_at desc, id desc` | 5 votos |
| **Cierran pronto** | `cierran` | Abiertas con `closes_at` en `(now(), now() + 48 h]` | `closes_at asc, id asc` | — |
| **Reñidas** | `renidas` | **Cerradas** con `closes_at` en los últimos 7 días | Margen entre el 1.º y el 2.º porcentaje, asc; desempate total desc, `id desc` | 10 votos |

Reñidas sólo usa encuestas cerradas porque su orden depende del reparto, y el reparto de las abiertas no se puede usar antes de votar. Ninguna sección muestra números de posición («#1»): la lista filtrada por visibilidad puede tener huecos.

---

### TREND-001 — Secciones del feed: backend

**Historia (HU-73):** como persona que explora, quiero secciones como Tendencias, Populares, Cierran pronto y Reñidas para descubrir encuestas interesantes más allá de las recientes.

- **Épica:** E14 · **Prioridad:** P1 · **Tamaño:** L
- **Etiquetas:** `backend`, `database`, `security`, `testing`, `area:feed`
- **Dependencias:** RESULTS-005 (D-044 aplicada: los totales ya son públicos) y FEED-003 (filtro de descartes).

**Decisiones fijadas**
- Tendencias, Populares y Reñidas se calculan como **instantánea global** de las 500 mejores de cada sección. La instantánea se recalcula **al leer** si tiene más de 10 minutos, sin cron. Cierran pronto se calcula en vivo porque no usa agregados.
- La visibilidad se aplica **al leer** para cada persona, nunca en la instantánea.
- La categoría y el filtro «Sin votar» se aplican al leer sobre la instantánea. Si una categoría tiene pocas encuestas entre las 500, la sección muestra pocas. Se acepta.

**Backend**
- Migración `<ts>_ranked_feed.sql`:
  - Índice `votes (created_at)` para la ventana de 24 h.
  - Tabla `public.poll_rankings (section text not null check (section in ('tendencias','populares','renidas')), poll_id uuid not null references public.polls(id) on delete cascade, score numeric not null, rank integer not null, computed_at timestamptz not null, primary key (section, rank))`, más el índice `(section, poll_id)`. RLS activada y `revoke all` a los clientes.
  - Función interna `private.refresh_poll_rankings(p_section text)`: `pg_try_advisory_xact_lock(hashtext('poll_rankings:' || p_section))`. Si no consigue el cerrojo, vuelve sin hacer nada y se sirve la instantánea anterior. Si lo consigue, hace `delete` + `insert` de las 500 mejores según la tabla de definición, sobre **todas** las publicadas (sin filtro de visibilidad), con `rank` 1..N y el mismo `computed_at = now()`.
  - Para Reñidas, el margen es `pct1 - pct2`, con los porcentajes calculados como en `get_poll_results` y `pct2 = 0` si sólo una opción tiene votos.
- `public.get_ranked_feed(p_section text, p_category text default null, p_cursor text default null, p_unvoted boolean default false) returns table (poll_id uuid, created_at timestamptz, cursor text)`:
  - `volatile`, `security definer` y `EXECUTE` para `anon` y `authenticated`.
  - Errores en orden: `INVALID_SECTION` (código nuevo; cualquier valor distinto de `tendencias|populares|cierran|renidas`) → `INVALID_CATEGORY` → `AUTH_REQUIRED` (si `p_unvoted` sin sesión) → `INVALID_CURSOR`.
  - En las secciones con instantánea, si `max(computed_at)` de la sección es nulo o anterior a `now() - interval '10 minutes'`, llama a `private.refresh_poll_rankings` y después lee.
  - Lectura: une `poll_rankings` con `polls`, aplica la visibilidad completa, categoría, «Sin votar» y descartes, y ordena por `rank`. El cursor es `r:<rank>`. La página siguiente usa `rank > cursor` sobre la instantánea vigente. Si cambió entretanto, puede repetirse o saltarse alguna encuesta; el cliente deduplica por id.
  - Cierran pronto: lectura en vivo con cursor `c:<closes_at UTC>|<id>` y orden `closes_at asc, id asc`.
  - Siempre devuelve como máximo 21 filas (20 + 1) y **sólo** ids, fecha y cursor, igual que `get_feed`. Los datos y resultados salen por `get_poll_cards`, con sus reglas.
  - Si SOCIAL-003 ya está en main, se excluyen también las cuentas silenciadas por quien llama. Si no, lo hará SOCIAL-003.
- Adaptador: `getRankedFeed(supabase, { section, category, cursor, unvoted }, viewer)` → `Result<FeedPage>`, con la misma forma que `getFeed`. Texto de `INVALID_SECTION`: «Esa sección no existe.»

**Casos límite**
- Hay dos llamadas simultáneas con la instantánea caducada: sólo una recalcula y la otra lee la anterior. Test de concurrencia.
- Si una encuesta de la instantánea se borra (POLL-004), la fila desaparece por la cascada.
- Si una encuesta pasa a oculta, el filtro de lectura la excluye antes del siguiente recálculo.
- Una encuesta de una cuenta privada entra en la instantánea, pero sólo la ven sus seguidores aceptados.

**Criterios de aceptación**
- [ ] Con un dataset sintético fijo, cada sección devuelve exactamente el orden esperado de la tabla de definición, incluidos los desempates y los mínimos.
- [ ] Reñidas nunca contiene encuestas abiertas. Ninguna sección devuelve agregados ni `user_id`.
- [ ] Una encuesta privada sin permiso, bloqueada, oculta o descartada no aparece para quien no debe, aunque esté en la instantánea.
- [ ] Una instantánea de más de 10 min se recalcula en la siguiente lectura y una de menos no (test con `computed_at` manipulado).
- [ ] Con dos lecturas concurrentes y la instantánea caducada, se recalcula una sola vez (`test:db:concurrency`).
- [ ] El cursor de una sección usado en otra, o uno ilegible, da `INVALID_CURSOR`.
- [ ] Rendimiento en local con 5000 encuestas y 50 000 votos: recálculo por debajo de 300 ms y lectura por debajo de 10 ms. Medido y anotado en la PR.

**Pruebas (TDD)**
- SQL `<NNN>_ranked_feed.test.sql`, con todos los criterios funcionales.
- Concurrencia en el script existente de `test:db:concurrency`.
- Ataque HTTP en `tests/security/ranked-feed-attacks.test.ts`: lectura directa de `poll_rankings`, `anon` con `p_unvoted` y encuestas privadas.

**Fuera de alcance:** personalización por intereses, Tendencias por categoría con instantánea propia, mostrar la puntuación y cron.

---

### TREND-002 — Secciones del feed: interfaz

**Historia (HU-73).**

- **Épica:** E14 · **Prioridad:** P1 · **Tamaño:** L
- **Etiquetas:** `frontend`, `design`, `testing`, `area:feed`
- **Dependencias:** TREND-001, RESULTS-006 (el total de votos ya se ve en las tarjetas) y PERF-005 [#330](https://github.com/migdlp/opinion-social-media/issues/330).

**Interfaz**
- **Pestañas:** `FeedControls` pasa a tener 6 pestañas en este orden: **Recientes · Siguiendo · Tendencias · Populares · Cierran pronto · Reñidas**.
  - Patrón `tablist` accesible: flechas izquierda y derecha, Inicio y Fin.
  - En móvil la fila se desplaza en horizontal como la de categorías, sin barra visible, con la pestaña activa siempre visible (`scrollIntoView({ inline: "nearest" })`). En escritorio cabe en una línea a 1280 px.
  - Recientes sigue siendo la inicial sin `tab` (D-033). Siguiendo conserva su comportamiento sin sesión.
- **Subtítulo bajo las pestañas** (texto pequeño, color secundario), sólo en las secciones nuevas:
  - Tendencias: **«Las que más votos han sumado en las últimas 24 horas.»**
  - Populares: **«Las más votadas de los últimos 7 días.»**
  - Cierran pronto: **«Abiertas que cierran en las próximas 48 horas.»**
  - Reñidas: **«Encuestas cerradas esta semana con el resultado más ajustado.»**
- **Datos:** las secciones nuevas usan `getRankedFeed` y `loadMoreRanked(section, category, unvoted, cursor)`. Las tarjetas son las mismas del feed. Deduplicar por `poll_id` al añadir páginas.
- **Tarjetas:**
  - En Cierran pronto, la etiqueta de cierre existente se muestra destacada (color de acento) con el texto **«Cierra en {n} h»**, o **«Cierra en {n} min»** si falta menos de 1 h. Se recalcula cada minuto en cliente sin pedir datos.
  - En Reñidas se ven los resultados porque están cerradas, con la regla de siempre.
- **Filtros:** la categoría funciona en todas las secciones. El conmutador «Sin votar» (FEED-002) se oculta en Reñidas, donde no aplica, y en las demás se conserva.
- **Estados vacíos** (con la acción **«Ver Recientes»** en todos):
  - Tendencias: **«Ahora mismo no hay tendencias»** / **«Cuando una encuesta sume votos rápido aparecerá aquí.»**
  - Populares: **«Todavía no hay encuestas populares esta semana»** / **«Vota y comparte para que empiecen a destacar.»**
  - Cierran pronto: **«Nada cierra en las próximas 48 horas»** / **«Las encuestas con fecha de cierre cercana aparecerán aquí.»**
  - Reñidas: **«No hay resultados reñidos esta semana»** / **«Aquí verás las encuestas cerradas con el resultado más ajustado.»**
- `INVALID_SECTION` (tab desconocido en la URL): se muestra Recientes sin error, igual que hoy con un `tab` desconocido.

**Criterios de aceptación**
- [ ] Las 6 pestañas se navegan con ratón, toque y teclado, y la URL refleja la sección y sobrevive a recargas y a atrás o adelante.
- [ ] Cada sección muestra su subtítulo, su estado vacío y las tarjetas en el orden del backend, sin duplicados al paginar.
- [ ] Ninguna tarjeta de una abierta no votada muestra reparto: sólo el total (D-044). Verificar con la misma expresión regular de los E2E actuales adaptada a «sin porcentajes ni votos por opción».
- [ ] A 320 px la fila de pestañas no ensancha la página y la activa queda visible.
- [ ] Ambos temas y foco visible en cada pestaña.

**Pruebas (TDD)**
- Vitest de `FeedControls` (orden, teclado, subtítulos y ocultar «Sin votar» en Reñidas) y de la deduplicación.
- E2E `e2e/secciones.spec.ts`, con datos sembrados que garanticen contenido en cada sección: navegar las 6, paginar, estados vacíos con una categoría vacía y comprobar el reparto oculto. A 320/390/1280 y en ambos temas.

**Fuera de alcance:** recordar la última sección elegida, contadores por pestaña, iconos animados y secciones adicionales.
