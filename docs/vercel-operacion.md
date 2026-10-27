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

## Preview y diagnóstico del build

1. Publicar la rama de la tarea y abrir su PR; observar el deployment vinculado al SHA esperado.
2. En Deployments, comprobar destino **Preview**, framework **Next.js**, variables dev y logs de instalación/build.
3. Abrir la URL y verificar la aplicación por HTTPS, rutas y conexión a dev. Si Deployment Protection pide acceso, usar una sesión autorizada; registrar la limitación si no puede comprobarse.
4. Registrar URL, SHA, resultado y pruebas en la PR y tarea. READY acredita que terminó el build, no que se verificaron los flujos.

Diagnóstico observado: las PR #59 y #65 fallaban con `STATIC_BUILD_NO_OUT_DIR`, buscando `public` pese a terminar `next build`. El framework estaba sin seleccionar. Se corrigió a `nextjs` y se dejaron `rootDirectory`, `outputDirectory`, `buildCommand` e `installCommand` sin sobrescrituras, usando los valores predeterminados de Next.js.

Para el arranque documental, el Ignored Build Step es `test ! -f package.json`: omite únicamente checkouts sin manifest. Se comprobaron antes de configurarlo tres casos: sin manifest (exit 0, omitir), manifest presente (exit 1, compilar) y manifest inválido (exit 1, dejar que el build informe del error). No omite builds de una app por cambiar sólo documentación.

La preview de [PR #65](https://github.com/migdlp/opinion-social-media/pull/65), SHA `d0e4bed`, terminó READY: [abrir preview](https://opinion-social-media-q76klsgc9-miguels-projects-b8307fdb.vercel.app), deployment `dpl_A6ihuQeRcxgiX4c5yVeVDUDbJoVx`. La consulta autenticada mediante el conector devolvió HTTP 200, título «Opinión» y «Feed público de encuestas (MVP-033)»: es un scaffold, sin acreditar todos los flujos ni acceso anónimo. Se conserva Deployment Protection (`all_except_custom_domains`); no se deshabilitó para probar.

Previews reconstruidas tras corregir la configuración; todas quedaron READY y su raíz respondió HTTP 200 mediante el conector autorizado (título «Opinión»):

| PR | SHA verificado | Deployment |
|---|---|---|
| #59 | `f38134eb10e1cc69e8ccbf9fe0c27744915319de` | `dpl_8bNiPwgK6MkLhatsbXPZk7hcEgdY` |
| #62 | `fa1b08bdedd39077599fc3a074a210ceb10ab18e` | `dpl_A69Jph97zJNLnxvnyJGQnrqWjdoT` |
| #63 | `17598b9b9b6676c4e721b4b67e57c6233f531da2` | `dpl_5VKct4Ssz9oDHZhNGb4MHrWpmika` |
| #64 | `b97472ff46ca3bdd59a1e36f875d16b4c73b67d2` | `dpl_D224KWYd6i6pUTNn5mZ9Af8ESQvJ` |
| #65 | `d0e4bedeaac8d2d92bc10215774bff9502851e05` | `dpl_A6ihuQeRcxgiX4c5yVeVDUDbJoVx` |

Esto elimina el fallo de build de Vercel observado; no fusiona las PR ni acredita sus criterios ajenos al despliegue. MVP-004 conserva su reserva y la comprobación pendiente de consulta real a Supabase desde sus clientes.

## Publicación y redeploy

1. Consultar las dependencias de MVP-049: MVP-008, MVP-022, MVP-047 y MVP-048 deben estar completadas y verificadas. Revisar también las dependencias propias de cada una.
2. Verificar pruebas con TDD observado, migraciones versionadas y su aplicación controlada al proyecto prod, configuración Google OAuth y callbacks del dominio final. No aplicar SQL ni inventar credenciales para eludir bloqueos.
3. Fusionar la PR verificada. En Deployments, comprobar destino **Production**, SHA de `main`, variables prod y dominio antes de continuar.
4. Para redeploy desde el panel, seleccionar el deployment del SHA correcto y **Redeploy**; confirmar el destino y la configuración de entorno mostrada antes de ejecutar. Si la configuración cambió, crear el deployment que la incorpore y volver a verificarla.
5. Comprobar HTTPS, login y retorno Google, publicación y voto con cuentas de prueba, separación de bases, RLS y resultados inaccesibles antes de votar. Guardar evidencias en MVP-049/050/051; no cerrar por el mero estado READY.

Los comandos reales y pruebas de aplicación se documentarán cuando el código y el runner estén integrados. Esta guía no acredita un ciclo RED/GREEN ni sustituye el checklist de producción.

## Incidentes y recuperación

1. Identificar deployment, SHA, entorno, síntoma y momento de inicio. Separar fallos de frontend de errores de Auth o base de datos; no publicar secretos al compartir logs.
2. Para una regresión de frontend, elegir desde Deployments una versión de **Production previamente verificada**, confirmar su compatibilidad con el esquema actual y usar el mecanismo de [rollback](https://vercel.com/docs/deployments/rollback-deployment) disponible. Registrar origen/destino y comprobar dominio, login y flujos después.
3. Para datos o esquema, no improvisar migraciones inversas ni asumir que revertir frontend restaura Supabase. Detener cambios afectados y coordinar con el responsable de base de datos.
4. Antes de una restauración de base, confirmar mecanismo y punto de recuperación disponibles, permisos, alcance y pérdida de datos aceptada. No se ha probado un backup/restauración de Supabase ni se declara disponible como garantía.
5. Actualizar tarea e issue con el resultado y bloqueos. La recuperación queda pendiente hasta observar las comprobaciones posteriores.

## Pendiente para cerrar las tareas

- MVP-008: integrar sus dependencias y comprobar una preview funcional con URL, SHA y Supabase dev.
- MVP-048: completar runbook de migraciones, secretos/OAuth y recuperación de base con mecanismos realmente disponibles.
- MVP-049: publicar aplicación real y verificar esquema, HTTPS y login en producción.
- MVP-050: ejecutar pruebas funcionales y de seguridad de producción con evidencias.
- MVP-051: consolidar el checklist global, versión y resultado verificado; no declarar el MVP listo mientras haya criterios bloqueados.

El estado vivo y los siguientes responsables están en [tareas](tareas-futuras.md); el [estado del proyecto](estado-proyecto.md) conserva los hechos observados.
