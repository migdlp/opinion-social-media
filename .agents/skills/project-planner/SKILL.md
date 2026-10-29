---
name: project-planner
description: Planifica proyectos, features, epics o conjuntos de tareas de software hasta un nivel de detalle que un agente ejecutor de menor nivel pueda implementar sin tomar decisiones. Entrevista por rondas para sacar requisitos, busca casos límite y puntos ciegos (usuario, datos, seguridad, rendimiento, operación), define arquitectura y decisiones técnicas, y escribe el plan como archivos .md en el repo (visión, requisitos, arquitectura, epics y tareas con dependencias y criterios de aceptación). Úsala siempre que el usuario quiera planificar, diseñar, especificar, desglosar o "pensar bien" un proyecto, app, feature, epic, roadmap, MVP, refactor o migración, escribir un PRD o spec técnica, o preparar trabajo para que lo ejecute otro agente, aunque no diga la palabra "plan".
---

# Project Planner

Convierte una idea (vaga o concreta) en un plan completo y ejecutable: requisitos claros, casos límite cubiertos, arquitectura decidida y tareas tan bien especificadas que un agente de menor capacidad pueda implementarlas una a una sin adivinar.

La idea central: **todas las decisiones se toman aquí, en planificación**. El agente ejecutor no debe elegir librerías, inventar nombres de tablas ni decidir qué pasa cuando un campo viene vacío. Cada ambigüedad que dejes pasar se convierte en una decisión aleatoria del ejecutor, y esas decisiones no son coherentes entre sí. Por eso el plan tiene que ser explícito hasta lo que parece obvio.

Responde y escribe el plan en el idioma del usuario.

## Escala del trabajo

Antes de nada, decide el tamaño, porque marca la profundidad de todo lo demás:

| Tamaño | Ejemplo | Rondas de entrevista | Salida |
|---|---|---|---|
| **Tarea** | "añade exportar a CSV" | 1 ronda corta | 1 archivo de tarea (o 2-4 subtareas) |
| **Epic / feature** | "sistema de notificaciones" | 2-3 rondas | requisitos + arquitectura ligera + epic + tareas |
| **Proyecto** | "app de reservas desde cero" | 3-5 rondas | plan completo (ver estructura abajo) |

Si dudas entre dos tamaños, pregunta. No infles una tarea pequeña con un plan de proyecto: el exceso de documento también es ruido para el ejecutor.

## Flujo

### Fase 1 — Recoger contexto antes de preguntar

No hagas preguntas cuya respuesta puedas averiguar tú. Antes de la primera ronda:

- Si hay un repo: lee README, manifest de dependencias (package.json, pyproject, pubspec, etc.), estructura de carpetas, esquema de BD/migraciones, configuración de CI, convenciones (linters, tests existentes), y cualquier doc/plan previo. Anota stack, patrones y restricciones reales.
- Si hay herramientas conectadas relevantes (BD, hosting, issue tracker), úsalas para leer el estado actual (tablas existentes, proyectos desplegados).
- Si el usuario adjuntó documentos, mockups o specs, léelos.

Resume en 3-6 líneas lo que ya sabes ("Veo Next.js 15 + Supabase, auth con email, sin tests e2e…") para que el usuario corrija si te equivocas. Esto ahorra rondas.

### Fase 2 — Entrevista por rondas

Lee `references/discovery-questions.md` para el banco de preguntas por bloque.

Reglas de la entrevista:
- **Rondas cortas**: 3-6 preguntas por ronda, agrupadas por tema. Muchas preguntas de golpe agotan al usuario y responde peor.
- **Propón siempre una respuesta por defecto** razonable ("Propongo X porque Y — ¿te vale?"). El usuario confirma más rápido de lo que redacta, y así avanzas aunque no tenga opinión.
- **Usa preguntas de opción múltiple** cuando las opciones son claras (si hay herramienta de preguntas, úsala).
- **Ordena de lo general a lo concreto**: Ronda 1 = problema, usuarios, objetivo, alcance y no-alcance. Ronda 2 = flujos principales y reglas de negocio. Ronda 3 = casos límite y requisitos no funcionales. Ronda 4+ = decisiones técnicas abiertas.
- **Profundiza donde hay incertidumbre**, no recorras el checklist entero en voz alta. Si una respuesta abre una rama nueva (p. ej. "hay pagos"), haz la siguiente ronda sobre esa rama.
- **Reformula lo entendido** al final de cada ronda en 2-4 viñetas antes de seguir.
- Para cuando cada requisito sea comprobable y no queden preguntas que cambien la arquitectura o el desglose. Lo que quede sin resolver va a "preguntas abiertas" con un supuesto explícito.

Si el usuario dice "decide tú" o no está disponible: toma la opción más conservadora y estándar, márcala como **SUPUESTO** en el plan, y sigue.

### Fase 3 — Barrido de puntos ciegos

Con los requisitos casi cerrados, recorre `references/blind-spots-checklist.md` en silencio. Para cada categoría que aplique al proyecto, pregúntate qué falta. Luego:
- Lo que tenga respuesta estándar evidente → decídelo tú y anótalo como requisito.
- Lo que cambie el producto o tenga coste → llévalo al usuario en una ronda final de "cosas que no habíamos pensado", con tu propuesta para cada una.

