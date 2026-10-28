# OPS-002 — Guía de validación con Google real en desarrollo

Tarea [OPS-002](https://github.com/migdlp/opinion-social-media/issues/195), reservada el 28-10-2026. Esta guía la ejecuta **una persona** (Google no se automatiza) contra el Supabase de **desarrollo** (`ltlrujmqenhktiilsnis`). Producción y Vercel no se tocan. Los resultados se anotan en la tabla final; con ellos se redacta el informe de cierre.

**Estado de partida (verificado el 28-10-2026):** dev tiene las 25 migraciones ([OPS-001](ops-001-integracion-dev.md)), Google activo y Email desactivado, 0 encuestas y 1 usuario. `main` incluye feed (V2-030..036), perfiles, seguimientos y `?elige=` (V2-052). **Todavía no existe `/settings` (V2-008, en curso por otro agente)**: la privacidad de una cuenta se cambia por SQL (paso 0.3) y el nombre público no es editable desde la interfaz.

## 0. Preparación (10 minutos)

1. **Dos cuentas de Google distintas** (A y B). Mientras la app de Google esté en modo *Testing*, ambas deben figurar en Google Cloud → Auth Platform → Audience → **Test users**; si no, Google bloquea el login.
2. **App local contra dev:**
   ```bash
   git checkout main && git pull
   npm ci
   cp .env.example .env.local     # ya apunta a dev; la clave publicable está en el panel: Project Settings → API Keys
   npm run check:env              # debe decir que apunta a desarrollo
   npm run build && npm run start # http://localhost:3000
   ```
   Usa el build de producción (`start`), no `dev`: así se prueba lo mismo que se desplegaría. Sin Docker ni Supabase local.
3. **SQL Editor de dev** abierto: <https://supabase.com/dashboard/project/ltlrujmqenhktiilsnis/sql/new>. Lo usarás para hacer privada la cuenta B y adelantar fechas. Nunca pegues claves en el chat.
4. Dos navegadores (o un perfil normal y una ventana de incógnito) para tener dos sesiones a la vez, y un móvil o la vista móvil de DevTools.

## 1. Cuenta nueva: login, onboarding y retorno (cuenta A)

| # | Pasos | Resultado esperado |
|---|---|---|
| 1.1 | Sin sesión, abre `/`. | Ves el feed (vacío) y «Iniciar sesión». Sin cifras de resultados. |
| 1.2 | Pulsa «Iniciar sesión» → Google → **cancela** en la pantalla de Google. | Vuelves a la app sin sesión y sin error técnico. |
| 1.3 | Repite y completa el login con la cuenta A. | Llegas a **/onboarding** (no tiene `@usuario`). No se publica ningún dato de Google. |
| 1.4 | Elige `@usuario` (p. ej. `val_a`). | Vuelves a la ruta previa con sesión. |
| 1.5 | Recarga la página y cierra/abre la pestaña. | La sesión persiste. |
| 1.6 | Cierra sesión. | Sin sesión; `/solicitudes` redirige al login. |

**Cuenta previa sin perfil:** haz lo mismo con la cuenta B y no elijas `@usuario` en el paso 1.4: cierra la pestaña en `/onboarding`. Al volver a `/`, intenta votar o crear: debe llevarte otra vez al onboarding, sin voto ni encuesta.

## 2. La elección sobrevive al login (V2-033 / V2-052)

Necesitas una encuesta: con la cuenta A, `/create` → pregunta «¿Tortilla con o sin cebolla?», 2 opciones, cierre «Sin cierre» → Publicar. Cierra sesión.

| # | Pasos | Resultado esperado |
|---|---|---|
| 2.1 | Sin sesión, abre la encuesta, elige una opción y pulsa «Votar». | Aviso «Inicia sesión para votar». **No hay voto.** |
| 2.2 | «Iniciar sesión» → Google (cuenta B, con `@usuario`; si no tiene, elígelo aquí: debe pasar por onboarding y volver). | Vuelves a la encuesta con **la misma opción marcada** y la URL contiene `?elige=<uuid>`. Sigue sin haber voto. |
| 2.3 | Pulsa «Votar». | Ves tus resultados y «Tu voto». |
| 2.4 | Recarga y abre la encuesta desde otro navegador con la misma cuenta B. | Resultados visibles, voto único (no puedes votar de nuevo). |
| 2.5 | Edita la URL: `?elige=zzz` o el UUID de otra encuesta. | Se ignora sin error. |
| 2.6 | En DevTools → Application: Local Storage y Session Storage. | No hay ninguna clave con la opción elegida. |

## 3. Regla crítica en dos sesiones

Con la cuenta A (autora) y la B en navegadores distintos, crea una encuesta nueva con A y **no votes con A**.

| # | Pasos | Resultado esperado |
|---|---|---|
| 3.1 | Con A, abre su propia encuesta y mira el feed. | Solo opciones: **ni porcentajes ni conteos**, tampoco para la autora. |
| 3.2 | Sin sesión, ver código fuente de `/` y de la encuesta; busca `percentage` y `totalVotes`. | No aparecen. |
| 3.3 | Con B vota; con A sigue sin votar. | B ve resultados; A sigue sin verlos. |
| 3.4 | A vota. | A ve los resultados. |

## 4. Cuenta privada, solicitudes y permisos (A y B)

1. En el SQL Editor, haz privada a A (sustituye por su `@usuario`):
   ```sql
   update public.profiles set is_private = true where username = 'val_a';
   ```
2. Con B abre `/u/val_a`. **Esperado:** solo la cabecera y «Esta cuenta es privada…»; sin encuestas ni votos de A. Las encuestas de A no aparecen en el feed de B ni por su URL directa (404).
3. B pulsa «Seguir». **Esperado:** el botón pasa a «Solicitado» (cuenta privada).
4. Con A, abre `/solicitudes`. Primero **rechaza** la solicitud de B. B sigue sin ver nada. B vuelve a pulsar «Seguir».
5. A **acepta**. **Esperado:** B ve las encuestas de A y su feed las incluye; A ve a B en «Seguidores».
6. Con A, en `/u/val_a/seguidores`, «Eliminar» a B y confirma. **Esperado:** B pierde el acceso de inmediato.
7. Vuelve a dejar pública a A: `update public.profiles set is_private = false where username = 'val_a';` y comprueba que B ve `/u/val_a` sin seguirla.

## 5. Feed, categorías, cierre y retención de 24 h

Con A, crea dos encuestas con categoría (p. ej. Deportes y Sin categoría). En el feed comprueba:

- Las pestañas y el filtro de categoría muestran solo lo esperado.
- Con muchas encuestas se carga más al hacer scroll y existe el botón alternativo «Cargar más».
- Una encuesta de A con cierre: crea una con «Cierre: 1 hora» (mínimo permitido) y vota con B.

**Cierre y borde de 24 h sin esperar** (fechas de fixtures, no se cambia ningún reloj). En el SQL Editor, para la encuesta con cierre (sustituye el texto de la pregunta):

```sql
-- 5.1 Cerrada hace 1 minuto: sigue en el feed con resultados visibles para todos, sin poder votar.
update public.polls set created_at = now() - interval '3 days', closes_at = now() - interval '1 minute'
 where question = 'TU PREGUNTA CON CIERRE';
-- 5.2 Cerrada hace 23 h 59 min: aún en el feed.
update public.polls set closes_at = now() - interval '23 hours 59 minutes' where question = 'TU PREGUNTA CON CIERRE';
-- 5.3 Cerrada hace 24 h 1 min: sale del feed, pero la URL directa sigue funcionando y se ven los resultados.
update public.polls set closes_at = now() - interval '24 hours 1 minute' where question = 'TU PREGUNTA CON CIERRE';
```

Tras cada `update`, recarga el feed y la URL de la encuesta con A, con B y sin sesión. **Esperado:** 5.1 y 5.2 en el feed y resultados visibles (excepción D-020 de las cerradas); 5.3 fuera del feed y accesible por enlace; en todos los casos «Votar» no está disponible.

## 6. Sesiones, logout y red

1. Cierra sesión con B: `/solicitudes` redirige al login y el contenido privado de A deja de verse. Pulsa «Atrás»: no debe mostrar datos privados.
2. En DevTools → Network, filtra por `rest/v1` y `rpc`: ninguna respuesta de encuesta abierta sin voto contiene `percentage`/`totalVotes`. Mira también Cookies: solo las de sesión de Supabase.
3. Redirecciones: abre `/login?next=https://ajeno.example` y `/login?next=//ajeno.example`, e inicia sesión. **Esperado:** acabas en `/`, nunca en el sitio ajeno.
4. Abre la encuesta en una pestaña con sesión, cierra sesión en otra y pulsa «Votar» en la primera. **Esperado:** pide iniciar sesión, sin error técnico y sin voto.

## 7. Rendimiento del feed (lo hace el agente, no tú)

Con permiso de escritura en dev, el agente sembrará ≥1000 encuestas y 50 relaciones aisladas (prefijo `[fixture OPS-002]`), guardará `EXPLAIN ANALYZE` del feed en este documento y borrará los datos. Lo anunciará en [#73](https://github.com/migdlp/opinion-social-media/issues/73) antes de empezar; mientras dure, no uses dev para otra cosa.

## Cómo informar

Rellena la tabla (OK / fallo + qué viste, sin pegar tokens ni cookies) y pásasela al agente:

| Bloque | Resultado | Notas |
|---|---|---|
| 1 Login, cancelación y onboarding | | |
| 2 Elección tras el login | | |
| 3 Regla crítica | | |
| 4 Privacidad y solicitudes | | |
| 5 Feed, cierre y 24 h | | |
| 6 Sesiones y redirecciones | | |

## Limpieza al terminar

```sql
delete from public.polls where question like '[fixture OPS-002]%';
```

Las encuestas y cuentas de prueba creadas a mano pueden borrarse igual por usuario (`delete from auth.users where email = '…'`, que arrastra su perfil y votos). Hazlo solo cuando el informe esté cerrado.
