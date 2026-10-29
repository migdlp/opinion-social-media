# Plantillas de los archivos del plan

Las plantillas de tarea y epic están en `task-template.md`. Aquí van las demás. Recorta secciones que no apliquen en lugar de dejarlas vacías.

## README.md

```markdown
# Plan: <nombre>

Estado: borrador | aprobado | en ejecución · Última actualización: <fecha>

## Resumen
2-4 frases: qué se construye, para quién, por qué.

## Cómo usar este plan
- Humanos: leer 00 → 01 → 02 → 03.
- Agente ejecutor: leer `AGENT_BRIEF.md` y luego la siguiente tarea en el orden de ejecución.

## Orden de ejecución
(Generado por validate_plan.py; las tareas del mismo nivel pueden hacerse en paralelo.)
| Nivel | Tareas |
|---|---|
| 1 | E01-T01 |
| 2 | E01-T02, E01-T03 |

## Epics
| ID | Título | Tareas | Estado |
|---|---|---|---|

## Supuestos a revisar
- SUPUESTO-1: …

## Preguntas abiertas que bloquean
- PA-1 (bloquea E03-T02): …

## Historial
- <fecha>: versión inicial.
```

## AGENT_BRIEF.md

```markdown
# Instrucciones para el agente ejecutor

## Tu trabajo
Implementar tareas de `tasks/` de una en una, en el orden de `README.md`, sin tomar decisiones de producto ni de arquitectura: ya están tomadas.

## Antes de cada tarea
1. Comprueba que todas sus `depends_on` están en `status: done`.
2. Lee la tarea entera y los archivos de código que menciona.
3. Cambia su `status` a `in_progress`.

## Durante
- Toca solo los archivos listados en "Archivos". Si necesitas otro, para y reporta.
- Sigue las convenciones: <resumen de 3-6 líneas: lenguaje, estilo, patrones, carpeta de tests>.
- No añadas dependencias, no cambies el esquema, no refactorices fuera del alcance.
- Si algo de la tarea contradice el código real o es ambiguo, NO improvises: marca `status: blocked`, añade una sección "Bloqueo" explicando qué encontraste y qué opciones ves, y para.

## Al terminar
1. Ejecuta todos los comandos de "Verificación"; deben pasar.
2. Marca cada criterio de aceptación.
3. Cambia `status` a `done` y añade una sección "Notas de implementación" (2-5 líneas: qué hiciste, cualquier desviación justificada).
4. Commit con mensaje `<ID>: <título>`.

## Comandos del proyecto
- Instalar: `…`
- Dev: `…`
- Tests: `…`
- Lint/typecheck: `…`
- Migraciones: `…`

## Entorno
Variables necesarias en local y de dónde obtenerlas.
```

## 00-overview.md

```markdown
# Visión

## Problema
## Usuarios y roles
| Rol | Quién es | Qué necesita |
## Objetivos
- O1: … (medible si es posible)
## No-objetivos
- Explícitamente fuera de esta versión: …
## Métricas de éxito
## Restricciones
Plazos, presupuesto, legal, técnicas.
## Glosario
Términos del dominio con definición única (evita que "cliente", "usuario" y "cuenta" se mezclen).
```

## 01-requirements.md

Cada requisito con ID estable. El validador detecta IDs con forma `RF-01`, `RNF-01` (o `FR-01`, `NFR-01`) al inicio de una línea, viñeta, encabezado o celda de tabla.

```markdown
# Requisitos

## Historias de usuario / flujos
### Flujo 1: <nombre>
1. El usuario …
2. El sistema …
Estados: vacío / cargando / error / éxito → qué se ve en cada uno.

## Requisitos funcionales
| ID | Requisito | Prioridad | Criterio de aceptación |
|---|---|---|---|
| RF-01 | El usuario puede registrarse con email y contraseña | Must | … |

## Reglas de negocio
- RF-10: Una reserva solo se puede cancelar con más de 24 h de antelación.

## Casos límite
| ID | Situación | Comportamiento |
|---|---|---|
| RF-20 | Email ya registrado al registrarse | Mensaje "…"; no revela si la cuenta está verificada |

## Requisitos no funcionales
| ID | Categoría | Requisito | Cómo se verifica |
|---|---|---|---|
| RNF-01 | Rendimiento | Listado de reservas < 300 ms p95 con 10k filas | test de carga en staging |
| RNF-02 | Seguridad | Un usuario no puede leer reservas de otra org | test de RLS |

Prioridad: Must / Should / Could / Won't (esta versión).
```

## 03-risks-open-questions.md

```markdown
# Riesgos, supuestos y preguntas abiertas

## Riesgos
| ID | Riesgo | Probabilidad | Impacto | Mitigación | Tarea |
|---|---|---|---|---|---|

## Supuestos
| ID | Supuesto | Si resulta falso… |
|---|---|---|

## Preguntas abiertas
| ID | Pregunta | Propuesta por defecto | Bloquea | Responsable |
|---|---|---|---|---|
```
