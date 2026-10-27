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

D-005 conserva el historial de pausa. D-013 la levanta para el resto de tareas y D-VERCEL-001 asigna Vercel a Codex; ninguna permite declarar finalizadas tareas sin evidencia ni tomar trabajo reservado a otros agentes. La [guía de operación](vercel-operacion.md) concreta la responsabilidad y los controles de Vercel. Las acciones con infraestructura compartida (OAuth, migraciones en Supabase, producción) siguen requiriendo los datos y confirmaciones que indique cada tarea.

## Reglas del producto recogidas del backlog

Resultados sólo tras votar, voto único inmutable, feed público cronológico, Google Auth, validación 10–280/2–4/1–100, límite de cinco publicaciones por hora, moderación manual y separación de entornos. Ver [contexto](contexto-aplicacion.md) y [arquitectura](arquitectura.md).

## Pendiente de definir o aportar

- Nuevas aportaciones posteriores al brief incorporado, si el propietario las envía.
- Nombre y estilo visual definitivos, si se desea concretarlos.
- Configuración OAuth de Google Cloud: proyecto, cliente web y secreto mediante un canal seguro.
- Dominio público definitivo, o uso inicial del subdominio de Vercel.
- Fechas u orden de entrega distintos de las dependencias ya definidas, si el propietario los fija.

Estos puntos no autorizan nuevas funciones ni acciones de infraestructura. Se resolverán al incorporar la información o al reanudar el desarrollo.
