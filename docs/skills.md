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
