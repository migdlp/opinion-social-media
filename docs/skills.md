# Skills del proyecto

## karpathy-guidelines

- **Solicitud:** el propietario pidió añadir esta skill al proyecto.
- **Archivo local:** [SKILL.md](../.agents/skills/karpathy-guidelines/SKILL.md).
- **Origen:** https://github.com/multica-ai/andrej-karpathy-skills/blob/main/skills/karpathy-guidelines/SKILL.md
- **Revisión de origen:** `2c606141936f1eeef17fa3043a72095b4765b9c2`.
- **Fuente fijada:** https://github.com/multica-ai/andrej-karpathy-skills/blob/2c606141936f1eeef17fa3043a72095b4765b9c2/skills/karpathy-guidelines/SKILL.md
- **SHA-256 de la copia original, antes de la adaptación local:** `6e22cc54cb02a5e98ae42d06d9d7292db0c1b43894831b32879beb0166b2aea7`.
- **SHA-256 del archivo adaptado al proyecto:** `c4f8da06c3c3f5bbf21e1e8f269ae72ed43a503ce13864c5781e58b08243a098`.
- **Licencia declarada en el frontmatter original:** MIT. No se añade un texto de licencia inventado: la URL `LICENSE` de la raíz de origen no estaba disponible.

La skill conserva las pautas originales y añade una sección específica de Opinión por petición del propietario: estado compartido consultado y publicado directamente en `main`, implementación mediante rama/PR/merge y TDD obligatorio con pruebas antes del código. Está enlazada desde `AGENTS.md`. Se revisó su contenido: no contiene dependencias ejecutables ni requiere una instalación global.

Aplicarla no reanuda la implementación pausada ni modifica la prioridad de las instrucciones del propietario. Las futuras actualizaciones se harán revisando y fijando una nueva versión, no mediante descarga automática durante el trabajo.

## impeccable

