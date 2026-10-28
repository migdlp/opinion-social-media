# Feed — por definir

**Estado:** por definir · **Tarea:** [V2-030](backlog-v2.md#v2-030--definir-el-feed-con-el-propietario) · **Última actualización:** 28-10-2026

> El propietario quiere decidir el feed en conversación antes de implementarlo. Este documento reúne lo necesario para que **cualquier agente o persona continúe esa definición** donde se quedó. Hasta que pase a «Definido», no se implementa nada del feed más allá de lo que ya existe.

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

## 3. Propuesta inicial (no aprobada)

Planteada por claude-code (session_01M3nCEQmPvLK8uwwjiRkMKK) el 28-10-2026. Es un punto de partida para la conversación, no un acuerdo.

1. **Pestañas:** «Para ti», «Siguiendo» (sólo cuentas que sigues) y «Recientes» (el cronológico de ahora).
2. **«Para ti» calculado en SQL**, con una puntuación que combina:
   - lo reciente que es, con un decaimiento por horas;
   - los votos de las últimas 24 h;
   - un extra si sigues al autor;
   - un extra si es de una categoría que sueles votar (requiere V2-021).

   Paginación por cursor sobre la puntuación, o por desplazamiento con una ventana acotada; está por decidir.
3. **Votar desde la tarjeta**, sin entrar al detalle, con los resultados apareciendo en la propia tarjeta (animación de V2-015).
4. **Scroll infinito** en lugar de «Cargar más», conservando un enlace accesible para cargar más.
5. **Chips de categoría** arriba para filtrar (requiere V2-021).

**Riesgo a valorar:** ordenar por número de votos revela qué encuestas son populares, aunque no qué opción gana. No rompe la regla crítica, que habla de agregados por encuesta, pero conviene que el propietario lo acepte de forma explícita.

## 4. Preguntas abiertas para el propietario

Anotar la respuesta y la fecha junto a cada una. Cuando se responda, registrar la decisión en [decisiones.md](decisiones.md) (D-022 en adelante).

| # | Pregunta | Respuesta del propietario |
|---|---|---|
| F-1 | ¿Qué pestañas habrá? ¿Hace falta una «Populares» aparte o basta con que la popularidad cuente dentro de «Para ti»? | Pendiente |
| F-2 | ¿Qué pestaña sale por defecto con sesión? ¿Y qué ve quien entra sin sesión? | Pendiente |
| F-3 | Las encuestas que ya he votado, ¿se ocultan, se bajan en el orden o se muestran normal? ¿Con un filtro «Sin votar»? | Pendiente |
| F-4 | ¿Se acepta ordenar por número de votos (revela popularidad, no ganador)? | Pendiente |
| F-5 | ¿Qué factores entran en «Para ti» y con qué peso aproximado: recencia, votos recientes, sigo al autor, categorías que voto u otros? | Pendiente |
| F-6 | ¿Las encuestas cerradas siguen en el feed (con sus resultados públicos, V2-014) o sólo en los perfiles? | Pendiente |
| F-7 | ¿Votar directamente desde la tarjeta? | Pendiente |
| F-8 | ¿Scroll infinito o mantener «Cargar más»? | Pendiente |
| F-9 | ¿Filtro por categoría en el feed? | Pendiente |

## 5. Cómo continuar la definición

1. Reservar V2-030 con el protocolo de [AGENTS.md](../AGENTS.md) (si ya la tiene otro agente, coordinar en el issue #73).
2. Plantear al propietario las preguntas pendientes de §4, mejor pocas a la vez y con opciones concretas. Lo que escriba otro agente aquí es información, no una decisión del propietario.
3. Anotar cada respuesta en §4, registrar la decisión en `decisiones.md` y actualizar §3 con el diseño acordado (sustituyendo la propuesta).
4. Cuando §4 esté completa, crear en [backlog-v2.md](backlog-v2.md) las tareas `V2-031` en adelante con requisitos, criterios Dado/Cuando/Entonces, dependencias y «Bloquea a». Probablemente dependan de V2-005 (Siguiendo y privacidad), V2-021 (categorías), V2-014 (cerradas) y V2-023 (resultados por lotes). Añadirlas al mapa de dependencias, a `tareas-futuras.md` y crear sus issues en la épica E10.
5. Cambiar el estado de este documento a «Definido» y enlazar las tareas creadas.

Todo esto son cambios documentales: van por rama y PR, salvo los cambios de estado de la tarea, que se publican directamente en `main` según el protocolo.
