# E17 · Personas

**Issue de la épica:** [#346](https://github.com/migdlp/opinion-social-media/issues/346) · **Objetivo de la épica:** encontrar a otras personas por su nombre y poder dejar de ver a alguien sin llegar a bloquearlo. Decisión aplicable: D-050 (silenciar). Reglas comunes en el [README](README.md).

| Tarea | Historia | Prioridad | Tamaño | Dependencias |
|---|---|---|---|---|
| [SEARCH-003](https://github.com/migdlp/opinion-social-media/issues/371) | HU-71 Buscar personas (backend) | P1 | M | — |
| [SEARCH-004](https://github.com/migdlp/opinion-social-media/issues/372) | HU-71 Buscar personas (interfaz) | P1 | M | SEARCH-003 |
| [SOCIAL-003](https://github.com/migdlp/opinion-social-media/issues/373) | HU-79 Silenciar cuentas (backend) | P1 | M | — |
| [SOCIAL-004](https://github.com/migdlp/opinion-social-media/issues/374) | HU-79 Silenciar cuentas (interfaz) | P1 | M | SOCIAL-003, PERF-005 #330 |

---

### SEARCH-003 — Buscar personas: backend

**Historia (HU-71):** como persona que usa Opinión, quiero buscar a otras personas por su `@usuario` o su nombre para encontrar sus perfiles y seguirlas.

- **Épica:** E17 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `backend`, `database`, `security`, `testing`, `area:busqueda`
- **Dependencias:** ninguna.

**Decisiones fijadas**
- Sólo se busca sobre datos que ya son públicos: `username`, `display_name`, `avatar_icon` e `is_private`.
- Las cuentas privadas **sí** aparecen, para que se pueda solicitar seguimiento. Las cuentas con bloqueo en cualquier sentido no aparecen.
- No exige sesión.
- No se usa ningún servicio externo.

**Backend**
- Migración `<ts>_search_users.sql`: índices GIN `pg_trgm` (en el esquema `extensions`, como `polls_question_trgm_idx`) sobre `lower(username)` y `lower(display_name)`.
- `public.search_users(p_query text, p_cursor text default null) returns table (username text, display_name text, avatar_icon text, is_private boolean, cursor text)`: `stable`, `security definer` y `EXECUTE` para `anon` y `authenticated`.
- **Consulta:**
  - Se recorta y se colapsan los espacios. Si empieza por `@`, se quita esa `@`.
  - Debe quedar entre 2 y 30 caracteres; si no, `INVALID_QUERY`.
  - Se escapan `%`, `_` y `\`.
- **Coincidencia y rango:**
  - 0: `lower(username) = lower(q)`.
  - 1: `lower(username) like lower(q) || '%'`.
  - 2: `lower(display_name) like '%' || lower(q) || '%'`, o `lower(username) like '%' || lower(q) || '%'`.
  - Cada perfil aparece una vez, con su rango más bajo.
- **Exclusiones:** perfiles con bloqueo en cualquier sentido respecto a `auth.uid()`, cuando hay sesión.
- **Orden y paginación:** `rango asc, lower(username) asc`, 21 filas (20 + 1). Cursor `<rango>|<usuario en minúsculas>|<md5 de la consulta normalizada>`; uno de otra búsqueda o ilegible es `INVALID_CURSOR`.
- Nunca devuelve `user_id`, `bio` ni ningún dato que no sea público.
- Adaptador: `searchUsers(supabase, query, cursor)` → `Result<{ users: UserHit[], nextCursor }>`.

**Criterios de aceptación**
- [ ] Con `ana`, `anabel`, `juana` y «Ana López» (`@lopez`), la consulta `ana` devuelve `ana` (0), `anabel` (1) y después `juana` y `lopez` (2) en orden alfabético.
- [ ] `@ana` equivale a `ana`. `a` y una consulta de 31 caracteres dan `INVALID_QUERY`. `%` busca el carácter literal.
- [ ] Una cuenta que me bloqueó, o que bloqueé, no aparece. Una privada sí, con `is_private = true`.
- [ ] Rendimiento: con 10 000 perfiles, menos de 20 ms en local. Medido en la PR.

**Pruebas (TDD)**
- SQL `<NNN>_search_users.test.sql`.
- Ataque HTTP: comprobar que no se filtran `user_id` ni `bio`, y que no aparecen cuentas bloqueadas.

**Fuera de alcance:** la interfaz (SEARCH-004), sugerencias de personas y autocompletado.

---

### SEARCH-004 — Buscar personas: interfaz

**Historia (HU-71).**

- **Épica:** E17 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `frontend`, `design`, `testing`, `area:busqueda`
- **Dependencias:** SEARCH-003.

**Interfaz**
- En `/search`, bajo el campo de búsqueda, se añaden dos pestañas: **«Encuestas»** (inicial) y **«Personas»**. Usan el patrón `tablist`.
- La pestaña elegida se guarda en la URL como `?q=…&tipo=personas`. Sin `tipo`, se muestra Encuestas.
- El campo de búsqueda es el mismo para las dos. Al cambiar de pestaña se conserva `q`.
- **Resultados de Personas:** una lista de filas. Cada fila enlaza a `/u/[username]` y muestra:
  - el `Avatar` (40 px);
  - el nombre visible, o el `@usuario` si no tiene nombre;
  - el `@usuario` en color secundario;
  - si la cuenta es privada, un icono de candado con el texto **«Privada»**.
- Debajo, el botón **«Cargar más»**, igual que en las encuestas.
- **Estados:**
  - Sin consulta: **«Escribe al menos 2 caracteres para buscar personas.»**
  - Sin resultados: **«No hemos encontrado a nadie con «{q}».»**
  - Error: mensaje estándar con **«Reintentar»**.
- El placeholder del campo pasa a ser **«Busca encuestas o personas»**.

**Criterios de aceptación**
- [ ] Buscar `@ana` en la pestaña Personas muestra los resultados en el orden del backend y lleva al perfil.
- [ ] Ir atrás y adelante en el navegador conserva la pestaña y la consulta.
- [ ] Una cuenta privada se muestra con «Privada».
- [ ] Teclado completo, 320 px y ambos temas.

**Pruebas (TDD)**
- Vitest de las pestañas y de las filas de resultado.
- E2E: ampliar `e2e/busqueda.spec.ts`.

**Fuera de alcance:** botón Seguir en los resultados e historial de búsquedas.

---

### SOCIAL-003 — Silenciar cuentas: backend

**Historia (HU-79):** como persona con sesión, quiero silenciar a alguien para dejar de ver sus encuestas en mi feed sin bloquearlo ni que se entere.

- **Épica:** E17 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `backend`, `database`, `security`, `testing`, `area:moderacion`
- **Dependencias:** ninguna. Si TREND-001 o NOTIF-001 ya están en main, se incluye aquí su filtro.

**Decisiones fijadas (D-050)**
- Silenciar oculta, **sólo a quien silencia**, las encuestas de la cuenta silenciada en:
  - `get_feed`, en Recientes y en Siguiendo;
  - `get_ranked_feed`, en todas sus secciones;
  - los avisos de E18 en los que esa cuenta sea la autora del aviso.
- **No** afecta a la búsqueda, al perfil, al enlace directo, a los comentarios, al seguimiento ni a ningún permiso.
- La cuenta silenciada no recibe ninguna señal de que la han silenciado.

**Backend**
- Migración `<ts>_user_mutes.sql`:
  - Tabla `public.user_mutes (muter_id uuid not null references auth.users(id) on delete cascade, muted_id uuid not null references auth.users(id) on delete cascade, created_at timestamptz not null default now(), primary key (muter_id, muted_id), check (muter_id <> muted_id))`.
  - RLS activada y sin permisos para los clientes.
- **RPC**, todas sólo para `authenticated`. Siguen el patrón de `block_user`, `unblock_user` y `list_blocked_users`:
  - `mute_user(p_username)`: los errores se comprueban en el orden `AUTH_REQUIRED` → `PROFILE_REQUIRED` → `USER_NOT_FOUND` (cuenta inexistente o con bloqueo en cualquier sentido) → `CANNOT_MUTE_SELF` (código nuevo). Es idempotente.
  - `unmute_user(p_username)`: es idempotente.
  - `list_muted_users(p_cursor)`: devuelve `username`, `display_name` y `cursor`, con la misma paginación que la lista de bloqueados.
- Recrear `get_feed` añadiendo `and not exists (select 1 from public.user_mutes m where m.muter_id = auth.uid() and m.muted_id = p.user_id)`. Hacer lo mismo en `get_ranked_feed` y en `list_notifications` si ya existen en main.
- Recrear `get_profile` añadiendo `is_muted boolean`. Sólo es verdadero cuando quien llama tiene silenciada esa cuenta; en cualquier otro caso es `false`.
- **Adaptadores:**
  - `muteUser` y `unmuteUser` → `Result<void>`.
  - `listMutedUsers(cursor)` → `Result<FollowPage>`.
  - `ProfileView.isMuted`.
  - Texto de `CANNOT_MUTE_SELF`: «No puedes silenciarte a ti mismo.»

**Criterios de aceptación**
- [ ] Si silencio a B:
  - sus encuestas desaparecen de mi Recientes y de mi Siguiendo, aunque la siga;
  - siguen apareciendo en su perfil, en la búsqueda y en su enlace directo;
  - el seguimiento entre las dos cuentas no cambia.
- [ ] B no puede saber que la he silenciado: ni sus RPC, ni las listas, ni `get_profile` desde su sesión lo revelan.
- [ ] Al dejar de silenciarla, todo vuelve a aparecer. Repetir cualquiera de las dos operaciones no da error.
- [ ] Silenciarme a mí misma da `CANNOT_MUTE_SELF`. Silenciar una cuenta bloqueada da `USER_NOT_FOUND`.
- [ ] Con `anon` no se pueden ejecutar las RPC, y ningún cliente puede leer la tabla.

**Pruebas (TDD)**
- SQL `<NNN>_user_mutes.test.sql`.
- Ataque HTTP en `tests/security/mutes-attacks.test.ts`.

**Fuera de alcance:** la interfaz (SOCIAL-004), silenciar palabras o categorías y silencios temporales.

---

### SOCIAL-004 — Silenciar cuentas: interfaz

**Historia (HU-79).**

- **Épica:** E17 · **Prioridad:** P1 · **Tamaño:** M
- **Etiquetas:** `frontend`, `design`, `testing`, `area:moderacion`
- **Dependencias:** SOCIAL-003 y PERF-005 [#330](https://github.com/migdlp/opinion-social-media/issues/330).

**Interfaz**
- **Perfil ajeno con sesión:** en el menú de acciones del perfil, donde ya están Bloquear y Denunciar, se añade **«Silenciar»**, o **«Dejar de silenciar»** si `isMuted` es verdadero.
  - No pide confirmación.
  - Al silenciar se anuncia **«Has silenciado a @{usuario}. No verás sus encuestas en tu feed.»**
  - Mientras está silenciada, bajo la cabecera del perfil aparece la franja **«Has silenciado esta cuenta.»** con el botón **«Dejar de silenciar»**.
- **Tarjetas del feed (`/`):** en el menú «Más opciones» de las tarjetas ajenas se añade **«Silenciar a @{usuario}»**.
  - Al pulsarlo, esa tarjeta y las demás de la misma cuenta que estén en pantalla se sustituyen por el bloque **«Has silenciado a @{usuario}.»** con el botón **«Deshacer»**. Es el mismo patrón que el descarte de FEED-004.
- **Ajustes → Privacidad:** nuevo apartado **«Cuentas silenciadas»**, con ancla `#silenciadas`. Muestra la lista con el botón **«Dejar de silenciar»**.
  - Estado vacío: **«No has silenciado ninguna cuenta.»**
  - Texto de ayuda: **«Silenciar oculta sus encuestas en tu feed. No bloquea ni avisa a la otra persona.»**

**Criterios de aceptación**
- [ ] Silenciar desde el perfil y desde una tarjeta oculta sus encuestas del feed al recargar. «Deshacer» y Ajustes lo revierten.
- [ ] La opción no aparece en el perfil propio ni para visitantes.
- [ ] La franja del perfil y los textos son los de la ficha.
- [ ] Funciona con teclado, a 320 px y en ambos temas.

**Pruebas (TDD)**
- Vitest del menú, la franja del perfil y el apartado de Ajustes.
- E2E `e2e/silenciar.spec.ts`.

**Fuera de alcance:** silenciar desde los comentarios.