- **Solicitud:** un colaborador pidió instalar esta skill en el proyecto («https://impeccable.style/#slop, instala esta skill en el proyecto», 27-10-2026).
- **Qué es:** guías de diseño de interfaces para agentes (jerarquía, tipografía, color, layout, accesibilidad, estados, copy) y comandos como `audit`, `critique`, `polish`, `distill`, `harden`. Web: https://impeccable.style.
- **Origen:** https://github.com/pbakaus/impeccable · **Revisión fijada:** `d34c87e1a00989ae8dbdd7f6b30b70f23319e860` (versión de la skill 4.8.0, motor 0.1.18).
- **Archivos locales:** dos variantes que publica el propio repositorio, copiadas sin modificar:
  - [.agents/skills/impeccable/SKILL.md](../.agents/skills/impeccable/SKILL.md), para Codex y agentes que leen `.agents/skills`;
  - [.claude/skills/impeccable/SKILL.md](../.claude/skills/impeccable/SKILL.md), para Claude Code, que la descubre automáticamente.
- **Huella de cada carpeta** (`find . -type f | sort | xargs sha256sum | sha256sum`): `.agents` → `aa0e7e68150753ac8ee4828807f91a3024819c817abffebae8517165a8a85b35`; `.claude` → `ce01bb48bff1a96ac1fd55b668a55c17c30b288b780ca13a4647d0b1c39b7437`.
- **Licencia:** Apache 2.0; `LICENSE` y `NOTICE.md` del origen copiados junto a cada variante.

### Revisión de seguridad

- `SKILL.md` y `reference/*.md` son texto. `scripts/impeccable` es un lanzador que, la primera vez que un agente lo ejecuta, descarga el binario del motor desde las releases de GitHub del proyecto a `~/.impeccable/bin/` y **verifica su SHA-256** contra `scripts/engine-checksums.txt`; si no coincide o no hay herramienta de hash, se niega a usarlo.
- **No se instalan los hooks** que el origen incluye en `.claude/settings.json` (ejecutarían el motor al iniciar cada sesión y tras cada edición). Activarlos (`/impeccable hooks on`) requiere una decisión explícita del propietario.
- No se ha ejecutado el lanzador ni descargado el motor durante la instalación. Si un agente no puede ejecutarlo, la propia skill indica leer el contexto directamente y seguir sin él.

### Relación con las reglas del proyecto

Se aplica al trabajo de interfaz (E03 y la revisión de UX). No sustituye el brief ni el backlog: identidad visual sencilla, mobile-first, accesibilidad básica y los componentes y rutas definidos. Las instrucciones del propietario, `AGENTS.md` y karpathy-guidelines prevalecen. Las actualizaciones se harán fijando una nueva revisión, no con `npx impeccable update` automático.

## graphify

- **Solicitud:** un colaborador pidió instalarla en el proyecto («instala esta skill: https://github.com/Graphify-Labs/graphify», 29-10-2026).
- **Qué es:** `/graphify` convierte el repositorio (código, docs, imágenes) en un grafo de conocimiento consultable (`graphify query`, `graphify path`, `graphify explain`) para que los agentes naveguen el código sin releer ficheros. El código se analiza en local con tree-sitter, sin LLM; el paso semántico sobre documentos usa el modelo del propio asistente (subagentes) y consume sus tokens.
- **Origen:** https://github.com/Graphify-Labs/graphify · **Revisión fijada:** etiqueta `v0.9.97`, commit `0a8cd4e1e342235fe53e881fb5d591bf0460071f`; paquete PyPI `graphifyy==0.9.97` (doble «y»; los demás `graphify*` no son oficiales).
- **Comprobado** (29-10-2026): `graphify update .` sobre `main` genera 4058 nodos y 8708 aristas sólo con AST, sin claves de API; `graphify query` y `graphify explain` localizan `votePoll`, `getPollResults` y `public.get_poll_results()` en sus ficheros.
- **Archivos locales**, generados con el instalador oficial (`graphify install --project` y `graphify install --project --platform agents`) y sin modificar; el `SKILL.md` de Claude es idéntico a `graphify/skill.md` del origen:
  - [.claude/skills/graphify/SKILL.md](../.claude/skills/graphify/SKILL.md), para Claude Code (`/graphify`);
  - [.agents/skills/graphify/SKILL.md](../.agents/skills/graphify/SKILL.md), para Codex y agentes que leen `.agents/skills` (`$graphify` en Codex).
- **Huella de cada carpeta** (`find . -type f | sort | xargs sha256sum | sha256sum`): `.agents` → `7d5f5f0f84a1083a334aac002c498c8d766ed5275f424de91e48a0c10c90613e`; `.claude` → `da8b18f398f9ffacd64707165d8809a511835150caae9d81c9ddab3c1ecca311`.
- **Licencia:** Apache 2.0 (partes anteriores bajo MIT); `LICENSE`, `LICENSE-MIT` y `NOTICE` del origen copiados junto a cada variante.

### Uso y requisitos

- La skill necesita la CLI `graphify` (Python 3.10+) en cada máquina o sesión de agente: `uv tool install "graphifyy[sql]==0.9.97"` (o `pipx install "graphifyy[sql]==0.9.97"`). El extra `[sql]` es necesario para que entren en el grafo las migraciones y pruebas de `supabase/`; sin él se omiten los 52 ficheros `.sql`. Si falta, la propia skill la instala desde PyPI **sin fijar versión**; instalarla antes con la versión fijada evita esa deriva.
- Uso: `/graphify .` para construir el grafo; `graphify update .` tras cambiar código (sólo AST, sin coste de API).
- La salida `graphify-out/` se ignora en Git (`.gitignore`): cada agente la regenera en local; no se publica.

### Revisión de seguridad y lo que no se instala

- `SKILL.md` y `references/*.md` son texto. Indican ejecutar la CLI local y, para documentos, lanzar subagentes del asistente. No se configuró ninguna clave de API de terceros: sin ella, nada sale de la máquina salvo lo que ya procesa el propio asistente.
- **No se instalan** los `PreToolUse` hooks que el instalador escribe en `.claude/settings.json` (`graphify hook-guard` antes de cada `Read`, `Grep`, `Glob` y `Bash`), ni las secciones que añade a `CLAUDE.md` y `.claude/CLAUDE.md` obligando a consultar el grafo antes de leer código. Fallarían en las sesiones sin la CLI y cambiarían el flujo de todos los agentes; activarlos requiere una decisión explícita del propietario.
- Tampoco se instalan los hooks de Git (`graphify hook install`) ni el modo `--watch`.

### Relación con las reglas del proyecto

Es una ayuda opcional de navegación. No sustituye leer los documentos obligatorios de `AGENTS.md`, ni el protocolo de reserva, ni TDD; las instrucciones del propietario, `AGENTS.md` y karpathy-guidelines prevalecen. Actualizarla consiste en fijar una nueva versión y regenerar ambas carpetas con el instalador de esa versión, no en actualizaciones automáticas.

## project-planner

- **Solicitud:** el propietario pidió incorporar al proyecto la skill de planificación (30-10-2026; «Mete la skill de planificación en el proyecto»).
- **Qué es:** planifica proyectos, features, epics o tareas hasta un nivel que un agente ejecutor pueda implementar sin decisiones pendientes: entrevista por rondas, barrido de puntos ciegos, arquitectura y ADRs, desglose en epics y tareas con dependencias y criterios de aceptación, y validación con `scripts/validate_plan.py`. Escribe los planes en `docs/plan/<slug>/`.
- **Origen:** skill sincronizada desde la cuenta de Claude del propietario (`anthropic-skills:project-planner`). No se ha localizado un repositorio público de origen, por lo que no hay URL de revisión fijada; el registro de la copia es la huella de abajo.
- **Licencia:** no declarada en la skill sincronizada; no se añade ningún texto de licencia inventado.
- **Archivos locales**, copiados sin modificar en ambas carpetas:
  - [.agents/skills/project-planner/SKILL.md](../.agents/skills/project-planner/SKILL.md), para Codex y agentes que leen `.agents/skills`;
  - [.claude/skills/project-planner/SKILL.md](../.claude/skills/project-planner/SKILL.md), para Claude Code.
  - Referencias en `references/` (banco de preguntas, puntos ciegos, arquitectura, plantillas de plan y de tarea) y el validador `scripts/validate_plan.py`.
- **Huella de cada carpeta** (`find . -type f | sort | xargs sha256sum | sha256sum`, ejecutado dentro de la carpeta `project-planner`): `1365c111033ff1ce3e052ea0ca6f4d772d5f2d4dc67ae778f01a452d3b180afe`, igual en `.agents` y en `.claude`.

### Revisión de seguridad

- `SKILL.md` y `references/*.md` son texto.
- `scripts/validate_plan.py` usa sólo la biblioteca estándar de Python (`re`, `sys`, `pathlib`). Lee ficheros Markdown de la carpeta del plan e imprime resultados; no abre conexiones de red, no ejecuta comandos ni escribe en el repositorio. Se comprobó con `python3 -I` sobre una carpeta vacía: sale con código 1 y el mensaje de «no se encontraron tareas», comportamiento esperado.
- No requiere instalar paquetes ni hooks.

### Relación con las reglas del proyecto

Es una ayuda para preparar planes. No modifica el backlog, `docs/tareas-futuras.md` ni el protocolo de reserva de `AGENTS.md`: cualquier plan que genere debe integrarse en esas fuentes siguiendo ese protocolo. Las instrucciones del propietario, `AGENTS.md` y karpathy-guidelines prevalecen. Actualizarla implica sustituir ambas copias por una versión revisada y registrar su nueva huella aquí.
