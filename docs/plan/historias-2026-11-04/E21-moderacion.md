# E21 · Transparencia de moderación

**Issue de la épica:** [#350](https://github.com/migdlp/opinion-social-media/issues/350) · **Objetivo de la épica:** que quien denuncia sepa qué ha pasado con su denuncia, y que la autora de una encuesta retirada lo sepa, conozca el motivo y pueda reclamar una vez. La revisión sigue siendo manual por un operador de Supabase, sin panel de administración. Decisión aplicable: D-052. Reglas comunes en el [README](README.md).

| Tarea | Historia | Prioridad | Tamaño | Dependencias |
|---|---|---|---|---|
| [MOD-003](https://github.com/migdlp/opinion-social-media/issues/384) | HU-81 Estado de mis denuncias (backend) | P1 | M | — |
| [MOD-004](https://github.com/migdlp/opinion-social-media/issues/385) | HU-81 Estado de mis denuncias (interfaz) | P1 | S | MOD-003 |
| [MOD-005](https://github.com/migdlp/opinion-social-media/issues/386) | HU-82 Encuestas retiradas y reclamación (backend y aviso) | P1 | L | NOTIF-001 |
| [MOD-006](https://github.com/migdlp/opinion-social-media/issues/387) | HU-82 Encuestas retiradas y reclamación (interfaz) | P1 | M | MOD-005, NOTIF-003 |

Motivos y etiquetas comunes. Los códigos son los de las denuncias que ya existen; la etiqueta es el texto que ve la persona usuaria:

| Código | Etiqueta |
|---|---|
| `spam` | spam |
| `odio` | discurso de odio |
| `acoso` | acoso |
| `sexual` | contenido sexual |
| `violencia` | violencia |
| `otro` | incumplir las normas |

---

### MOD-003 — Estado de mis denuncias: backend

**Historia (HU-81):** como persona que ha denunciado contenido, quiero saber si mi denuncia está pendiente o ya se ha revisado.

- **Épica:** E21 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `backend`, `database`, `security`, `testing`, `area:moderacion`
- **Dependencias:** ninguna.

**Decisiones fijadas (D-052)**
- Hay tres estados:
  - `pending`: pendiente.
  - `actioned`: revisada y se tomaron medidas.
  - `dismissed`: revisada sin medidas.
- No se explica qué medida concreta se tomó ni se identifica al operador.
- El estado sólo lo cambia un operador por SQL, con un procedimiento documentado.

**Backend**
- Migración `<ts>_report_status.sql`, aplicada a `poll_reports`, `user_reports` y `comment_reports`:
  - `status text not null default 'pending' check (status in ('pending','actioned','dismissed'))`.
  - `reviewed_at timestamptz`.
  - `check ((status = 'pending') = (reviewed_at is null))`.
  - Las filas existentes quedan en `pending`.
- Función `public.list_my_reports(p_cursor text default null)`:
  - Devuelve `table (report_type text, target_label text, target_path text, reason text, created_at timestamptz, status text, reviewed_at timestamptz, cursor text)`.
  - Sólo `authenticated` y `security definer`. Error `AUTH_REQUIRED`.
  - Hace la unión de las tres tablas filtrada por `reporter_id = auth.uid()`.
  - `report_type` vale `poll`, `user` o `comment`.
  - `target_label` y `target_path` **sólo** se informan si quien llama puede ver ahora el objetivo. En cualquier otro caso, los dos son `null`:

    | `report_type` | `target_label` | `target_path` | Condición para verlo |
    |---|---|---|---|
    | `poll` | La pregunta | `/polls/<id>` | La encuesta es visible |
    | `user` | `@usuario` | `/u/<usuario>` | No hay bloqueo |
    | `comment` | Los primeros 80 caracteres del comentario | `/polls/<id>#comentario-<raíz o id>` | Pasa la comprobación de acceso de comentarios |

  - Orden `created_at desc, report_type asc, id desc`, 21 filas por página.
  - Cursor `<created_at UTC>|<tipo>|<id>`. Si es ilegible, `INVALID_CURSOR`.
  - Nunca devuelve `user_id` ni denuncias de otras personas.
- Actualizar [moderacion.md](../../moderacion.md) con el procedimiento para revisar una denuncia:

  ```sql
  update public.<tabla>_reports set status = 'actioned', reviewed_at = now() where id = '<id>' returning id, status;
  ```

  Incluir también la variante con `dismissed` y la regla de registrar la decisión en el issue de seguimiento.
- Actualizar `export_my_data` (ACCOUNT-003), si ya está en main, para que incluya `estado`.
- Adaptador: `listMyReports(cursor)` → `Result<{ items: MyReport[], nextCursor }>`.

**Criterios de aceptación**
- [ ] Una cuenta con una denuncia de cada tipo las recibe todas en orden.
- [ ] Si el operador cambia el estado de una, la lista lo refleja junto con `reviewed_at`.
- [ ] Una denuncia de una encuesta que después se oculta o se borra devuelve `target_label = null`. Si se borró, la denuncia desaparece por la cascada, como hoy.
- [ ] Una cuenta no ve nunca las denuncias de otra. `anon` no ejecuta la función. No se puede escribir `status` desde los clientes.
- [ ] El `check` impide `status = 'actioned'` sin `reviewed_at`.

**Pruebas (TDD)**
- SQL `<NNN>_report_status.test.sql`.
- Regresión de `015`, `032` y `033` (tests de denuncias).
- Ataque HTTP.

**Fuera de alcance:** la interfaz (MOD-004), avisos cuando cambia el estado y panel de administración.

---

### MOD-004 — Estado de mis denuncias: interfaz

**Historia (HU-81).**

- **Épica:** E21 · **Prioridad:** P1 · **Tamaño:** S
- **Etiquetas:** `frontend`, `design`, `testing`, `area:moderacion`
- **Dependencias:** MOD-003.

**Interfaz**
- Nueva sección **«Moderación»** en `/settings`, después de Privacidad, con el apartado **«Mis denuncias»** (ancla `#denuncias`).
- Muestra una lista paginada de 20 en 20, con «Cargar más». Cada fila tiene:
  - el tipo: **«Encuesta»**, **«Persona»** o **«Comentario»**;
  - el objetivo: el enlace con `target_label`, o **«Contenido no disponible»** si es `null`;
  - el motivo, con su etiqueta;
  - la fecha (`Intl.DateTimeFormat("es-ES", { dateStyle: "medium" })`);
  - un distintivo de estado:
    - `pending`: **«Pendiente de revisión»**.
    - `actioned`: **«Revisada: hemos tomado medidas»**.
    - `dismissed`: **«Revisada: no incumple las normas»**.
- **Estado vacío:** **«No has enviado ninguna denuncia.»**
- En los diálogos de denuncia existentes (encuesta, persona, comentario), el mensaje de éxito añade la frase **«Puedes consultar su estado en Ajustes → Mis denuncias.»**, con enlace a `/settings#denuncias`.

**Criterios de aceptación**
- [ ] Tras denunciar, la denuncia aparece como pendiente. Cuando un operador la revisa (en el test, con SQL de servicio), se ve el estado nuevo al recargar.
- [ ] Los objetivos no visibles aparecen como «Contenido no disponible», sin enlace.
- [ ] Funciona con teclado, a 320 px y en ambos temas.

**Pruebas (TDD)**
- Vitest: fila (los tres estados, con y sin objetivo) y mensaje de éxito.
- E2E: `e2e/mis-denuncias.spec.ts`.

**Fuera de alcance:** retirar una denuncia.

---

### MOD-005 — Encuestas retiradas y reclamación: backend y aviso

**Historia (HU-82):** como autora, quiero saber cuándo y por qué se ha retirado una encuesta mía y poder reclamar si creo que es un error.

- **Épica:** E21 · **Prioridad:** P1 · **Tamaño:** L
- **Etiquetas:** `backend`, `database`, `security`, `testing`, `area:moderacion`
- **Dependencias:** NOTIF-001, para el aviso `poll_hidden`.

**Decisiones fijadas (D-052)**
- Ocultar una encuesta exige un motivo de la lista común.
- La autora puede ver sus propias encuestas retiradas: sólo la pregunta, la fecha y el motivo, nunca los resultados.
- Se admite **una** reclamación por encuesta, con un texto de 10–1000 caracteres.
- El operador resuelve la reclamación por SQL:
  - Si la acepta: `status = 'published'` en la encuesta y `accepted` en la reclamación.
  - Si la rechaza: `rejected`.
- La encuesta retirada sigue sin poder borrarse (D-046).

**Backend**
- Migración `<ts>_moderation_appeals.sql`.
- Cambios en `polls`:
  - Columnas nuevas `hidden_at timestamptz` y `hidden_reason text check (hidden_reason is null or hidden_reason in ('spam','odio','acoso','sexual','violencia','otro'))`.
  - Rellenar las filas existentes: `update polls set hidden_reason = 'otro', hidden_at = now() where status = 'hidden'`.
  - Restricción `check (status <> 'hidden' or hidden_reason is not null)`.
  - Trigger `before update of status`:
    - Al pasar a `hidden`, fija `hidden_at = now()`.
    - Al volver a `published`, pone `hidden_at = null` y `hidden_reason = null`.
  - Sin `grant` de estas columnas a los clientes.
- Tabla `public.moderation_appeals`:
  - `poll_id uuid primary key references public.polls(id) on delete cascade`.
  - `user_id uuid not null references auth.users(id) on delete cascade`.
  - `message text not null check (char_length(message) between 10 and 1000)`.
  - `created_at timestamptz not null default now()`.
  - `status text not null default 'pending' check (status in ('pending','accepted','rejected'))`.
  - `reviewed_at timestamptz`.
  - RLS activada y sin permisos para los clientes.
- Función `public.get_my_hidden_polls() returns table (poll_id uuid, question text, hidden_at timestamptz, hidden_reason text, appeal_status text, appeal_created_at timestamptz)`:
  - Sólo `authenticated` y `security definer`. Error `AUTH_REQUIRED`.
  - Devuelve sólo encuestas propias con `status = 'hidden'`, ordenadas por `hidden_at desc`.
  - `appeal_status` es `null` si la encuesta no tiene reclamación.
- Función `public.appeal_poll_moderation(p_poll_id uuid, p_message text) returns void`:
  - Sólo `authenticated`.
  - Errores, en este orden:
    1. `AUTH_REQUIRED`.
    2. `POLL_UNAVAILABLE`: la encuesta no es propia o no está oculta.
    3. `APPEAL_INVALID` (código nuevo): el texto normalizado no tiene 10–1000 caracteres o contiene caracteres de control (salvo `\n` y `\t`).
    4. `ALREADY_APPEALED` (código nuevo).
- Aviso `poll_hidden`:
  - Recrear `list_notifications` y `count_unread_notifications` con las encuestas propias `hidden` cuyo `hidden_at` sea de los últimos 30 días.
  - `occurred_at = hidden_at`, `poll_question` informado y `detail = hidden_reason` (el código; la interfaz lo traduce).
- Actualizar [moderacion.md](../../moderacion.md): ocultar exige motivo (`update ... set status = 'hidden', hidden_reason = '<código>'`). Documentar también el procedimiento para aceptar y rechazar reclamaciones y la regla de registro.
- Actualizar `export_my_data` (ACCOUNT-003), si ya está en main, con `reclamaciones`.
- Adaptadores:
  - `getMyHiddenPolls()`.
  - `appealPollModeration(pollId, message)`.
  - Textos de los códigos nuevos:
    - `APPEAL_INVALID`: «La reclamación debe tener entre 10 y 1000 caracteres.»
    - `ALREADY_APPEALED`: «Ya has enviado una reclamación para esta encuesta.»

**Criterios de aceptación**
- [ ] Ocultar una encuesta sin motivo falla por la restricción. Con motivo, se fija `hidden_at` y la autora recibe `poll_hidden` con el motivo en `detail`.
- [ ] `get_my_hidden_polls` devuelve sólo las encuestas propias ocultas, sin ningún agregado.
- [ ] La reclamación se guarda una vez. Un segundo intento da `ALREADY_APPEALED` y otra cuenta recibe `POLL_UNAVAILABLE`.
- [ ] Volver a publicar la encuesta limpia `hidden_at` y `hidden_reason`, el aviso desaparece y deja de listarse como retirada.
- [ ] Las encuestas ocultas siguen sin ser visibles para nadie por las vías normales: se repiten los casos de `moderacion.md` y de MVP-021.

**Pruebas (TDD)**
- SQL `<NNN>_moderation_appeals.test.sql`.
- Regresión del test de moderación de encuestas.
- Ataque HTTP: ver encuestas retiradas ajenas, reclamar por otra cuenta y escribir `hidden_reason`.

**Fuera de alcance:** la interfaz (MOD-006), retirar comentarios con aviso y reclamar denuncias de personas.

---

### MOD-006 — Encuestas retiradas y reclamación: interfaz

**Historia (HU-82).**

- **Épica:** E21 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `frontend`, `design`, `testing`, `area:moderacion`
- **Dependencias:** MOD-005 y NOTIF-003. NOTIF-003 ya incluye el texto del aviso `poll_hidden`; si se implementa antes que esta tarea, comprobar que enlaza aquí.

**Interfaz**
- Apartado **«Encuestas retiradas»** en la sección Moderación de `/settings` (ancla `#retiradas`). Sólo se muestra si `getMyHiddenPolls` devuelve al menos una.
- Cada encuesta retirada muestra:
  - la pregunta, como texto, sin enlace porque la página da 404;
  - **«Retirada el {fecha} por {etiqueta del motivo}.»**;
  - el estado de la reclamación:
    - Sin reclamación: botón **«Reclamar»**.
    - `pending`: **«Reclamación enviada. La revisaremos manualmente.»**
    - `rejected`: **«Reclamación rechazada. La encuesta seguirá retirada.»**
  - Si la reclamación se acepta, la encuesta vuelve a publicarse y desaparece de esta lista.
- **«Reclamar»** abre un `dialog` con:
  - un `textarea` con la etiqueta **«Explica por qué crees que tu encuesta no incumple las normas»** y el contador **«{n} / 1000»**;
  - los botones **«Enviar reclamación»** y **«Cancelar»**.
  - Los errores se muestran en el propio campo y el texto se conserva.
  - Al terminar con éxito, se cierra y la fila pasa a pendiente con el anuncio **«Reclamación enviada.»**

**Criterios de aceptación**
- [ ] Con una encuesta propia oculta (en el test, con SQL de servicio), el apartado la muestra con su motivo y se puede reclamar una vez.
- [ ] Al recargar se ve el estado pendiente. Si el operador la rechaza, se ve el texto de rechazada.
- [ ] Sin encuestas retiradas, el apartado no aparece.
- [ ] El aviso `poll_hidden` en `/avisos` lleva a este apartado.
- [ ] Funciona con teclado, a 320 px y en ambos temas.

**Pruebas (TDD)**
- Vitest: apartado y diálogo.
- E2E: `e2e/encuesta-retirada.spec.ts`.

**Fuera de alcance:** conversación con el operador y adjuntos en la reclamación.
