# E19 · Conversación

**Issue de la épica:** [#348](https://github.com/migdlp/opinion-social-media/issues/348) · **Objetivo de la épica:** permitir responder a un comentario concreto con un solo nivel de respuestas, sin convertir el debate en hilos infinitos. Decisión aplicable: D-048, que matiza D-036. Reglas comunes en el [README](README.md).

| Tarea | Historia | Prioridad | Tamaño | Dependencias |
|---|---|---|---|---|
| [CMT-004](https://github.com/migdlp/opinion-social-media/issues/378) | HU-76 Respuestas a comentarios (backend y aviso) | P1 | L | NOTIF-001 |
| [CMT-005](https://github.com/migdlp/opinion-social-media/issues/379) | HU-76 Respuestas a comentarios (interfaz) | P1 | M | CMT-004 |

---

### CMT-004 — Respuestas a comentarios: backend y aviso

**Historia (HU-76):** como persona que participa en el debate, quiero responder a un comentario concreto, y que su autora se entere.

- **Épica:** E19 · **Prioridad:** P1 · **Tamaño:** L
- **Etiquetas:** `backend`, `database`, `security`, `testing`, `area:comentarios`
- **Dependencias:** NOTIF-001, para el aviso `comment_reply`.

**Decisiones fijadas (D-048)**
- Hay un solo nivel de respuestas. Si se responde a una respuesta, la nueva se cuelga del **comentario raíz**.
- Una respuesta cumple las mismas reglas que un comentario:
  - acceso, voto previo en las abiertas, debate activado, bloqueos y moderación;
  - entre 1 y 1000 caracteres;
  - el mismo límite compartido de 10 por minuto.
- Si la raíz está oculta por moderación, sus respuestas tampoco se pueden leer, aunque su `status` siga siendo `published`.
- El aviso sólo lo recibe la autora del comentario raíz, y nunca por sus propias respuestas.

**Backend**
- Migración `<ts>_comment_replies.sql`:
  - Añadir la columna `alter table public.comments add column parent_id uuid references public.comments(id) on delete cascade`.
  - Añadir el `check` correspondiente.
  - Crear el índice `comments (parent_id, created_at, id) where parent_id is not null`.
- Recrear `public.add_comment(p_poll_id uuid, p_body text, p_parent_id uuid default null) returns uuid`. Antes hay que borrar la firma de 2 argumentos.
  - Si se pasa `p_parent_id`, el comentario padre debe existir, pertenecer a la misma encuesta, estar `published` y ser visible para quien llama con la misma comprobación que `list_comments`. Si no se cumple, se devuelve `COMMENT_UNAVAILABLE`.
  - Se guarda `parent_id = coalesce(padre.parent_id, padre.id)`, de modo que siempre apunta a la raíz.
  - El orden de errores es el de `add_comment` con `COMMENT_UNAVAILABLE` añadido justo después de `VOTE_REQUIRED`.
- Recrear `public.list_comments` con dos cambios:
  - Sólo devuelve comentarios raíz (`parent_id is null`).
  - Añade la columna `reply_count integer`: el número de respuestas `published` que quien llama puede ver, es decir, descontando las de cuentas con bloqueo con quien lee o con la autora de la encuesta.
- Crear `public.list_replies(p_comment_id uuid, p_cursor text default null) returns table (comment_id uuid, username text, display_name text, body text, created_at timestamptz, cursor text)`.
  - Es ejecutable por `anon`, porque las encuestas cerradas son públicas.
  - Aplica el mismo acceso que `list_comments` sobre la encuesta de la raíz. Si la raíz no existe, está oculta o no es visible, devuelve `COMMENT_UNAVAILABLE`.
  - Orden **ascendente** `created_at asc, id asc`, 21 filas por página.
  - El cursor es `<created_at UTC>|<id>`, y uno ilegible da `INVALID_CURSOR`.
  - Omite las respuestas de cuentas con bloqueo y las ocultas.
- `report_comment` funciona igual sobre las respuestas. Comprobarlo en los tests.
- Aviso `comment_reply`: recrear `list_notifications` y `count_unread_notifications` con la nueva rama.
  - Incluye las respuestas `published` cuya raíz es de `auth.uid()`, escritas por otra cuenta, de los últimos 30 días y visibles para mí con la función de acceso de comentarios.
  - Excluye las cuentas con bloqueo y las silenciadas.
  - `ref` es el id de la respuesta y `comment_id` es el id de la **raíz** (mi comentario). Se informan `actor_*`, `poll_id` y `poll_question`.
- Adaptadores:
  - `addComment(supabase, pollId, body, parentId?)`.
  - `listReplies(supabase, commentId, cursor)` → `Result<CommentPage>`.
  - `Comment.replyCount`.

**Criterios de aceptación**
- [ ] Responder a una raíz guarda `parent_id` igual a la raíz. Responder a una respuesta también guarda la raíz.
- [ ] Un padre de otra encuesta, uno oculto, uno de una cuenta bloqueada o con el debate apagado devuelve `COMMENT_UNAVAILABLE` (o `COMMENTS_DISABLED` si es eso lo que falla primero).
- [ ] `list_comments` ya no devuelve respuestas, y `reply_count` coincide con lo que devuelve `list_replies` para ese mismo lector.
- [ ] Ocultar la raíz hace que `list_replies` devuelva `COMMENT_UNAVAILABLE`.
- [ ] El límite de 10 por minuto se comparte entre comentarios y respuestas, también cuando las peticiones son concurrentes.
- [ ] La autora de la raíz recibe `comment_reply`. Responderse a sí misma no genera aviso. Con bloqueo, tampoco.

**Pruebas (TDD)**
- SQL: `<NNN>_comment_replies.test.sql`.
- Regresión: volver a pasar `031_comments` y `033_comment_reports`.
- Ataque HTTP: añadir casos en `tests/security/social-attacks.test.ts`.

**Fuera de alcance:** la interfaz (CMT-005), menciones con notificación, likes y edición.

---

### CMT-005 — Respuestas a comentarios: interfaz

**Historia (HU-76).**

- **Épica:** E19 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `frontend`, `design`, `accessibility`, `testing`, `area:comentarios`
- **Dependencias:** CMT-004.

**Interfaz**
- **Botón «Responder»:** cada comentario raíz de `CommentList` lo muestra en texto pequeño, sólo si quien mira puede comentar (las mismas condiciones que el formulario actual).
  - Al pulsarlo, se abre bajo el comentario un `CommentForm` en línea con placeholder **«Escribe una respuesta»** y los botones **«Responder»** y **«Cancelar»**.
  - El foco va al `textarea`. Sólo puede haber un formulario abierto a la vez.
- **Desplegar respuestas:** si `replyCount > 0`, aparece el enlace **«Ver 1 respuesta»** o **«Ver {n} respuestas»**.
  - Al pulsarlo se cargan con `listReplies`, se muestran en orden cronológico y el enlace pasa a ser **«Ocultar respuestas»**.
  - Si hay más de 20, se pagina con **«Ver más respuestas»**.
- **Aspecto de las respuestas:** van indentadas un nivel, con un borde izquierdo de 2 px en color secundario y avatares de 24 px.
- **Responder a una respuesta:** la respuesta también tiene botón **«Responder»**.
  - El formulario se abre bajo el bloque de respuestas de la raíz, con el `textarea` precargado con **«@{usuario} »**.
  - Se publica con el `parentId` de la respuesta y el backend la cuelga de la raíz.
- **Tras publicar:** la respuesta aparece al final del bloque desplegado, el contador se incrementa y se anuncia **«Respuesta publicada.»**
- **Enlace desde un aviso:** cada comentario raíz tiene el ancla `id="comentario-<id>"`.
  - Si la URL llega con `#comentario-<id>` de una raíz, se hace scroll hasta ella y se despliegan sus respuestas automáticamente.
- **Errores:** se muestran junto al formulario, con los textos de cada código. El texto escrito no se pierde.
- **Denunciar:** está disponible en las respuestas con el diálogo que ya existe.

**Criterios de aceptación**
- [ ] Responder a un comentario hace que la respuesta aparezca desplegada. Al recargar, el contador es correcto.
- [ ] Responder a una respuesta la publica en el mismo bloque, con la mención precargada.
- [ ] Al abrir el enlace del aviso se llega al comentario con sus respuestas desplegadas.
- [ ] El visitante, o quien no ha votado en una abierta, ve las respuestas sólo si ya puede leer el debate, y nunca ve el botón «Responder» si no puede comentar.
- [ ] Funciona con teclado y con foco gestionado, a 320 px sin desbordamiento por la indentación, y en ambos temas.

**Pruebas (TDD)**
- Vitest de `CommentList`: desplegar, responder, precarga de la mención y ancla.
- E2E: ampliar `e2e/comentarios.spec.ts`.

**Fuera de alcance:** respuestas anidadas de más de un nivel y autocompletar menciones.
