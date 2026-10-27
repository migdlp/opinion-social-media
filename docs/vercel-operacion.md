# Vercel: responsable y operación

**Codex /root (opinion_social_media)** se encarga de MVP-008 y de coordinar MVP-048/049/050/051 mediante la conexión autorizada del propietario `migdlp`, OWNER de «Miguel's projects». La autorización incluye configurar Vercel y resolver bloqueos; cada tarea conserva sus dependencias y criterios de aceptación.

Antes de trabajar, actualizar `main` y consultar [tareas y responsables](tareas-futuras.md). Las reservas y cambios de estado se publican en commits exclusivos directamente a `main`; el resto sigue rama → PR → comprobaciones → merge, según [AGENTS.md](../AGENTS.md).

## Proyecto y acceso

| Recurso | Identificación |
|---|---|
| Panel | [opinion-social-media](https://vercel.com/miguels-projects-b8307fdb/opinion-social-media) |
| Proyecto | `prj_tUC8ZwzxHISZkmzMKd2z2UmVcN5E` |
| Equipo | «Miguel's projects», `team_Iu3JavtCo0Kv8xW8ebnGukLb` |
| Repositorio | [migdlp/opinion-social-media](https://github.com/migdlp/opinion-social-media) |
| Dominio asignado | [opinion-social-media.vercel.app](https://opinion-social-media.vercel.app) |
| Producción | Rama `main`; framework Next.js |

No compartir la cuenta, sesión o token del propietario. Cada colaborador que necesite panel debe usar su propia cuenta con permisos adecuados; no se ha verificado aquí el plan contratado ni se han enviado invitaciones. El propietario gestiona miembros desde [Settings → Members](https://vercel.com/miguels-projects-b8307fdb/~/settings/members).

## Qué pueden hacer los colaboradores

| Acción | Vía y condición |
|---|---|
| Publicar ramas y PR | Permisos del repositorio GitHub |
| Disparar previews | Publicar una rama mediante la integración Git; pueden existir controles de autorización |
| Disparar producción | Un cambio publicado en `main` puede activar el despliegue, incluidos commits de estado |
| Cambiar variables, dominio o versión desde el panel | Acceso autorizado a Vercel |

Asignar Vercel a Codex es una regla de coordinación, no un bloqueo técnico de despliegues de otros autores. Coordinar los merges y comprobar siempre el SHA publicado; no asumir que controlar el panel evita que GitHub active un build. Ver [integración Git](https://vercel.com/docs/git).

## Variables por entorno

Los siete registros configurados separan los destinos; no copiar valores de claves al repositorio, issues o chats.

| Variable | Development | Preview | Production |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL dev | URL dev | URL prod |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key dev | Publishable key dev | Publishable key prod |
| `NEXT_PUBLIC_VERCEL_ENV` | `development` | `preview` | `production` |

Dev es `ltlrujmqenhktiilsnis`; prod es `qchpdrolulcgmiliysvr`. Obtener credenciales del proyecto correspondiente mediante el acceso autorizado descrito en [Supabase](supabase-acceso.md). No usar `service_role`, `sb_secret_`, PAT ni secretos OAuth en `NEXT_PUBLIC_*`. Los cambios de variables se aplican a nuevos deployments; verificar el entorno antes de redesplegar. Ver [variables de Vercel](https://vercel.com/docs/environment-variables).

El lector público `getSupabaseEnv()` exige una clave con prefijo `sb_publishable_` y contenido no vacío; rechaza claves secretas, JWT y otros valores sin reproducirlos en sus errores. Mantiene el rechazo de la URL de producción fuera de Production. Esta comprobación de formato no acredita que una clave pertenezca al proyecto: hay que obtener URL y clave del mismo proyecto y verificar su conexión. `NEXT_PUBLIC_*` se incrusta durante el build de Next.js; un error del lector no elimina una clave incorrecta que ya se haya incluido en el bundle. Si se expone una clave privilegiada, revocarla y generar un deployment corregido.

## Preview y diagnóstico del build

1. Publicar la rama de la tarea y abrir su PR; observar el deployment vinculado al SHA esperado.
2. En Deployments, comprobar destino **Preview**, framework **Next.js**, variables dev y logs de instalación/build.
3. Abrir la URL y verificar la aplicación por HTTPS, rutas y conexión a dev. Si Deployment Protection pide acceso, usar una sesión autorizada; registrar la limitación si no puede comprobarse.
4. Registrar URL, SHA, resultado y pruebas en la PR y tarea. READY acredita que terminó el build, no que se verificaron los flujos.

Diagnóstico observado: las PR #59 y #65 fallaban con `STATIC_BUILD_NO_OUT_DIR`, buscando `public` pese a terminar `next build`. El framework estaba sin seleccionar. Se corrigió a `nextjs` y se dejaron `rootDirectory`, `outputDirectory`, `buildCommand` e `installCommand` sin sobrescrituras, usando los valores predeterminados de Next.js.

Para el arranque documental, el Ignored Build Step es `test ! -f package.json`: omite únicamente checkouts sin manifest. Se comprobaron antes de configurarlo tres casos: sin manifest (exit 0, omitir), manifest presente (exit 1, compilar) y manifest inválido (exit 1, dejar que el build informe del error). No omite builds de una app por cambiar sólo documentación.

`vercel.json` versiona `framework: nextjs` y ese mismo `ignoreCommand`, conservando los valores predeterminados de instalación, build y salida. Sus propiedades y la semántica de los códigos de salida se contrastaron con la [referencia oficial de configuración](https://vercel.com/docs/project-configuration/vercel-json).

MVP-008 se cerró mediante [PR #70](https://github.com/migdlp/opinion-social-media/pull/70), merge `e877f02`: [CI 40577319870](https://github.com/migdlp/opinion-social-media/actions/runs/40577319870) verde (aplicación, build, SQL y secretos), preview Git automática del SHA `2aadfbf` READY y rutas `/`, `/login`, `/create` con HTTP 200 mediante acceso autorizado. Se confirmó la separación dev/prod. Las previews históricas siguientes conservan su alcance original.

La preview de [PR #65](https://github.com/migdlp/opinion-social-media/pull/65), SHA `d0e4bed`, terminó READY: [abrir preview](https://opinion-social-media-q76klsgc9-miguels-projects-b8307fdb.vercel.app), deployment `dpl_A6ihuQeRcxgiX4c5yVeVDUDbJoVx`. La consulta autenticada mediante el conector devolvió HTTP 200, título «Opinión» y «Feed público de encuestas (MVP-033)»: es un scaffold, sin acreditar todos los flujos ni acceso anónimo. Se conserva Deployment Protection (`all_except_custom_domains`); no se deshabilitó para probar.

Previews reconstruidas tras corregir la configuración; todas quedaron READY y su raíz respondió HTTP 200 mediante el conector autorizado (título «Opinión»):

| PR | SHA verificado | Deployment |
|---|---|---|
| #59 | `f38134eb10e1cc69e8ccbf9fe0c27744915319de` | `dpl_8bNiPwgK6MkLhatsbXPZk7hcEgdY` |
| #62 | `fa1b08bdedd39077599fc3a074a210ceb10ab18e` | `dpl_A69Jph97zJNLnxvnyJGQnrqWjdoT` |
| #63 | `17598b9b9b6676c4e721b4b67e57c6233f531da2` | `dpl_5VKct4Ssz9oDHZhNGb4MHrWpmika` |
| #64 | `b97472ff46ca3bdd59a1e36f875d16b4c73b67d2` | `dpl_D224KWYd6i6pUTNn5mZ9Af8ESQvJ` |
| #65 | `d0e4bedeaac8d2d92bc10215774bff9502851e05` | `dpl_A6ihuQeRcxgiX4c5yVeVDUDbJoVx` |

La reconstrucción eliminó el fallo de Vercel; por sí sola no acreditó los criterios ajenos al despliegue. Posteriormente MVP-004 se completó con [PR #65](https://github.com/migdlp/opinion-social-media/pull/65), merge `096de80`, [consulta real a dev](https://github.com/migdlp/opinion-social-media/pull/65#issuecomment-6452381011) y [CI verde 40578820940](https://github.com/migdlp/opinion-social-media/actions/runs/40578820940).

## Runbook de producción: preparar la ventana

MVP-048 documenta el procedimiento; no acredita que se haya ejecutado un despliegue, login o restauración. Antes de intervenir, completar este registro en la tarea de ejecución con enlaces y fechas, sin secretos:

| Preflight | Evidencia exigida antes de continuar |
|---|---|
| Coordinación | `main` actualizado, tarea reservada, dependencias verificadas y responsable disponible |
| Versión | SHA completo de Git, PR integrada y deployment esperado; anotar versión anterior compatible |
| Calidad | CI verde del SHA candidato: formato/lint/tipos/unitarias/build, SQL, concurrencia, secretos y reproducción real de Supabase; TDD observado donde cambie comportamiento |
| Migraciones | Lista versionada y ledger remoto comparados; plan de pendientes revisado y ensayo local correcto |
| Recuperación | Copia consistente, fecha objetivo, ubicación cifrada, permisos y ensayo aislado; o bloqueo explícito si falta |
| Configuración | Matriz de variables releída por target, dominio y callbacks exactos; ninguna clave privilegiada en navegador |
| OAuth | Proveedor activo y configuración verificada; login real de ida/vuelta pendiente hasta probarlo |

MVP-022 se integró en [PR #76](https://github.com/migdlp/opinion-social-media/pull/76), merge `5ad69e7`; [CI 40579787090](https://github.com/migdlp/opinion-social-media/actions/runs/40579787090) verificó replay real, segundo despliegue sin cambios y tipos. Seguir [migraciones reproducibles](migraciones.md) para CLI fijada, pruebas y artefactos. Ese ensayo local de esquema no constituye backup de datos productivos.

### Dominio y Google OAuth

El 27-10-2026, la lectura autenticada de `/auth/v1/settings` devolvió HTTP 200 y `external.google=true` en dev y prod, tras configurar el propietario Client ID y secreto. No copiar esos valores al repositorio. Falta comprobar login real, sesión persistente y cierre de sesión; proveedor activo no equivale a flujo correcto.

Configurar en Supabase Auth → URL Configuration y Google Cloud los destinos siguientes, comprobando su lectura posterior. Son los destinos previstos para el callback de aplicación de MVP-006; no afirmar que esa ruta esté implementada hasta verificarlo.

| Configuración | Desarrollo / previews (Supabase dev) | Producción (Supabase prod) |
|---|---|---|
| Site URL | `http://localhost:3000` para desarrollo local | `https://opinion-social-media.vercel.app` |
| Redirect URL de aplicación | `http://localhost:3000/auth/callback` y `https://<host-exacto-de-la-preview>/auth/callback` | `https://opinion-social-media.vercel.app/auth/callback` |
| URI de redirección autorizada de Google | `https://ltlrujmqenhktiilsnis.supabase.co/auth/v1/callback` | `https://qchpdrolulcgmiliysvr.supabase.co/auth/v1/callback` |

Sustituir el marcador por la URL exacta del deployment probado, autorizar sólo esa preview y retirar entradas caducadas. No usar comodines amplios ni conectar previews al Supabase prod. El callback de Google termina en Supabase; el de aplicación termina en la web. Si cambia dominio, revisar Site URL, allowlist y retorno OAuth antes de publicar, sin añadir dominios ajenos. Usar sólo rutas internas al manejar `next`.

### Migrar sin perder el historial

1. Confirmar conexión autorizada y referencia **prod `qchpdrolulcgmiliysvr`**; registrar `list_migrations`, esquema actual, funciones, políticas y conteos previos. Comparar con el inventario de dev sin asumir que ambas bases coinciden.
2. Comparar versiones, nombres y SQL aplicado con `supabase/migrations` del SHA aprobado, usando ledger y lectura del catálogo. Si no se puede recuperar o contrastar el SQL, parar ante divergencias: no inferir igualdad sólo por el nombre.
3. Revisar compatibilidad con la versión actual y anterior del frontend. Preparar copia/ensayo según la sección de recuperación; acordar ventana y pausa de escrituras cuando proceda. No ejecutar operaciones con riesgo de datos sin una recuperación aceptada.
4. Aplicar únicamente las migraciones **pendientes**, en orden, con el mecanismo autorizado que mantenga el ledger. Registrar cada resultado; si el conector asigna otra versión, reconciliar esa diferencia explícitamente antes de continuar. No repetir SQL ya aplicado ni usar `db reset` en remoto ni reparar el ledger a ciegas.
5. Releer ledger y catálogo; verificar tablas, restricciones, funciones, RLS y permisos, y comparar conteos. Ejecutar checks de no filtración y contratos con datos de prueba controlados. Ante fallo, detener la secuencia y conservar evidencia; un archivo SQL de esquema no recupera datos perdidos.

### Publicación y redeploy

1. Verificar dependencias de MVP-049: MVP-008, MVP-022, MVP-047 y MVP-048 completas. No confundir sus PR con el cumplimiento de OAuth, pruebas y recuperación previas.
2. Coordinar el merge: la integración Git puede desplegar **cada commit en `main`, incluidos los de estado**. No hay aquí garantía de que Vercel espere o bloquee automáticamente por CI; comprobar los checks antes del merge y seguir el deployment disparado por su SHA exacto.
3. Verificar en Deployments destino **Production**, SHA, variables prod, logs y dominio. READY sólo confirma build/deployment; no autoriza declarar el MVP listo.
4. Si hace falta redeploy, elegir el deployment del SHA correcto en el panel y **Redeploy**; confirmar target, configuración y variables que se incorporarán antes de ejecutarlo. Un cambio de `NEXT_PUBLIC_*` requiere un build nuevo; no promover una preview compilada contra dev como si fuera prod.
5. Comprobar HTTPS, feed/detalle públicos, Google login/retorno, sesión y logout, publicación y voto con dos cuentas autorizadas, voto inmutable y ausencia de resultados antes de votar incluso para el autor. Revisar bundle, peticiones, RLS, contadores y separación de bases; no registrar tokens ni datos personales en evidencias públicas.
6. Guardar URL, SHA, ledger, pruebas y límites en MVP-049/050/051. Si falla un criterio, registrar incidente y no declarar release completa.

El runner integrado es Vitest (`npm run test`); `npm run check` reúne las comprobaciones de aplicación y los jobs de CI añaden base de datos, concurrencia y secretos. Este cambio sólo documental se verifica por contenido, enlaces y formato; no inventa RED/GREEN.

## Incidentes: frontend y base de datos

Registrar fecha, SHA, deployment, entorno, impacto y cambios recientes. Diferenciar fallo de frontend, Auth y datos; detener cambios afectados y coordinar en tarea/issue y canal del proyecto. No mostrar secretos en logs compartidos.

### Rollback de frontend

En Hobby sólo se dispone de Instant Rollback al deployment productivo inmediatamente anterior. Confirmar que fue verificado y es compatible con el esquema actual. En el panel, seleccionar **Instant Rollback**, revisar dominios y destino, y confirmar. Se reutiliza el build anterior con su configuración de entorno; cambios posteriores de variables no lo actualizan. Ver [límites y operación oficial](https://vercel.com/docs/instant-rollback).

Después verificar HTTPS, rutas, login, RLS y flujos, y registrar ambos SHAs. Revertir frontend no revierte la base. Un rollback suspende la asignación automática de dominios productivos: tras preparar y comprobar la corrección, **Undo Rollback** permite seleccionar el deployment a promover y reactivar esa asignación. Confirmar dominio y comportamiento después; ver [recuperación de despliegues](https://vercel.com/docs/deployments/rollback-production-deployment).

Si la versión anterior no es elegible o compatible, mantener el incidente abierto y preparar una corrección verificada; no elegir otra versión a ciegas ni simular una restauración de datos.

### Recuperación de datos: preparación obligatoria

La organización Supabase está en Free: **no se garantiza backup diario ni PITR**. Comprobar los mecanismos realmente disponibles en Database → Backups antes de cada operación. Para Free, Supabase recomienda exportaciones y copias externas; ver [backups](https://supabase.com/docs/guides/platform/backups). No se ha creado ni ensayado aquí una copia/restauración: es un requisito previo a operaciones con riesgo de datos, no una recuperación ya probada.

Preparar una exportación lógica con CLI y conexión Postgres expresamente autorizadas: roles, esquema, datos y `supabase_migrations` (esquema y datos) por separado. Guardar copia externa cifrada y restringida, checksum, fecha, versiones y referencia de origen. La guía [backup/restore](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore) distingue esos componentes; revisar también personalizaciones Auth, objetos Storage y Vault y configuración OAuth, que no se deben asumir cubiertos por un dump de `public`. Los conectores actuales no proporcionan dump/restore completo.

Ensayar primero sobre **Supabase local aislado**, sin usuarios ni datos compartidos y con material de copia protegido. No crear otro proyecto para sustituir recursos ni usar dev compartido como destino de restauración. Verificar el orden y compatibilidad de restauración de roles, esquema, datos e historial según la copia real; documentar comandos comprobados, errores y tiempo. No copiar una receta destructiva sobre prod existente.

### Si hay pérdida o corrupción

1. Detener escrituras con una medida operativa real acordada y verificable; si aún no existe mantenimiento, coordinar aislamiento del acceso antes de intervenir. Preservar estado actual y logs sin sobrescribir la única copia.
2. Identificar copia íntegra, fecha objetivo y datos posteriores que se perderían; obtener acuerdo del propietario sobre destino, ventana, pérdida aceptada y procedimiento ensayado antes de restaurar. No usar credenciales o sesiones existentes sin autorización.
3. Si no hay copia válida, **no hay recuperación garantizada**: no resetear ni improvisar SQL inverso. Mantener las escrituras detenidas, evaluar una corrección hacia delante o soporte con el propietario y documentar los datos irrecuperables.
4. Tras ensayo aislado y autorización del plan específico, ejecutar la recuperación del proyecto existente mediante el mecanismo disponible y revisado. No restaurar mientras se sigan admitiendo escrituras ni asumir que el ledger sustituye los datos.
5. Releer esquema y ledger; comparar conteos y referencias, usuarios Auth y objetos necesarios con la copia. Probar login, RLS, voto único, resultados sólo tras votar y ausencia de secretos privilegiados en navegador. Reabrir escrituras sólo tras verificaciones observadas; registrar pérdida real, duración y acciones pendientes.

## Estado y siguiente tarea

- MVP-008 completada con PR #70; MVP-004 completada con PR #65, según las evidencias anteriores.
- MVP-048: runbook preparado; comprobaciones documentales y PR/merge deben quedar registradas antes de cerrarla. No requiere provocar un desastre, pero la ejecución productiva debe satisfacer sus preflight.
- MVP-049: tras integrar MVP-048, queda como dependencia directa MVP-047 (README, que requiere MVP-006/022/023). Google está habilitado, pero las páginas `/login` y `/create` aún son placeholders: no permiten acreditar login ni publicación/voto en producción. No aplicar SQL productivo ni cerrar despliegue por el scaffold.
- MVP-050: bloqueada por MVP-044/045/046/049; después ejecutar checklist funcional y de seguridad con evidencias.
- MVP-051: bloqueada por MVP-047/049/050; consolidar versión y checklist global sin declarar el MVP listo con criterios pendientes.

El estado vivo y responsables están en [tareas](tareas-futuras.md); [estado del proyecto](estado-proyecto.md) conserva las observaciones fechadas, algunas históricas.
