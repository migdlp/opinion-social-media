# Instrucciones del proyecto

## Alcance vigente

El propietario pausó la implementación (D-005) y la **reanudó el 26 de octubre de 2026** (D-013, `docs/decisiones.md`). Incorporar sus próximos mensajes a `docs/` y mantener la trazabilidad de decisiones y requisitos.

- Leer `README.md`, `docs/contexto-aplicacion.md`, `docs/decisiones.md`, `docs/estado-proyecto.md` y `docs/supabase-acceso.md` antes de trabajar.
- Trabajar tarea a tarea según `docs/orden-ejecucion.md` y el protocolo de reserva de abajo.
- Configurar OAuth, aplicar SQL en proyectos Supabase, crear infraestructura o desplegar sólo cuando lo exija la tarea reservada y se disponga de los datos y confirmaciones necesarios.
- No equiparar documentación o borradores con implementación verificada.
- No guardar secretos, tokens ni claves administrativas en Git.
- Informar del avance en español y registrar cualquier bloqueo real.

## Contexto obligatorio de conexión a Supabase

La organización de Supabase de este proyecto es **Los tres cerditos**, ID `drifadkhohwebqljdlvw`, región **Irlanda (`eu-west-1`)**. Estos proyectos ya existen: no crear otra organización ni otros proyectos para sustituirlos si falta acceso.

| Uso | Proyecto | Project ref | API URL |
|---|---|---|---|
| Desarrollo local, previews y trabajo de agentes | `opinion-social-media-dev` | `ltlrujmqenhktiilsnis` | `https://ltlrujmqenhktiilsnis.supabase.co` |
| Producción, sólo para tareas de producción autorizadas | `opinion-social-media-prod` | `qchpdrolulcgmiliysvr` | `https://qchpdrolulcgmiliysvr.supabase.co` |

Antes de conectar, leer [la guía de acceso](docs/supabase-acceso.md) y comprobar que la referencia elegida es la de desarrollo. Salvo que la tarea reservada requiera escribir en desarrollo, usar MCP de desarrollo en modo de solo lectura:

```text
https://mcp.supabase.com/mcp?project_ref=ltlrujmqenhktiilsnis&read_only=true
```

Cada cliente o entorno de agente debe completar su propia autorización OAuth con una cuenta que tenga acceso a **Los tres cerditos**. Clonar este repositorio no concede acceso. Si falta, comunicar el bloqueo al propietario para que conecte el cliente o invite la cuenta desde [Team](https://supabase.com/dashboard/org/drifadkhohwebqljdlvw/team); no pedir que pegue tokens, contraseñas o claves administrativas en el chat o en Git.

Para el SDK de la app, cuando se reanude, usar URL y Publishable key del mismo proyecto mediante configuración del entorno. No usar una clave publicable como credencial de administración ni exponer claves privilegiadas. No conectar desarrollo o previews a producción.

La última verificación confirmó acceso SQL y Auth en ambos proyectos, `public` vacío y Google OAuth deshabilitado. Es un estado observado, no una configuración que deba restaurarse automáticamente: comprobar el estado actual antes de cualquier tarea futura. Falta de tablas no significa que deba crearse otro proyecto.

## Contratos a preservar cuando se reanude

El backlog vigente está en `docs/backlog.md`; el original está archivado en `docs/fuentes/backlog-v1.md`. Leer también `docs/brief-producto.md` y su matriz de cobertura. No implementar borradores ni alterar los nombres de campos obligatorios del brief. La regla crítica es que ningún usuario, incluido el autor, pueda obtener agregados de una encuesta antes de votar. La autorización debe imponerse en Supabase, no sólo en la interfaz. Los entornos de preview/desarrollo no usarán la base de producción.

## Skill del proyecto

Leer y aplicar [karpathy-guidelines](.agents/skills/karpathy-guidelines/SKILL.md) al escribir, revisar o refactorizar código y, cuando corresponda, al planificar cambios: explicitar supuestos relevantes, buscar la solución sencilla, limitar el cambio al alcance pedido y verificar objetivos concretos. Las instrucciones del propietario y las de mayor prioridad prevalecen sobre la skill.

La copia local mantiene el contenido de la fuente solicitada; su procedencia y revisión están en [docs/skills.md](docs/skills.md). No requiere instalar paquetes ni ejecutar scripts externos.

## Reserva y seguimiento obligatorio de tareas

Estas reglas se aplican desde la reanudación (D-013).

1. Leer `docs/tareas-futuras.md`, `docs/orden-ejecucion.md` y el issue correspondiente. Elegir una tarea pendiente cuyas dependencias estén completadas y verificadas; atender P0 antes de P1.
2. Antes de trabajar, actualizar la copia desde GitHub y comprobar que la tarea no esté ocupada. En su fila de `docs/tareas-futuras.md`, cambiar el estado a **En progreso** y escribir en **Agente** el nombre o identificador real del agente que la ejecuta. Usar un identificador estable y distinguible; nunca inventar una persona o asignar trabajo a otro agente sin acuerdo.
3. Guardar y publicar esta reserva antes de comenzar los cambios de implementación, para que los demás agentes puedan verla. Si otro agente reservó la tarea entretanto, respetar su reserva y elegir otra tarea disponible o coordinar explícitamente el traspaso. No sobrescribir al responsable actual.
4. Actualizar el cuerpo del issue con el mismo estado y agente, manteniendo descripción, prioridad, criterios y dependencias. No confundir la cuenta de GitHub que publica el cambio con la identidad del agente. Asignar un usuario de GitHub sólo si existe una correspondencia real y autorizada.
5. Mantener ambos registros al cambiar de situación: **Bloqueada** con causa y siguiente paso; **Pendiente** y agente `—` si se libera; **Completada** sólo con criterios verificados y enlaces a cambios y pruebas. Al completar, conservar el agente como autor del trabajo y cerrar el issue cuando corresponda.
6. Si un traspaso es necesario, registrar el agente entrante, el saliente y el estado de los cambios. Una sesión interrumpida no demuestra por sí sola que la tarea haya terminado ni autoriza borrar su reserva.

Las prioridades P0/P1 y el orden sugerido están documentados en `docs/orden-ejecucion.md`. El orden es orientativo; las dependencias y las reservas vigentes determinan qué tarea está disponible. Este protocolo no requiere desplegar ni ejecutar acciones ajenas a la tarea.
