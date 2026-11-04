# E16 · Mis encuestas

**Issue de la épica:** [#345](https://github.com/migdlp/opinion-social-media/issues/345) · **Objetivo de la épica:** dar a la autora más control sobre lo que publica. Puede añadir contexto al crear, fijar una encuesta en su perfil y borrar las suyas. Decisiones: D-046 (borrado) y D-053 (descripción y fijada). Reglas comunes en el [README](README.md).

| Tarea | Historia | Prioridad | Tamaño | Dependencias |
|---|---|---|---|---|
| [POLL-002](https://github.com/migdlp/opinion-social-media/issues/366) | HU-66 Descripción de la encuesta (backend) | P1 | M | PERF-004 #329 |
| [POLL-003](https://github.com/migdlp/opinion-social-media/issues/367) | HU-66 Descripción de la encuesta (interfaz) | P1 | M | POLL-002, PERF-005 #330, PERF-008 #333 |
| [PROFILE-003](https://github.com/migdlp/opinion-social-media/issues/368) | HU-68 Fijar una encuesta en mi perfil | P1 | M | PERF-009 #334 |
| [POLL-004](https://github.com/migdlp/opinion-social-media/issues/369) | HU-70 Borrar una encuesta propia (backend) | P1 | M | — |
| [POLL-005](https://github.com/migdlp/opinion-social-media/issues/370) | HU-70 Borrar una encuesta propia (interfaz) | P1 | M | POLL-004 |

**Coordinación:** POLL-002 recrea `create_poll`, igual que MEDIA-001 [#288](https://github.com/migdlp/opinion-social-media/issues/288). La segunda en fusionarse parte de la firma vigente en main y conserva todos los parámetros.

---

### POLL-002 — Descripción opcional de la encuesta: backend

**Historia (HU-66):** como autora, quiero añadir una descripción o contexto breve a la pregunta para que quien vote entienda mejor qué se pregunta.

- **Épica:** E16 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `backend`, `database`, `security`, `testing`, `area:encuestas`
- **Dependencias:** PERF-004 [#329](https://github.com/migdlp/opinion-social-media/issues/329).

**Decisiones fijadas (D-053)**
- Texto plano opcional de 1–500 caracteres Unicode. Vacío equivale a `null`.
- No se edita tras publicar: no se crea ninguna RPC para cambiarlo.
- La búsqueda **no** indexa la descripción.

**Backend**
- Migración `<ts>_poll_description.sql`:
  - `alter table public.polls add column description text check (description is null or char_length(description) between 1 and 500)`.
  - `grant select (description)` a `anon` y `authenticated`, igual que `closes_at`.
- Recrear `public.create_poll` añadiendo el parámetro final `p_description text default null`.
  - **Normalización:** recortar espacios, tabulaciones y saltos de línea de los extremos; convertir `\r\n` en `\n`; reducir 3 o más saltos de línea seguidos a 2; conservar los espacios internos.
  - Si el resultado queda vacío, se guarda `null`.
  - Si tiene más de 500 caracteres o algún carácter de control distinto de `\n` y `\t`: `DESCRIPTION_INVALID` (código nuevo). Su lugar en el orden de errores es justo después de `VALIDATION_OPTION_DUPLICATE`.
  - El HTML se guarda literal.
- Recrear `get_poll_cards` añadiendo la columna `description text`.
- Contratos actualizados, con la firma completa nueva de `create_poll`.
- Adaptador: `createPoll(..., { description })`; `PollCard.description?: string`. Texto de `DESCRIPTION_INVALID`: «La descripción admite hasta 500 caracteres de texto.»

**Criterios de aceptación**
- [ ] `create_poll` sin `p_description` funciona igual que antes (regresión).
- [ ] Con «  hola\r\n\r\n\r\nmundo  » se guarda «hola\n\nmundo». Con «   » se guarda `null`. Con 501 caracteres o `\u0007`, `DESCRIPTION_INVALID`.
- [ ] `get_poll_cards` y la lectura directa de `polls` devuelven `description` con la visibilidad de siempre.
- [ ] Ningún cliente puede hacer `update` de `description`.

**Pruebas (TDD)**
- SQL `<NNN>_poll_description.test.sql`.
- Ataque HTTP: `update` directo y creación con HTML (se guarda literal).

**Fuera de alcance:** la interfaz (POLL-003), editar, formato enriquecido y enlaces.

---

### POLL-003 — Descripción opcional de la encuesta: interfaz

**Historia (HU-66).**

- **Épica:** E16 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `frontend`, `design`, `testing`, `area:encuestas`
- **Dependencias:** POLL-002, PERF-005 [#330](https://github.com/migdlp/opinion-social-media/issues/330) y PERF-008 [#333](https://github.com/migdlp/opinion-social-media/issues/333).

**Interfaz**
- **Crear (`/create`):** bajo la pregunta, un `textarea` con la etiqueta **«Contexto (opcional)»**.
  - Placeholder: **«Añade datos o contexto para quien vote.»**
  - Tres filas iniciales que crecen hasta seis.
  - Contador accesible **«{n} / 500»**, contado en puntos de código.
  - El error de su código se muestra junto al campo, conservando lo escrito.
  - No se persiste en el navegador (regla de no borradores).
- **Detalle:** la descripción va bajo la pregunta en texto plano, con `whitespace-pre-wrap` y escapado, sin enlaces automáticos.
- **Tarjetas:** se muestran como máximo 3 líneas (`line-clamp-3`), sin botón «Ver más», porque la tarjeta ya enlaza al detalle.
- **Metadatos OG del detalle:** si hay descripción, `description` es la descripción recortada a 160 caracteres con «…». Si no, el texto actual.

**Criterios de aceptación**
- [ ] Se puede crear una encuesta con y sin contexto. Al publicar, el detalle muestra el texto exacto con sus saltos de línea.
- [ ] El contador y el error funcionan y, tras un error, no se pierde nada de lo escrito.
- [ ] En la tarjeta se recorta a 3 líneas sin romper la cuadrícula de DESIGN-015.
- [ ] HTML introducido se ve como texto.
- [ ] 320 px, teclado y ambos temas.

**Pruebas (TDD)**
- Vitest del formulario (contador, error y envío) y de la tarjeta (recorte).
- E2E: ampliar `e2e/flujos-principales.spec.ts` con crear con contexto y verlo en tarjeta, detalle y metadatos OG.

**Fuera de alcance:** editar tras publicar y vista previa (la HU-64 se rechazó).

---

### PROFILE-003 — Fijar una encuesta en mi perfil

**Historia (HU-68):** como autora, quiero fijar una de mis encuestas en lo alto de mi perfil para que sea lo primero que vean quienes me visitan.

- **Épica:** E16 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `backend`, `database`, `frontend`, `testing`, `area:perfil`
- **Dependencias:** PERF-009 [#334](https://github.com/migdlp/opinion-social-media/issues/334), que lleva el perfil a `get_poll_cards`.

**Decisiones fijadas (D-053)**
- Como máximo una encuesta fijada por perfil, y debe ser propia y `published`.
- Fijar otra sustituye a la anterior.
- Si la encuesta se borra (POLL-004), se suelta sola (`on delete set null`). Si se oculta por moderación, sigue referenciada pero nadie la ve.

**Backend**
- Migración `<ts>_profile_pinned_poll.sql`:
  - `alter table public.profiles add column pinned_poll_id uuid references public.polls(id) on delete set null`.
  - Sin `grant` de columna: no se lee ni se escribe directamente.
- `public.set_pinned_poll(p_poll_id uuid) returns void`: sólo `authenticated`. Con `null` se quita la fijada.
  - Errores: `AUTH_REQUIRED` → `PROFILE_REQUIRED` → `POLL_UNAVAILABLE` (inexistente, ajena u oculta, sin distinguir).
- Recrear `get_profile` añadiendo `pinned_poll_id uuid`, informado **sólo si** `can_view_author` es verdadero y la encuesta sigue `published`. Si no, `null`. `get_my_profile` también la devuelve.
- Adaptadores: `setPinnedPoll(supabase, pollId | null)`; `ProfileView.pinnedPollId?`.

**Interfaz**
- **Menú «Más opciones»** de las tarjetas **propias**, en cualquier lista o en el detalle:
  - **«Fijar en mi perfil»** si no es la fijada.
  - **«Quitar de mi perfil»** si lo es.
  - Al confirmarse se anuncia **«Encuesta fijada en tu perfil.»** o **«Encuesta quitada de tu perfil.»**
- **`/u/[username]`, pestaña Encuestas:**
  - Si hay `pinnedPollId`, la primera tarjeta es esa, pedida con `get_poll_cards`, con una etiqueta **«Fijada»** (icono de chincheta + texto) sobre la pregunta.
  - Esa encuesta se **excluye** de las páginas cronológicas para no repetirla: se filtra por id en cliente y en cada página.
  - Si `get_poll_cards` no devuelve la fijada (sin permiso), no se muestra nada especial.

**Criterios de aceptación**
- [ ] Fijar una encuesta propia la pone la primera en mi perfil, para mí y para visitantes, y no aparece repetida.
- [ ] Fijar otra sustituye a la anterior. Quitarla devuelve el orden cronológico.
- [ ] Fijar una ajena o inexistente da `POLL_UNAVAILABLE`.
- [ ] En una cuenta privada, un visitante sin permiso no recibe `pinned_poll_id`.
- [ ] Borrar la encuesta fijada deja el perfil sin fijada y sin errores.
- [ ] Teclado, 320 px y ambos temas.

**Pruebas (TDD)**
- SQL `<NNN>_pinned_poll.test.sql`.
- Vitest del menú y de la lista con fijada.
- E2E `e2e/fijar-encuesta.spec.ts`.

**Fuera de alcance:** varias fijadas, fijar encuestas ajenas y ordenar a mano.

---

### POLL-004 — Borrar una encuesta propia: backend

**Historia (HU-70):** como autora, quiero eliminar una encuesta mía para que deje de existir.

- **Épica:** E16 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `backend`, `database`, `security`, `testing`, `area:encuestas`
- **Dependencias:** ninguna.

**Decisiones fijadas (D-046)**
- El borrado es **físico e inmediato** de la fila de `polls`. Por cascada desaparecen opciones, votos, comentarios (y sus denuncias), guardados, descartes, denuncias de la encuesta, rankings y la referencia de fijada.
- No se puede borrar una encuesta oculta por moderación (`status = 'hidden'`), para conservar la evidencia.
- No hay papelera ni deshacer.

**Backend**
- Migración `<ts>_delete_my_poll.sql`: `public.delete_my_poll(p_poll_id uuid) returns void`. Sólo `authenticated` y `security definer`.
  - Errores: `AUTH_REQUIRED` → `POLL_UNAVAILABLE` (inexistente, ajena u oculta, sin distinguir).
  - Hace `delete from public.polls where id = p_poll_id and user_id = auth.uid() and status = 'published'`. Si borra 0 filas, `POLL_UNAVAILABLE`.
- Verificar con un test que **todas** las tablas que referencian `polls` tienen `on delete cascade` o `set null`. Si alguna no lo tiene, se corrige en esta migración.
- Documentar en [moderacion.md](../../moderacion.md) que la autora puede borrar sus encuestas publicadas y que las ocultas no se pueden borrar. Documentar en [inventario-tratamientos.md](../../legal/inventario-tratamientos.md) el nuevo borrado por la persona usuaria.
- Adaptador: `deleteMyPoll(supabase, pollId)` → `Result<void>`.

**Casos límite**
- Votos concurrentes durante el borrado: el voto falla con `POLL_UNAVAILABLE` o se borra con la cascada. Nunca queda un voto huérfano (test de concurrencia).
- Hoy no hay Storage en encuestas. Cuando MEDIA-002 lo añada, deberá borrar los objetos; se deja nota en MEDIA-002 [#289](https://github.com/migdlp/opinion-social-media/issues/289) con un comentario.

**Criterios de aceptación**
- [ ] La autora borra su encuesta publicada y después no queda ninguna fila relacionada en las tablas dependientes (comprobado tabla a tabla).
- [ ] Otra cuenta, `anon` o la autora con la encuesta oculta reciben `POLL_UNAVAILABLE` (o falta de permiso en `anon`) y no se borra nada.
- [ ] Con un voto concurrente no quedan huérfanos.

**Pruebas (TDD)**
- SQL `<NNN>_delete_my_poll.test.sql`, más concurrencia en `test:db:concurrency`.
- Ataque HTTP: borrar una ajena, `delete` directo sobre `polls` y borrar una oculta.

**Fuera de alcance:** la interfaz (POLL-005), borrado programado y archivado.

---

### POLL-005 — Borrar una encuesta propia: interfaz

**Historia (HU-70).**

- **Épica:** E16 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `frontend`, `design`, `testing`, `area:encuestas`
- **Dependencias:** POLL-004.

**Interfaz**
- **Menú «Más opciones»** de las tarjetas propias y del detalle propio: último elemento **«Eliminar encuesta»**, en el color de peligro de DESIGN.md.
- **Diálogo de confirmación** (`alertdialog`, foco inicial en «Cancelar»):
  - Título: **«¿Eliminar esta encuesta?»**
  - Texto: **«Se borrarán para siempre la encuesta, sus votos y sus comentarios. No se puede deshacer.»**
  - Botones: **«Cancelar»** y **«Eliminar»** (peligro).
- **Éxito:**
  - En una lista: la tarjeta desaparece y se anuncia **«Encuesta eliminada.»** por `aria-live`. El foco pasa a la tarjeta siguiente o, si no hay, al título de la lista.
  - En el detalle: se redirige a `/u/<mi usuario>` con el aviso **«Encuesta eliminada.»** en la parte superior (parámetro `?eliminada=1`, que se retira de la URL tras mostrarlo).
- **`POLL_UNAVAILABLE`:** **«Esta encuesta ya no está disponible.»** y se retira la tarjeta.
- **`NETWORK_ERROR`:** mensaje estándar. Antes de reintentar se comprueba si la encuesta sigue existiendo.

**Criterios de aceptación**
- [ ] Eliminar desde el perfil, el feed y el detalle funciona, y al recargar la encuesta no existe (404 en su URL).
- [ ] «Cancelar» y Escape no borran nada y devuelven el foco al menú.
- [ ] La opción no aparece en encuestas ajenas.
- [ ] Teclado, 320 px y ambos temas.

**Pruebas (TDD)**
- Vitest del diálogo y del manejo de errores.
- E2E `e2e/eliminar-encuesta.spec.ts`.

**Fuera de alcance:** borrado múltiple y papelera.
