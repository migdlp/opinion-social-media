# E20 · Cuenta y datos personales

**Issue de la épica:** [#349](https://github.com/migdlp/opinion-social-media/issues/349) · **Objetivo de la épica:** dar a cada persona control directo sobre su cuenta. Puede borrarla con todos sus datos, descargar una copia de lo que hay sobre ella y cerrar la sesión en todos sus dispositivos. Cubre los derechos de supresión y portabilidad del RGPD como autoservicio. Decisión aplicable: D-049. Reglas comunes en el [README](README.md).

**Coordinación legal:** LEGAL-003 [#250](https://github.com/migdlp/opinion-social-media/issues/250) define derechos, conservación y procedimiento. Estas tareas le dan la herramienta técnica, pero **no** redactan textos legales ni anuncian plazos. Al completarse, cada una deja un comentario en #250 con lo que ya cubre el autoservicio.

| Tarea | Historia | Prioridad | Tamaño | Dependencias |
|---|---|---|---|---|
| [ACCOUNT-001](https://github.com/migdlp/opinion-social-media/issues/380) | HU-77 Eliminar mi cuenta (backend) | **P0** | M | — |
| [ACCOUNT-002](https://github.com/migdlp/opinion-social-media/issues/381) | HU-77 Eliminar mi cuenta (interfaz) | **P0** | M | ACCOUNT-001 |
| [ACCOUNT-003](https://github.com/migdlp/opinion-social-media/issues/382) | HU-78 Descargar mis datos | **P0** | L | — |
| [AUTH-002](https://github.com/migdlp/opinion-social-media/issues/383) | HU-80 Cerrar sesión en todos los dispositivos | P1 | S | — |

**Regla permanente que nace aquí:** toda tarea futura que cree una tabla con datos de una persona debe cumplir dos condiciones. Primero, que la tabla se borre en cascada con `auth.users` (o se anonimice si hay motivo documentado). Segundo, añadirla a `export_my_data`. Se incorpora a las reglas comunes del [README](README.md).

---

### ACCOUNT-001 — Eliminar mi cuenta: backend

**Historia (HU-77):** como persona usuaria, quiero eliminar mi cuenta y todos mis datos de forma definitiva.

- **Épica:** E20 · **Prioridad:** P0 · **Tamaño:** M
- **Etiquetas:** `backend`, `database`, `security`, `auth`, `testing`
- **Dependencias:** ninguna.

**Decisiones fijadas (D-049)**
- El borrado es **inmediato e irreversible** y no tiene periodo de gracia.
- Se hace borrando la fila de `auth.users`. Todas las tablas que la referencian ya tienen `on delete cascade`, así que desaparecen:
  - perfil, encuestas (con sus opciones, votos ajenos y comentarios ajenos), votos, comentarios;
  - seguimientos, bloqueos, silencios, guardados, descartes;
  - denuncias hechas y recibidas, y eventos de cuota.
- Los totales de las encuestas ajenas en las que votó **bajan**.
- El `@usuario` queda **reservado 30 días**, para que nadie se haga pasar inmediatamente por la cuenta borrada.

**Backend**
- Migración `<ts>_delete_my_account.sql`.
- Tabla `public.released_usernames`:
  - Columnas: `username text primary key` (en minúsculas) y `released_at timestamptz not null default now()`.
  - RLS activada y sin permisos para clientes.
- Función `public.delete_my_account(p_confirm text) returns void`:
  - Sólo `authenticated`, `security definer` y `set search_path = ''`.
  - Orden de errores:
    1. `AUTH_REQUIRED`.
    2. `CONFIRMATION_MISMATCH` (código nuevo): `lower(p_confirm)` no coincide con el `@usuario` propio. Si la cuenta no tiene perfil, la confirmación esperada es el texto `eliminar`.
  - En la misma transacción:
    1. Si hay perfil, `insert into public.released_usernames (username) values (lower(usuario)) on conflict (username) do update set released_at = now()`.
    2. `delete from auth.users where id = auth.uid()`.
- Recrear `upsert_my_profile`: si el nombre pedido está en `released_usernames` con `released_at > now() - interval '30 days'`, devuelve `USERNAME_TAKEN`, el mismo código y texto de ahora, sin revelar el motivo.
- **Verificación previa obligatoria (RED):** el primer test comprueba en Supabase local que el propietario de la función puede borrar de `auth.users`.
  - Si **no** puede, no se busca una solución creativa. La tarea pasa a **Bloqueada** en #73 con la causa.
  - En ese caso hay una alternativa planificada: una acción de servidor que use `auth.admin.deleteUser` con una clave secreta sólo de servidor. Requiere que Codex /root añada esa variable en Vercel (D-VERCEL-001) y la tiene que aprobar el propietario.
- Un test recorre **todas** las tablas de `public` con una columna que referencia `auth.users` y comprueba que, tras el borrado, quedan 0 filas de la cuenta. Así detecta tablas futuras sin cascada.
- **Storage:** hoy no hay objetos por persona. AVATAR-002 [#252](https://github.com/migdlp/opinion-social-media/issues/252) y MEDIA-002 [#289](https://github.com/migdlp/opinion-social-media/issues/289) deben borrar sus objetos al eliminar la cuenta. Se deja un comentario en ambos issues.
- **Documentación:** se actualiza [inventario-tratamientos.md](../../legal/inventario-tratamientos.md) (supresión por autoservicio) y contratos-api.md.
- **Adaptador:** `deleteMyAccount(supabase, confirm)` → `Result<void>`. Texto de `CONFIRMATION_MISMATCH`: «Escribe exactamente tu usuario para confirmar.»

**Criterios de aceptación**
- [ ] Una cuenta con perfil, encuestas, votos, comentarios, relaciones, bloqueos y denuncias se borra y no queda ninguna fila suya en `public` ni en `auth.users`.
- [ ] Las encuestas ajenas que votó pierden su voto en el total.
- [ ] Una confirmación incorrecta da `CONFIRMATION_MISMATCH` y no borra nada.
- [ ] `anon` no ejecuta la función. Nadie puede borrar otra cuenta: la función no admite identidad.
- [ ] Durante 30 días otra cuenta no puede registrar ese `@usuario` (`USERNAME_TAKEN`). Pasado ese plazo sí puede (test con `released_at` manipulado).
- [ ] Tras el borrado, el JWT antiguo no puede crear, votar ni comentar: las RPC fallan por falta de perfil o de usuario.

**Pruebas (TDD)**
- SQL: `<NNN>_delete_my_account.test.sql`.
- Ataque HTTP: `tests/security/account-deletion-attacks.test.ts`.

**Fuera de alcance:** la interfaz (ACCOUNT-002), periodo de gracia, reactivación y anonimizar en lugar de borrar.

---

### ACCOUNT-002 — Eliminar mi cuenta: interfaz

**Historia (HU-77).**

- **Épica:** E20 · **Prioridad:** P0 · **Tamaño:** M
- **Etiquetas:** `frontend`, `design`, `auth`, `testing`
- **Dependencias:** ACCOUNT-001.

**Interfaz**
- Nuevo apartado **«Eliminar cuenta»** al final de **Ajustes → Cuenta**, con el ancla `#eliminar` y aspecto de zona de peligro (borde en el color de peligro).
- **Texto del apartado:** **«Se borrarán tu perfil, tus encuestas, tus votos, tus comentarios y tus relaciones. No se puede deshacer. Tu @usuario no estará disponible para nadie durante 30 días.»**
- Si ACCOUNT-003 está en main, se añade el enlace **«Antes, descarga una copia de tus datos»**, que lleva a `#descargar`.
- **Botón:** **«Eliminar mi cuenta»**. Abre un `alertdialog` con el foco en el campo:
  - Título: **«Eliminar tu cuenta para siempre»**.
  - Campo con etiqueta **«Escribe tu usuario ({usuario}) para confirmar»**. Si la cuenta no tiene perfil: **«Escribe ELIMINAR para confirmar»**.
  - Botón **«Eliminar definitivamente»**, desactivado hasta que el texto coincida sin distinguir mayúsculas.
  - Botón **«Cancelar»**.
- **Al confirmar:** la acción de servidor llama a `deleteMyAccount` y, si funciona:
  1. Ejecuta `supabase.auth.signOut()` según el patrón de cookies de AUTH-001 ([cookies-auth.md](../../cookies-auth.md)).
  2. Redirige a `/?cuenta=eliminada`.
  3. El feed muestra el aviso **«Tu cuenta se ha eliminado.»** y quita el parámetro de la URL.
- **Errores:**
  - Se muestran dentro del diálogo, que sigue abierto.
  - Ante `NETWORK_ERROR` hay que reconciliar: llamar a `get_my_profile`. Si devuelve `AUTH_REQUIRED` o `PROFILE_REQUIRED` porque el usuario ya no existe, se trata como un borrado con éxito.

**Criterios de aceptación**
- [ ] El flujo completo borra la cuenta, cierra la sesión y muestra el aviso. Al volver a entrar con Google se crea una cuenta nueva sin datos anteriores.
- [ ] Con un texto distinto, el botón sigue desactivado. «Cancelar» y Escape no hacen nada.
- [ ] Funciona con teclado, a 320 px y en ambos temas.

**Pruebas (TDD)**
- Vitest: el diálogo (activación del botón y textos).
- E2E: `e2e/eliminar-cuenta.spec.ts` con una cuenta sembrada desechable.

**Fuera de alcance:** encuestas de salida y correos de confirmación.

---

### ACCOUNT-003 — Descargar una copia de mis datos

**Historia (HU-78):** como persona usuaria, quiero descargar una copia de mis datos en un formato reutilizable.

- **Épica:** E20 · **Prioridad:** P0 · **Tamaño:** L
- **Etiquetas:** `backend`, `database`, `frontend`, `security`, `testing`
- **Dependencias:** ninguna. Se incluyen las tablas que existan en main al implementar. Las tareas posteriores amplían la exportación (regla permanente).

**Decisiones fijadas (D-049)**
- El formato es JSON UTF-8 con sangría de 2 espacios. Archivo: `opinion-datos-AAAA-MM-DD.json`.
- **Incluye** todos los datos **propios**. De otras personas sólo incluye su `@usuario`, cuando forma parte de una relación propia (a quién sigo, quién me sigue, a quién bloqueé o denuncié).
- **No incluye** agregados de encuestas, votos ajenos, comentarios ajenos ni quién ha bloqueado a la persona.
- Se puede pedir como mucho **una vez cada 10 minutos** por cuenta.

**Backend**
- Migración `<ts>_export_my_data.sql`.
- Tabla `public.data_export_events`:
  - Columnas: `user_id uuid references auth.users(id) on delete cascade` y `created_at timestamptz default now()`.
  - Índice `(user_id, created_at desc)`, RLS activada y sin permisos para clientes.
- Función `public.export_my_data() returns jsonb`:
  - Sólo `authenticated` y `security definer`.
  - Errores: `AUTH_REQUIRED` → `DATA_EXPORT_RATE_LIMITED` (código nuevo).
  - Toma un cerrojo por cuenta para que dos peticiones simultáneas no esquiven el límite.
  - Registra el evento.
- Estructura exacta. Las claves de tablas que todavía no existan en main se omiten:

```json
{
  "formato": "opinion-export",
  "version": 1,
  "generado_en": "<ISO 8601>",
  "cuenta": { "email": "...", "creada_en": "...", "proveedor": "google" },
  "perfil": { "usuario": "...", "nombre": "...", "bio": "...", "icono": "...", "privada": true,
              "visibilidad_votos": "private", "encuesta_fijada": "<uuid|null>" },
  "encuestas": [{ "id": "...", "pregunta": "...", "descripcion": "...", "categoria": "...",
                  "opciones": [{ "posicion": 1, "texto": "..." }], "creada_en": "...",
                  "cierra_en": "...", "estado": "published", "comentarios_activados": false }],
  "votos": [{ "encuesta_id": "...", "pregunta": "...", "opcion": "...", "votado_en": "..." }],
  "comentarios": [{ "id": "...", "encuesta_id": "...", "respuesta_a": null, "texto": "...",
                    "creado_en": "...", "estado": "published" }],
  "seguimientos": { "sigo": [{ "usuario": "...", "estado": "accepted", "desde": "..." }],
                    "me_siguen": [{ "usuario": "...", "estado": "pending", "desde": "..." }] },
  "bloqueadas": [{ "usuario": "...", "desde": "..." }],
  "silenciadas": [{ "usuario": "...", "desde": "..." }],
  "guardadas": [{ "encuesta_id": "...", "guardada_en": "..." }],
  "descartadas": [{ "encuesta_id": "...", "descartada_en": "..." }],
  "categorias_seguidas": [{ "categoria": "...", "desde": "..." }],
  "denuncias": { "encuestas": [{ "encuesta_id": "...", "motivo": "...", "detalle": "...", "creada_en": "...", "estado": "..." }],
                 "personas": [{ "usuario": "...", "motivo": "...", "detalle": "...", "creada_en": "...", "estado": "..." }],
                 "comentarios": [{ "comentario_id": "...", "motivo": "...", "detalle": "...", "creada_en": "...", "estado": "..." }] },
  "reclamaciones": [{ "encuesta_id": "...", "mensaje": "...", "creada_en": "...", "estado": "..." }]
}
```

- El email se lee de `auth.users`. Las cuentas de terceros que ya no existen no aparecen.
- **Interfaz:**
  - Apartado **«Descargar mis datos»** en **Ajustes → Cuenta**, con el ancla `#descargar`.
  - Texto: **«Recibirás un archivo JSON con tu perfil, encuestas, votos, comentarios, relaciones, ajustes y denuncias.»**
  - Botón **«Descargar mis datos»**: llama a una acción de servidor que devuelve el JSON y se descarga en el cliente con `Blob` y un enlace temporal. El archivo no se guarda en el servidor ni en Storage.
  - Mientras se prepara, el botón dice **«Preparando…»**. Al terminar se anuncia **«Descarga lista.»**
  - Texto de `DATA_EXPORT_RATE_LIMITED`: **«Ya has descargado tus datos hace poco. Inténtalo de nuevo en unos minutos.»**
- **Documentación:** actualizar el inventario legal (portabilidad por autoservicio).

**Criterios de aceptación**
- [ ] Con una cuenta sembrada con datos en todas las tablas, el JSON contiene exactamente los elementos esperados. El test compara con una muestra fija.
- [ ] El JSON no contiene `user_id` de terceros, votos ajenos, comentarios ajenos, agregados ni quién bloqueó a la cuenta.
- [ ] Una segunda petición antes de 10 minutos da `DATA_EXPORT_RATE_LIMITED`, también si llegan dos a la vez.
- [ ] `anon` no ejecuta la función.
- [ ] La descarga funciona en Chromium y WebKit (Playwright), con el nombre de archivo correcto.

**Pruebas (TDD)**
- SQL: `<NNN>_export_my_data.test.sql`.
- Concurrencia: con `test:db:concurrency`.
- Vitest: la acción y el botón.
- E2E: `e2e/descargar-datos.spec.ts`.

**Fuera de alcance:** otros formatos (CSV, ZIP), envío por email y exportación programada.

---

### AUTH-002 — Cerrar sesión en todos los dispositivos

**Historia (HU-80):** como persona usuaria, quiero cerrar mi sesión en todos mis dispositivos a la vez, por ejemplo si he usado un ordenador ajeno.

- **Épica:** E20 · **Prioridad:** P1 · **Tamaño:** S
- **Etiquetas:** `frontend`, `auth`, `security`, `testing`
- **Dependencias:** ninguna. Seguir el patrón de cookies y cierre de sesión de AUTH-001 ([cookies-auth.md](../../cookies-auth.md)).

**Decisiones fijadas**
- Se usa `supabase.auth.signOut({ scope: "global" })`, que revoca todos los *refresh tokens* de la cuenta.
- Los *access tokens* ya emitidos siguen siendo válidos hasta que caducan. La caducidad se configura en el proyecto; por defecto es 1 hora. Se le explica así a la persona usuaria.

**Interfaz**
- Apartado **«Sesiones»** en **Ajustes → Cuenta**:
  - Texto: **«Cierra tu sesión aquí y en cualquier otro dispositivo donde hayas entrado.»**
  - Botón **«Cerrar sesión en todos los dispositivos»**.
- El botón abre un `alertdialog` con el texto **«Se cerrará tu sesión en todos tus dispositivos. En los demás puede tardar hasta una hora en hacerse efectivo.»** y los botones **«Cancelar»** y **«Cerrar todas»**.
- Una acción de servidor ejecuta `signOut({ scope: "global" })`, limpia las cookies como el cierre de sesión normal y redirige a `/?sesion=cerrada`, donde se muestra el aviso **«Has cerrado la sesión en todos tus dispositivos.»**
- **Errores:** el mensaje estándar aparece dentro del diálogo y la sesión local sigue abierta.

**Criterios de aceptación**
- [ ] Con dos contextos de navegador con la misma cuenta, tras «Cerrar todas» en el primero:
  - el primero queda sin sesión;
  - el segundo no puede renovar su sesión: al forzar la renovación o pasado el tiempo de vida del token, queda sin sesión.
- [ ] «Cancelar» no hace nada.
- [ ] Funciona con teclado, a 320 px y en ambos temas.

**Pruebas (TDD)**
- Vitest: la acción, con el cliente simulado, comprueba que se llama con `scope: "global"`.
- E2E: `e2e/cerrar-sesiones.spec.ts` con dos contextos y Supabase local. Con un tiempo de vida corto configurado en local o forzando la renovación.

**Fuera de alcance:** lista de dispositivos y sesiones, y cerrar sólo una sesión concreta.
