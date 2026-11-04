# Historias de usuario del 04-11-2026: épicas y tareas

Origen: el propietario aprobó en el chat del 04-11-2026 las historias 57–63, 66, 68, 70–82 y pidió ampliar la 73 con secciones como Tendencias o Populares. Rechazó la 64 (vista previa al crear), la 65 (cerrar antes de tiempo), la 67 (duplicar) y la 69 (corregir erratas). Cada historia se descompone aquí en una o varias **tareas ejecutables**, agrupadas en **épicas**.

**Esto es planificación.** Ninguna tarea está implementada ni desplegada. Todas nacen **Pendiente** y con agente **—**. Se reservan en el issue [#73](https://github.com/migdlp/opinion-social-media/issues/73) según D-043. Estimaciones relativas: S ≈ 0,5 día, M ≈ 1 día, L ≈ 2 días.

Las fichas están escritas para ejecutarse **sin tomar decisiones de producto**. Si al implementar aparece un hueco no cubierto, se aplica la opción más restrictiva para la privacidad y se registra en la PR. No se inventa alcance nuevo.

## Archivos

La numeración empieza en E13 porque E12 ya existe ([#162](https://github.com/migdlp/opinion-social-media/issues/162), «Crecimiento y hábito», pendiente de V2-040).


| Épica | Archivo | Historias |
|---|---|---|
| [E13](https://github.com/migdlp/opinion-social-media/issues/342) · Explorar mejor el feed | [E13-explorar-feed.md](E13-explorar-feed.md) | 57, 58, 61, 72 |
| [E14](https://github.com/migdlp/opinion-social-media/issues/343) · Secciones: Tendencias, Populares, Cierran pronto y Reñidas | [E14-secciones.md](E14-secciones.md) | 73 (ampliada) |
| [E15](https://github.com/migdlp/opinion-social-media/issues/344) · Resultados ampliados | [E15-resultados.md](E15-resultados.md) | 59, 60, 62, 63 |
| [E16](https://github.com/migdlp/opinion-social-media/issues/345) · Mis encuestas | [E16-mis-encuestas.md](E16-mis-encuestas.md) | 66, 68, 70 |
| [E17](https://github.com/migdlp/opinion-social-media/issues/346) · Personas | [E17-personas.md](E17-personas.md) | 71, 79 |
| [E18](https://github.com/migdlp/opinion-social-media/issues/347) · Avisos dentro de la app | [E18-avisos.md](E18-avisos.md) | 74, 75 |
| [E19](https://github.com/migdlp/opinion-social-media/issues/348) · Conversación | [E19-conversacion.md](E19-conversacion.md) | 76 |
| [E20](https://github.com/migdlp/opinion-social-media/issues/349) · Cuenta y datos personales | [E20-cuenta-datos.md](E20-cuenta-datos.md) | 77, 78, 80 |
| [E21](https://github.com/migdlp/opinion-social-media/issues/350) · Transparencia de moderación | [E21-moderacion.md](E21-moderacion.md) | 81, 82 |
| Calidad (épica existente E11) | [E11-calidad.md](E11-calidad.md) | Regresión de todas las anteriores |

## Decisiones nuevas (D-044 a D-054)

Se registran también en [decisiones.md](../../decisiones.md). Las historias las aprobó el propietario. El detalle de cada decisión lo fija esta planificación y el propietario puede corregirlo antes de que empiece la tarea afectada.

- **D-044 · Total de votos visible antes de votar (HU-63).** Cambia la regla crítica. Antes de votar sólo se puede obtener **el número total de votos** de una encuesta visible. El **reparto** (votos por opción, porcentajes, opción ganadora, cualquier dato derivado) sigue disponible sólo después de votar o con la encuesta cerrada, sin excepciones, también para la autora. Las pruebas que hoy exigen «no ve recuentos» pasan a exigir «no ve reparto».
- **D-045 · Secciones del feed (HU-73).** Las secciones nuevas son **Tendencias**, **Populares**, **Cierran pronto** y **Reñidas**, junto a las existentes Recientes y Siguiendo. Recientes sigue siendo la pestaña inicial (D-033). Las fórmulas son fijas y públicas (ver E14). Ninguna sección ordena encuestas abiertas usando su reparto: Reñidas sólo incluye encuestas cerradas.
- **D-046 · Borrar mis encuestas (HU-70).** Sustituye la exclusión histórica de «eliminación por usuarios». La autora puede borrar **definitivamente** una encuesta suya publicada, con sus opciones, votos, comentarios, guardados y denuncias (borrado en cascada). No se puede borrar una encuesta oculta por moderación, para conservar la evidencia. No hay papelera ni deshacer.
- **D-047 · Avisos sólo dentro de la app (HU-74, HU-75, HU-82).** Se crea un centro de avisos en `/avisos`, con una campana y un contador de no leídos. **Sin** email, push, realtime ni preferencias por tipo. Los avisos se **calculan al leer** a partir de las tablas existentes (seguimientos, votos, comentarios, moderación) y no se guardan copias. Si el origen desaparece o deja de ser visible, el aviso desaparece. Se muestran los últimos 30 días.
- **D-048 · Respuestas a comentarios (HU-76).** Matiza D-036 («sin hilos»): se permite **un solo nivel** de respuestas. Responder a una respuesta cuelga del mismo comentario raíz. Siguen sin existir likes, edición y adjuntos.
- **D-049 · Eliminar la cuenta y descargar mis datos (HU-77, HU-78).** Borrar la cuenta es inmediato e irreversible y elimina todos sus datos en cascada, votos incluidos: los totales de las encuestas bajan. El `@usuario` liberado no se puede reutilizar durante 30 días. La descarga es un JSON con los datos propios y sin datos personales de terceros salvo `@usuario`. No incluye agregados de encuestas.
- **D-050 · Silenciar (HU-79).** Silenciar oculta a quien silencia las encuestas de esa cuenta en Recientes, Siguiendo y todas las secciones, y sus avisos. No afecta a búsqueda, perfil, comentarios, seguimiento ni permisos. La otra cuenta no lo sabe.
- **D-051 · Resultados ampliados (HU-59, HU-60).** El desglose de «personas que sigo» sólo incluye cuentas cuyo historial de votos me es visible según su preferencia de PRIV-001. Con el valor inicial `private` no aparecen. La evolución temporal se muestra sólo con 10 votos o más y en tramos de al menos 6 h, para reducir la posibilidad de deducir votos individuales. El riesgo residual se documenta.
- **D-052 · Transparencia de moderación (HU-81, HU-82).** Las denuncias tienen un estado visible para quien denuncia: pendiente, revisada con medidas o revisada sin medidas. La autora de una encuesta ocultada recibe un aviso con el motivo y puede enviar **una** reclamación por encuesta. La revisión sigue siendo manual por un operador.
- **D-053 · Descripción y encuesta fijada (HU-66, HU-68).** Cada encuesta admite una descripción opcional de texto plano de 0–500 caracteres, que no se puede editar tras publicar. Cada perfil puede fijar **una** encuesta propia publicada.
- **D-054 · Feed personal (HU-57, HU-58, HU-61, HU-72).** Hay un filtro «Sin votar». Se pueden descartar encuestas con la acción «No me interesa», que sólo afecta a quien descarta y no a la búsqueda. Se pueden seguir categorías, que se suman a Siguiendo. Al volver al feed se restaura la posición guardando en `sessionStorage` **sólo** IDs, cursores y desplazamiento, nunca contenido ni resultados.

## Orden recomendado

1. **P0 legal y calidad:** ACCOUNT-001 → ACCOUNT-002, ACCOUNT-003, AUTH-002. QA-002 prepara su matriz desde el principio y cierra la última.
2. **Base de tarjetas (ya planificada):** PERF-004 [#329](https://github.com/migdlp/opinion-social-media/issues/329) y PERF-005 [#330](https://github.com/migdlp/opinion-social-media/issues/330). Casi todas las tareas de interfaz que pintan tarjetas dependen de ellas para no chocar con el refactor del feed.
3. **Total de votos y secciones:** RESULTS-005 → RESULTS-006 → TREND-001 → TREND-002.
4. **Feed personal:** FEED-002, FEED-003 → FEED-004, FEED-005, FEED-006 → FEED-007.
5. **Resto P1 en paralelo**, respetando dependencias: E15, E16, E17 y E18; después E19 y E21, que usan los avisos de E18.

Paralelismo: las tareas backend de épicas distintas pueden avanzar a la vez. **Todas las tareas que recrean `get_feed`, `get_ranked_feed`, `get_poll_cards`, `create_poll`, `get_profile`, `add_comment`, `list_comments` o `list_notifications` se fusionan de una en una.** Antes de abrir la PR se rebasan sobre `main` y se recrea la función partiendo de su versión vigente en main, conservando todas sus columnas, filtros y permisos.

## Matriz historia → tareas

| HU | Historia | Tareas |
|---|---|---|
| 57 | Filtrar el feed por encuestas que aún no he votado | FEED-002 |
| 58 | Descartar una encuesta del feed («No me interesa») | FEED-003, FEED-004 |
| 59 | Ver qué han votado las personas que sigo, después de votar | RESULTS-001, RESULTS-002 |
| 60 | Ver la evolución de los resultados en el tiempo, después de votar | RESULTS-003, RESULTS-004 |
| 61 | Volver al mismo punto del feed al regresar de una encuesta | FEED-005 |
| 62 | Compartir mi voto sin revelar los resultados | SHARE-001 |
| 63 | Ver cuántas personas han votado antes de votar | RESULTS-005, RESULTS-006 |
| 66 | Añadir una descripción o contexto a la pregunta | POLL-002, POLL-003 |
| 68 | Fijar una encuesta en mi perfil | PROFILE-003 |
| 70 | Eliminar una encuesta mía | POLL-004, POLL-005 |
| 71 | Buscar personas por nombre de usuario | SEARCH-003, SEARCH-004 |
| 72 | Seguir una categoría | FEED-006, FEED-007 |
| 73 | Secciones Tendencias, Populares, Cierran pronto, Reñidas | TREND-001, TREND-002 |
| 74 | Aviso cuando cierra una encuesta en la que voté | NOTIF-002 |
| 75 | Avisos de seguidores, solicitudes y respuestas | NOTIF-001, NOTIF-003 (respuestas: CMT-004) |
| 76 | Responder a un comentario | CMT-004, CMT-005 |
| 77 | Eliminar mi cuenta y mis datos | ACCOUNT-001, ACCOUNT-002 |
| 78 | Descargar una copia de mis datos | ACCOUNT-003 |
| 79 | Silenciar a una persona sin bloquearla | SOCIAL-003, SOCIAL-004 |
| 80 | Cerrar la sesión en todos mis dispositivos | AUTH-002 |
| 81 | Saber qué ha pasado con mis denuncias | MOD-003, MOD-004 |
| 82 | Aviso si se oculta una encuesta mía y poder reclamar | MOD-005, MOD-006 |
| — | Regresión de privacidad de todo lo anterior | QA-002 |

## Issues de las tareas

| Tarea | Issue | Épica |
|---|---|---|
| FEED-002 — Filtro «Sin votar» en el feed | [#351](https://github.com/migdlp/opinion-social-media/issues/351) | E13 |
| FEED-003 — Descartar encuestas: backend | [#352](https://github.com/migdlp/opinion-social-media/issues/352) | E13 |
| FEED-004 — Descartar encuestas: interfaz | [#353](https://github.com/migdlp/opinion-social-media/issues/353) | E13 |
| FEED-005 — Volver al mismo punto del feed | [#354](https://github.com/migdlp/opinion-social-media/issues/354) | E13 |
| FEED-006 — Seguir categorías: backend | [#355](https://github.com/migdlp/opinion-social-media/issues/355) | E13 |
| FEED-007 — Seguir categorías: interfaz | [#356](https://github.com/migdlp/opinion-social-media/issues/356) | E13 |
| TREND-001 — Secciones del feed: backend | [#357](https://github.com/migdlp/opinion-social-media/issues/357) | E14 |
| TREND-002 — Secciones del feed: interfaz | [#358](https://github.com/migdlp/opinion-social-media/issues/358) | E14 |
| RESULTS-005 — Total de votos antes de votar: backend y regla | [#359](https://github.com/migdlp/opinion-social-media/issues/359) | E15 |
| RESULTS-006 — Total de votos antes de votar: interfaz | [#360](https://github.com/migdlp/opinion-social-media/issues/360) | E15 |
| RESULTS-001 — Qué han votado las personas que sigo: backend | [#361](https://github.com/migdlp/opinion-social-media/issues/361) | E15 |
| RESULTS-002 — Qué han votado las personas que sigo: interfaz | [#362](https://github.com/migdlp/opinion-social-media/issues/362) | E15 |
| RESULTS-003 — Evolución de los resultados: backend | [#363](https://github.com/migdlp/opinion-social-media/issues/363) | E15 |
| RESULTS-004 — Evolución de los resultados: interfaz | [#364](https://github.com/migdlp/opinion-social-media/issues/364) | E15 |
| SHARE-001 — Compartir que he votado sin revelar los resultados | [#365](https://github.com/migdlp/opinion-social-media/issues/365) | E15 |
| POLL-002 — Descripción opcional de la encuesta: backend | [#366](https://github.com/migdlp/opinion-social-media/issues/366) | E16 |
| POLL-003 — Descripción opcional de la encuesta: interfaz | [#367](https://github.com/migdlp/opinion-social-media/issues/367) | E16 |
| PROFILE-003 — Fijar una encuesta en mi perfil | [#368](https://github.com/migdlp/opinion-social-media/issues/368) | E16 |
| POLL-004 — Borrar una encuesta propia: backend | [#369](https://github.com/migdlp/opinion-social-media/issues/369) | E16 |
| POLL-005 — Borrar una encuesta propia: interfaz | [#370](https://github.com/migdlp/opinion-social-media/issues/370) | E16 |
| SEARCH-003 — Buscar personas: backend | [#371](https://github.com/migdlp/opinion-social-media/issues/371) | E17 |
| SEARCH-004 — Buscar personas: interfaz | [#372](https://github.com/migdlp/opinion-social-media/issues/372) | E17 |
| SOCIAL-003 — Silenciar cuentas: backend | [#373](https://github.com/migdlp/opinion-social-media/issues/373) | E17 |
| SOCIAL-004 — Silenciar cuentas: interfaz | [#374](https://github.com/migdlp/opinion-social-media/issues/374) | E17 |
| NOTIF-001 — Avisos derivados y de seguimiento: backend | [#375](https://github.com/migdlp/opinion-social-media/issues/375) | E18 |
| NOTIF-002 — Aviso de cierre de encuestas: backend | [#376](https://github.com/migdlp/opinion-social-media/issues/376) | E18 |
| NOTIF-003 — Centro de avisos y campana: interfaz | [#377](https://github.com/migdlp/opinion-social-media/issues/377) | E18 |
| CMT-004 — Respuestas a comentarios: backend y aviso | [#378](https://github.com/migdlp/opinion-social-media/issues/378) | E19 |
| CMT-005 — Respuestas a comentarios: interfaz | [#379](https://github.com/migdlp/opinion-social-media/issues/379) | E19 |
| ACCOUNT-001 — Eliminar mi cuenta: backend | [#380](https://github.com/migdlp/opinion-social-media/issues/380) | E20 |
| ACCOUNT-002 — Eliminar mi cuenta: interfaz | [#381](https://github.com/migdlp/opinion-social-media/issues/381) | E20 |
| ACCOUNT-003 — Descargar una copia de mis datos | [#382](https://github.com/migdlp/opinion-social-media/issues/382) | E20 |
| AUTH-002 — Cerrar sesión en todos los dispositivos | [#383](https://github.com/migdlp/opinion-social-media/issues/383) | E20 |
| MOD-003 — Estado de mis denuncias: backend | [#384](https://github.com/migdlp/opinion-social-media/issues/384) | E21 |
| MOD-004 — Estado de mis denuncias: interfaz | [#385](https://github.com/migdlp/opinion-social-media/issues/385) | E21 |
| MOD-005 — Encuestas retiradas y reclamación: backend y aviso | [#386](https://github.com/migdlp/opinion-social-media/issues/386) | E21 |
| MOD-006 — Encuestas retiradas y reclamación: interfaz | [#387](https://github.com/migdlp/opinion-social-media/issues/387) | E21 |
| QA-002 — Regresión de privacidad y convivencia para E12–E20 | [#388](https://github.com/migdlp/opinion-social-media/issues/388) | E11 |

## Reglas comunes a todas las tareas

Se aplican siempre, aunque la ficha no las repita.

**Proceso.** Hay que reservar en el #73 (D-043), trabajar en una rama `<agente>/<ID>-<slug>` creada desde `main` y abrir una PR que enlace el issue. TDD obligatorio según [AGENTS.md](../../../AGENTS.md): RED → GREEN → REFACTOR, con los comandos y resultados en la PR. Las migraciones **no se aplican** en dev ni en prod dentro de la tarea; se añaden a la lista de pendientes de REL-004 [#297](https://github.com/migdlp/opinion-social-media/issues/297) con un comentario.

**Comandos reales.** `npm run test` (Vitest), `npm run test:db` (tests SQL en `supabase/tests/`), `npm run test:db:concurrency`, `npm run test:security` (ataques HTTP en `tests/security/`), `npm run test:e2e` (Playwright en `e2e/`) y `npm run check`, que es el mínimo antes de pedir revisión.

**Base de datos.**
- Migración aditiva `supabase/migrations/<AAAAMMDDhhmmss>_<nombre>.sql`, con la hora real de creación y siempre posterior a la última de `main`.
- Test SQL `supabase/tests/<NNN>_<nombre>.test.sql` con el siguiente número libre en `main` al empezar. Si al rebasar coincide con el de otro, se renumera.
- Identidad siempre con `auth.uid()`. Ninguna RPC recibe `user_id`.
- Errores de negocio con `RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = '<CÓDIGO>'`.
- Visibilidad siempre a través de `can_view_author` (privadas y bloqueos).
- Las RPC devuelven `@usuario`, nunca `user_id`.
- Las funciones `security definer` llevan `set search_path = ''` y nombres cualificados, igual que las existentes.
- Hay que `revoke` y `grant` explícitos por rol.
- Los tipos se regeneran y `scripts/check-db-reproducibility.sh` debe pasar.
- Cada cambio de contrato se documenta en [contratos-api.md](../../contratos-api.md) en la misma PR. Cada código de error nuevo se añade a `AppErrorCode` y a la tabla de errores con su texto de interfaz exacto.

**Interfaz.**
- Mobile-first, probada a 320, 390 y 1280 px y en temas claro y oscuro. Sin desbordamiento horizontal.
- Objetivos táctiles de 44 px o más, foco visible, uso completo con teclado y `aria-live` para cargas y errores.
- Textos en español de España, **literales** como en la ficha.
- Siguen la [dirección After Sunset](../../direccion-creativa.md) y [DESIGN.md](../../../DESIGN.md), y se reutilizan los componentes existentes de `src/components/`, como `EmptyState`, `LoadingState`, los skeletons y los diálogos de denuncia y bloqueo.
- Sin dependencias npm nuevas salvo que la ficha lo diga. Ninguna ficha lo dice.

**Privacidad (no negociable).**
- Ninguna lectura nueva entrega el reparto de una encuesta abierta a quien no ha votado (D-044 sólo libera el total).
- Las cuentas privadas sin permiso y los bloqueos en cualquier sentido se comportan como si el contenido no existiera.
- Nada nuevo se guarda en el navegador salvo lo que diga la ficha (sólo FEED-005).

**Datos personales (regla permanente, E20).** Toda tabla nueva con datos de una persona se borra en cascada con `auth.users` y se añade a `export_my_data` cuando exista.

**Fuera de alcance común.** Despliegues, cambios de Vercel (Codex /root), aplicar SQL en proyectos alojados y cualquier mejora no descrita en la ficha.

## Plantilla de cada ficha

Historia → objetivo → decisiones fijadas → backend → interfaz → casos límite → criterios de aceptación → pruebas TDD → fuera de alcance → dependencias. El issue de GitHub de cada tarea reproduce su ficha.
