# Decisiones y cuestiones pendientes

## Decisiones confirmadas

| ID | Decisión | Origen |
|---|---|---|
| D-001 | El repositorio es `https://github.com/migdlp/opinion-social-media` | Enlace facilitado por el propietario |
| D-002 | El backlog adjunto define el alcance inicial: 53 tareas, 51 P0 y 2 P1 | Documento proporcionado por el propietario |
| D-003 | Se autoriza usar el equipo conectado de Vercel para el proyecto | Mensaje del propietario sobre acceso a Vercel |
| D-004 | Desarrollo y producción se crean en «Los tres cerditos», Irlanda | Respuesta explícita a la elección de organización de Supabase |
| D-005 | Pausar implementación; organizar contexto, Docs y tareas futuras; recibir más información | Instrucción de pausa del propietario |
| D-006 | Incorporar el brief adicional y contrastar su cobertura sin reanudar implementación | Nuevo contexto facilitado por el propietario |
| D-007 | No implementar ni persistir borradores; sustituye la previsión anterior de `sessionStorage` para el formulario | Exclusión explícita en §3.3 del brief |
| D-008 | Respetar las tres tablas y sus campos exactos, incluido `votes.id` UUID PK; sin `profiles` | Modelo obligatorio en §5 del brief |
| D-009 | Crear épicas y tickets reales en GitHub Issues si está disponible, con dependencias enlazadas | Instrucciones de planificación del brief |
| D-010 | Añadir la skill `karpathy-guidelines` a este proyecto y enlazarla en las instrucciones | Enlace explícito facilitado por el propietario |
| D-011 | Antes de trabajar en una tarea, mostrarla «En progreso» con el agente real en `tareas-futuras.md` y sincronizar el issue | Instrucción explícita del propietario sobre seguimiento por agentes |
| D-012 | Mantener P0/P1 visibles y publicar una guía de orden para decidir la siguiente tarea disponible | Petición del propietario sobre prioridades y secuencia |
| D-014 | Stack inicial: Next.js 16.4.3, React 19.3, Tailwind 4, TypeScript 5 estricto, ESLint 9; plantilla oficial de `create-next-app` con `cacheComponents` activado (lo dinámico va tras `<Suspense>`; nada se cachea sin `use cache`) | MVP-001; versiones estables al 27-10-2026, fijadas por `package-lock.json` |
| D-013 | Reanudar la implementación siguiendo el orden y el protocolo de reserva; sustituye la pausa D-005 | Instrucción del usuario de la sesión `claude-code (session_019ZfidxHjR16hC5t8nHGq9M)` el 26-10-2026 («Lee el contexto y las tareas y comienza con las tareas»), ampliada el 27-10-2026 con permiso para publicar estado en `main`, coordinarse con otros agentes y fusionar PR |
| D-VERCEL-001 | Encargar a Codex /root (opinion_social_media) las tareas de Vercel, reservarlas y resolver sus bloqueos; reanudar ese alcance conservando dependencias y reservas ajenas | Instrucción explícita del propietario del 27 de octubre de 2026 |
| D-VERCEL-002 | Vercel sólo despliega `release`: sin previews de `main` ni de PR (`git.deploymentEnabled`). Nada que cree deployments o consuma la cuota gratuita de Vercel se hace salvo el paso de `main` a `release`. Quien fusiona la PR de una tarea en `main` cierra su issue | Instrucción explícita del propietario del 28-10-2026, tras agotar el límite de 100 deployments diarios del plan gratuito |
| D-015 | Ampliar el modelo de datos: se permiten tablas propias además de `polls`, `poll_options` y `votes`, cada una con RLS, permisos explícitos y pruebas. Sustituye a D-008 en lo relativo al número de tablas y a la prohibición de `profiles` | Respuesta del propietario del 28-10-2026 a la auditoría de mejoras (fase 2) |
| D-016 | Perfiles con `@usuario` único y nombre visible opcional; las encuestas se firman con `@usuario`; cada cuenta es pública o privada. Sustituye al «autor genérico» y a la exclusión de perfiles del brief §3.2 y §8 | Ídem |
| D-017 | Relaciones de seguidores tipo Instagram: seguir es unidireccional y, en cuentas privadas, requiere solicitud aceptada. Las encuestas de una cuenta privada sólo las ven su autor y sus seguidores aceptados, impuesto en Supabase | Ídem |
| D-018 | Los votos de un usuario (encuesta y opción elegida) son visibles en su perfil para todos si la cuenta es pública, y sólo para sus seguidores si es privada. Matiz frente a la regla crítica pendiente de confirmar (P-1 de `backlog-v2.md`) | Ídem |
| D-019 | Tipos de encuesta: plantilla Sí/No y entre 2 y 6 opciones (antes 2–4) | Ídem |
| D-020 | Fecha de cierre opcional. Una encuesta cerrada no admite votos y sus resultados pasan a ser visibles para todos los que puedan verla, aunque no hayan votado. Única excepción a la regla crítica, que sigue íntegra para encuestas abiertas. Sustituye a la exclusión de caducidad del brief §3.3 y §8 | Ídem |
| D-021 | Contenido: denuncias de encuestas (revisión manual), categorías fijas y «Guardar para luego» privado | Ídem |

D-015 a D-021 abren la fase 2 descrita en [backlog-v2.md](backlog-v2.md); donde contradigan al brief, prevalecen ellas. La épica del feed (E10) sigue en discusión con el propietario.

D-005 conserva el historial de pausa. D-013 la levanta para el resto de tareas y D-VERCEL-001 asigna Vercel a Codex; ninguna permite declarar finalizadas tareas sin evidencia ni tomar trabajo reservado a otros agentes. La [guía de operación](vercel-operacion.md) concreta la responsabilidad y los controles de Vercel. Las acciones con infraestructura compartida (OAuth, migraciones en Supabase, producción) siguen requiriendo los datos y confirmaciones que indique cada tarea.

## Reglas del producto recogidas del backlog

Resultados sólo tras votar, voto único inmutable, feed público cronológico, Google Auth, validación 10–280/2–4/1–100, límite de cinco publicaciones por hora, moderación manual y separación de entornos. Ver [contexto](contexto-aplicacion.md) y [arquitectura](arquitectura.md).

## Pendiente de definir o aportar

- Nuevas aportaciones posteriores al brief incorporado, si el propietario las envía.
- Confirmación del propietario de la épica E12 (propuesta de agente) y sus respuestas a P-3, P-4 y P-5 de [backlog-v2.md](backlog-v2.md), que obtiene V2-040.
- Nombre y estilo visual definitivos, si se desea concretarlos.
- Configuración OAuth de Google Cloud: proyecto, cliente web y secreto mediante un canal seguro.
- Dominio público definitivo, o uso inicial del subdominio de Vercel.
- Fechas u orden de entrega distintos de las dependencias ya definidas, si el propietario los fija.

Estos puntos no autorizan nuevas funciones ni acciones de infraestructura. Se resolverán al incorporar la información o al reanudar el desarrollo.
