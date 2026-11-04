# Feed — definición aprobada

**Actualización de entrada — 30-10-2026:** D-033 / [FEED-001 #277](https://github.com/migdlp/opinion-social-media/issues/277) sustituye el default histórico: **Recientes para todos**, incluso con seguidos. Siguiendo sigue accesible al elegirlo; las respuestas y tareas originales siguientes se conservan como historial. Búsqueda/lupa y alineación en [el backlog nuevo](backlog-producto-2026-10-30.md).


**Estado:** Definido · **Tarea:** [V2-030](backlog-v2.md#v2-030--definir-el-feed-con-el-propietario) · **Última actualización:** 28-10-2026

> Definición aprobada en conversación con el propietario el 28-10-2026 (D-022 a D-025). La implementación se realiza en V2-031–036, con sus dependencias, reservas y pruebas. Este documento no declara terminadas esas tareas.

## 1. Cómo funciona hoy

- Ruta `/` (`src/app/feed.tsx`, `src/components/feed-list.tsx`). Cronológico puro: `created_at DESC, id DESC`, 20 por página con cursor y botón «Cargar más» (`src/lib/data/polls.ts`, `getFeedPolls`).
- Igual para todos, con o sin sesión. No hay algoritmo, filtros ni pestañas, como exigía el brief §3.1.
- La tarjeta (`src/components/poll-card.tsx`) muestra pregunta, opciones bloqueadas y fecha. **No se puede votar desde el feed**: la tarjeta lleva al detalle. Si ya votaste, muestra tus resultados.
- Con sesión hay una llamada a `get_poll_results` por cada encuesta votada de la página (lo resuelve V2-023).

## 2. Restricciones que cualquier diseño debe respetar

1. **Regla crítica:** el feed nunca envía al navegador recuentos ni porcentajes de una encuesta abierta que el usuario no ha votado. Esto incluye el HTML SSR, los props y las respuestas de server actions.
2. **Privacidad (V2-005):** el feed sólo muestra lo que la RLS deja ver. Las encuestas de cuentas privadas, sólo a sus seguidores aceptados.
3. **Encuestas ocultas** por moderación: nunca aparecen.
4. **Stack:** todo en Supabase/PostgreSQL y Next.js, sin servicios externos, colas ni cachés de terceros (brief §4). Un algoritmo de recomendación tiene que poder calcularse en SQL.
5. **Sin caché compartida** de respuestas con datos de usuario (D-014, `cacheComponents`).
6. Mobile-first y accesible (skill `impeccable`, `DESIGN.md`).

## 3. Diseño acordado el 28-10-2026

- Dos pestañas: **Recientes** y **Siguiendo**, ordenadas por `created_at DESC, id DESC`. No hay «Para ti» ni ranking por popularidad. F-4/F-5 no aplican al elegir estas dos pestañas cronológicas.
- **Desde FEED-001 (D-033)** se entra siempre en Recientes, con o sin sesión y siga o no a alguien; Siguiendo es una elección explícita (`?tab=siguiendo`). Antes (D-022) una cuenta con seguimientos aceptados entraba en Siguiendo. Las solicitudes pendientes no cuentan como seguimientos aceptados. Si ya sigue a alguien pero el feed está vacío, se mantiene Siguiendo con un enlace a Recientes.
- La selección explícita de pestaña/categoría se conserva en la URL y tiene prioridad sobre el valor inicial. «Siguiendo» sin sesión solicita login; nunca se consulta el feed de otra cuenta.
- Las encuestas votadas se muestran normalmente con sus resultados. No se añade filtro «Sin votar».
- Se puede seleccionar y votar desde la tarjeta. Antes de votar una encuesta abierta no se envían agregados al navegador. Tras login se recupera la intención, sin emitir automáticamente el voto.
- Scroll infinito con botón alternativo «Cargar más», visible y usable con teclado. Cursor de 20 encuestas; una sola solicitud en vuelo, sin duplicados ni reinicios al cambiar filtros.
- Filtro de categoría, con **Todas** por defecto, usando el catálogo de V2-021.
- Cerradas: se muestran con los resultados que autoriza D-020 durante un tiempo limitado desde `closes_at`. El plazo es de **24 horas desde `closes_at`**; al alcanzarse ese instante se excluyen del feed. Desaparecer del feed no las borra, oculta ni cambia su visibilidad en detalle/perfil. No hace falta cron ni limpieza de filas: es un filtro temporal de lectura.

Las precisiones sobre URL, solicitudes aceptadas, cursor, error de red y conservación del detalle son decisiones técnicas sencillas para concretar lo aprobado; no son respuestas literales del propietario.

## 4. Respuestas del propietario

| # | Pregunta | Respuesta, 28-10-2026 |
|---|---|---|
| F-1 | Pestañas | Recientes + Siguiendo. |
| F-2 | Entrada con/sin sesión | Visitantes en Recientes; usuarios en Siguiendo, con Recientes si aún no siguen a nadie. |
| F-3 | Encuestas votadas | Mostrarlas con sus resultados. |
| F-4 | Ranking por número de votos | No aplica al diseño elegido: sólo dos pestañas cronológicas; no se crea un ranking. |
| F-5 | Factores/pesos de «Para ti» | No aplica: no se ha elegido esa pestaña. |
| F-6 | Encuestas cerradas | «Sí, con sus resultados públicos, pero durarán cierto tiempo, no de forma ilimitada». Respuesta final: **24 horas desde el cierre**. |
| F-7 | Voto desde tarjeta | Sí. |
| F-8 | Carga de más encuestas | Scroll infinito con botón alternativo. |
| F-9 | Categorías | Sí, con «Todas» por defecto. |

Decisiones registradas en [D-022 a D-025](decisiones.md). F-1 a F-9 quedan resueltas; V2-030 se completa tras integrar la documentación y publicar los tickets enlazados.

## 5. Trabajo de implementación preparado

El detalle implementable está en [backlog-v2.md](backlog-v2.md#e10--implementación-del-feed-acordado). Las tareas se reservan tras cerrar V2-030, según sus dependencias y las reservas de main:

| ID | Trabajo | Prioridad | Dependencias reales |
|---|---|---|---|
| [V2-031](https://github.com/migdlp/opinion-social-media/issues/178) | Lectura de feed con seguimientos, categoría y retención | P0 | V2-030, V2-005, V2-014, V2-021 |
| [V2-032](https://github.com/migdlp/opinion-social-media/issues/179) | Pestañas, entrada por defecto y filtro de categoría | P0 | V2-030, V2-031 |
| [V2-033](https://github.com/migdlp/opinion-social-media/issues/180) | Voto seguro desde la tarjeta | P0 | V2-030, V2-014 |
| [V2-034](https://github.com/migdlp/opinion-social-media/issues/181) | Scroll infinito y carga alternativa | P0 | V2-031, V2-032 |
| [V2-035](https://github.com/migdlp/opinion-social-media/issues/182) | Seguridad del feed mediante HTTP/SQL | P0 | V2-031, V2-033, V2-024 |
| [V2-036](https://github.com/migdlp/opinion-social-media/issues/183) | E2E, accesibilidad y documentación del feed | P0 | V2-032, V2-033, V2-034, V2-035 |

Frontend de tarjetas (V2-033) puede avanzar con el contrato existente de voto/resultados mientras se implementa V2-031. No se depende de V2-023 para publicar: la optimización por lotes sigue siendo P1.

## 6. Verificación de cobertura

- F-1/F-2/F-9: V2-031/032 y sus E2E.
- F-3/F-6: V2-031/033; 24 horas verificadas en el límite exacto con reloj de servidor.
- F-4/F-5: no se crea ranking ni recomendaciones; ambas pestañas son cronológicas.
- F-7: V2-033, recuperación de autenticación y voto único.
- F-8: V2-034, scroll y botón accesible.
- Privacidad y regresión completa: V2-035/036.
- Este documento define el resultado, no acredita que la implementación ni producción estén terminadas. El cierre de la implementación (reglas, evidencias, lo no verificado y la comprobación en producción) está en [feed-cierre](feed-cierre.md).