Esta fase es la que más valor aporta: los planes mediocres fallan aquí (estados vacíos, errores de red, permisos, concurrencia, datos borrados, límites, zonas horarias, migración de datos existentes…).

### Fase 4 — Arquitectura y decisiones

Lee `references/architecture-guide.md`. Define, según el tamaño:
- Componentes y responsabilidades, y cómo se comunican.
- Modelo de datos completo: entidades, campos con tipo, nulabilidad, índices, relaciones, reglas de borrado, políticas de acceso.
- Contratos: endpoints/funciones con entrada, salida y errores; eventos; formatos.
- Decisiones técnicas como ADRs cortos (contexto → opciones → decisión → consecuencias). Cada librería o servicio nuevo es una decisión.
- Estrategia de testing, entornos, despliegue, migraciones y rollback.

Si el repo ya tiene patrones, **síguelos** y dilo; no propongas una arquitectura nueva sin motivo.

### Fase 5 — Desglose en epics y tareas

Lee `references/task-template.md`. Principios:
- **Tareas verticales cuando sea posible** (una porción funcional de punta a punta) y con un resultado verificable. Las tareas puramente horizontales ("crear todos los modelos") solo para cimientos.
- **Tamaño de tarea para un agente de menor nivel**: una sesión de trabajo, idealmente ≤5 archivos tocados y un único objetivo. Si necesitas la palabra "y" para describir el objetivo, probablemente son dos tareas.
- **Autocontenida**: el ejecutor solo leerá ese archivo y los que enlace. Repite el contexto necesario (nombres exactos, rutas, firmas, decisiones) en lugar de decir "ver arriba".
- **Cero decisiones pendientes**: nombres de archivos, funciones, tablas, textos de UI y mensajes de error ya decididos. Si algo no puede decidirse aún, la tarea queda bloqueada por una pregunta abierta, no se deja al criterio del ejecutor.
- **Criterios de aceptación comprobables** y **comandos exactos de verificación** (tests, lint, build, pasos manuales).
- **Dependencias explícitas** por ID. Orden: cimientos (setup, esquema, auth) → núcleo → bordes (errores, vacíos) → pulido → operación (monitorización, docs).
- Incluye tareas que se suelen olvidar: seeds/datos de prueba, migraciones de datos existentes, variables de entorno, tests e2e del flujo principal, accesibilidad, observabilidad, documentación de despliegue.

### Fase 6 — Escribir el plan

Estructura (para "Proyecto"; recorta para tamaños menores). Por defecto en `docs/plan/<slug>/` del repo, o donde el usuario indique:

```
docs/plan/<slug>/
├── README.md              # índice, estado, orden de ejecución, cómo usar el plan
├── AGENT_BRIEF.md         # instrucciones para el agente ejecutor
├── 00-overview.md         # problema, usuarios, objetivos, no-objetivos, métricas
├── 01-requirements.md     # RF-xx, RNF-xx, historias, casos límite, reglas de negocio
├── 02-architecture.md     # componentes, modelo de datos, contratos, ADRs, entornos
├── 03-risks-open-questions.md  # riesgos, supuestos, preguntas abiertas
├── epics/E01-<slug>.md
└── tasks/E01-T01-<slug>.md
```

Las plantillas de cada archivo están en `references/plan-templates.md`. Para "Tarea" basta con el/los archivo(s) de tarea; para "Epic", omite 00 si el contexto ya existe y fusiona 02 en el epic si es ligera.

Construye en este orden: overview → requisitos → arquitectura → epics → tareas → README → AGENT_BRIEF. Las tareas al final, porque dependen de todo lo anterior.

**Trazabilidad**: cada tarea cita los requisitos (RF-/RNF-) que cubre, y cada requisito debe quedar cubierto por al menos una tarea.

### Fase 7 — Validar

Ejecuta el validador:

```bash
python <ruta-de-esta-skill>/scripts/validate_plan.py docs/plan/<slug>
```

Comprueba secciones obligatorias en tareas, IDs únicos, dependencias existentes, ciclos, requisitos sin cubrir y palabras de ambigüedad ("etc.", "TBD", "según convenga"…). Genera el orden de ejecución topológico. Corrige lo que marque y vuelve a ejecutarlo.

Después, haz una revisión con ojos de ejecutor: elige 2-3 tareas al azar y pregúntate "si solo tuviera este archivo y fuera un agente literal, ¿sabría exactamente qué hacer y cuándo he terminado?". Si no, reescríbelas.

### Fase 8 — Entregar

Resume al usuario en pocas líneas: tamaño del plan (nº epics/tareas), decisiones clave tomadas, supuestos que debe revisar, preguntas abiertas que bloquean algo, y por qué tarea empezar. No repitas el plan entero en el chat.

## Mantener el plan vivo

Si el usuario vuelve con cambios ("ahora también queremos X"): actualiza requisitos → arquitectura si cambia → añade/modifica tareas con nuevos IDs (no renumeres los existentes, el ejecutor puede estar a mitad) → revalida. Anota el cambio en una sección "Historial" del README.
