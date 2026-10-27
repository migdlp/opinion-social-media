# Instrucciones del proyecto

## Alcance vigente

El propietario ha pedido **pausar la implementación** y organizar primero el contexto de la aplicación, los documentos y las tareas futuras. Incorporar sus próximos mensajes a `docs/` y mantener la trazabilidad de decisiones y requisitos.

- Leer `README.md`, `docs/contexto-aplicacion.md`, `docs/decisiones.md`, `docs/estado-proyecto.md` y `docs/supabase-acceso.md` antes de trabajar.
- Hasta recibir una instrucción explícita de reanudar, limitar los cambios a documentación y planificación, incluida la creación de épicas y tickets en GitHub Issues solicitada por el brief, y comprobaciones de acceso de solo lectura cuando sean necesarias.
- No implementar código, aplicar SQL, configurar OAuth, crear más infraestructura ni desplegar mientras esté vigente esta pausa.
- Mantener las tareas futuras como pendientes; no equiparar documentación o borradores con implementación verificada.
- No guardar secretos, tokens ni claves administrativas en Git.
- Informar del avance en español y registrar cualquier bloqueo real.

## Contexto obligatorio de conexión a Supabase

La organización de Supabase de este proyecto es **Los tres cerditos**, ID `drifadkhohwebqljdlvw`, región **Irlanda (`eu-west-1`)**. Estos proyectos ya existen: no crear otra organización ni otros proyectos para sustituirlos si falta acceso.

| Uso | Proyecto | Project ref | API URL |
|---|---|---|---|
| Desarrollo local, previews y trabajo de agentes | `opinion-social-media-dev` | `ltlrujmqenhktiilsnis` | `https://ltlrujmqenhktiilsnis.supabase.co` |
| Producción, sólo para tareas de producción autorizadas | `opinion-social-media-prod` | `qchpdrolulcgmiliysvr` | `https://qchpdrolulcgmiliysvr.supabase.co` |

Antes de conectar, leer [la guía de acceso](docs/supabase-acceso.md) y comprobar que la referencia elegida es la de desarrollo. Durante la pausa, usar MCP de desarrollo en modo de solo lectura:

```text
https://mcp.supabase.com/mcp?project_ref=ltlrujmqenhktiilsnis&read_only=true
```

Cada cliente o entorno de agente debe completar su propia autorización OAuth con una cuenta que tenga acceso a **Los tres cerditos**. Clonar este repositorio no concede acceso. Si falta, comunicar el bloqueo al propietario para que conecte el cliente o invite la cuenta desde [Team](https://supabase.com/dashboard/org/drifadkhohwebqljdlvw/team); no pedir que pegue tokens, contraseñas o claves administrativas en el chat o en Git.

Para el SDK de la app, cuando se reanude, usar URL y Publishable key del mismo proyecto mediante configuración del entorno. No usar una clave publicable como credencial de administración ni exponer claves privilegiadas. No conectar desarrollo o previews a producción.

La última verificación confirmó acceso SQL y Auth en ambos proyectos, `public` vacío y Google OAuth deshabilitado. Es un estado observado, no una configuración que deba restaurarse automáticamente: comprobar el estado actual antes de cualquier tarea futura. Falta de tablas no significa que deba crearse otro proyecto.

## Contratos a preservar cuando se reanude

El backlog vigente está en `docs/backlog.md`; el original está archivado en `docs/fuentes/backlog-v1.md`. Leer también `docs/brief-producto.md` y su matriz de cobertura. No implementar borradores ni alterar los nombres de campos obligatorios del brief. La regla crítica es que ningún usuario, incluido el autor, pueda obtener agregados de una encuesta antes de votar. La autorización debe imponerse en Supabase, no sólo en la interfaz. Los entornos de preview/desarrollo no usarán la base de producción.

## Skill del proyecto

Leer y aplicar [karpathy-guidelines](.agents/skills/karpathy-guidelines/SKILL.md) al escribir, revisar o refactorizar código y, cuando corresponda, al planificar cambios: explicitar supuestos relevantes, buscar la solución sencilla, limitar el cambio al alcance pedido y verificar objetivos concretos. La petición actual sigue limitada a documentación y planificación. Las instrucciones del propietario y las de mayor prioridad prevalecen sobre la skill.

La copia local conserva las pautas originales y añade las reglas específicas de colaboración y TDD de este proyecto; su procedencia y revisión están en [docs/skills.md](docs/skills.md). No requiere instalar paquetes ni ejecutar scripts externos.

Para trabajo de interfaz, aplicar además [impeccable](.agents/skills/impeccable/SKILL.md) (variante para Claude Code en `.claude/skills/impeccable/`) sin contradecir el brief: diseño sencillo, mobile-first y accesible. Sus hooks no están activados; procedencia, revisión fijada y alcance en [docs/skills.md](docs/skills.md).

## Reserva y seguimiento obligatorio de tareas

Estas reglas se aplican cuando el propietario reanude la implementación. No iniciar tareas mientras siga la pausa.

1. Leer `docs/tareas-futuras.md`, `docs/orden-ejecucion.md` y el issue correspondiente. Elegir una tarea pendiente cuyas dependencias estén completadas y verificadas; atender P0 antes de P1.
2. Antes de elegir o empezar una tarea y antes de cada cambio de estado, actualizar la referencia remota de `main` desde GitHub y consultar allí `docs/tareas-futuras.md`: el estado vigente de `main` es la fuente compartida de disponibilidad, no una copia antigua ni una rama de implementación. Comprobar que la tarea no esté ocupada. En su fila, cambiar el estado a **En progreso** y escribir en **Agente** el nombre o identificador real del agente que la ejecuta. Usar un identificador estable y distinguible; nunca inventar una persona o asignar trabajo a otro agente sin acuerdo.
3. Hacer un commit exclusivo de la reserva directamente en `main` y publicarlo antes de comenzar los cambios de implementación, para que todos puedan verla desde `main`. Refrescar `main` justo antes de publicar y usar un push normal, nunca forzado. Si el push se rechaza porque avanzó `main`, releer su estado remoto actualizado antes de rehacer el cambio: si otro agente reservó la tarea entretanto, respetar su reserva y elegir otra tarea disponible o coordinar explícitamente el traspaso. No sobrescribir al responsable actual ni iniciar la implementación sin la reserva publicada.
4. Actualizar el cuerpo del issue con el mismo estado y agente, manteniendo descripción, prioridad, criterios y dependencias. No confundir la cuenta de GitHub que publica el cambio con la identidad del agente. Asignar un usuario de GitHub sólo si existe una correspondencia real y autorizada.
5. Mantener ambos registros al cambiar de situación: **Bloqueada** con causa y siguiente paso; **Pendiente** y agente `—` si se libera; **Completada** sólo con criterios verificados y enlaces a cambios y pruebas. Publicar cada cambio de estado, responsable o traspaso mediante un commit exclusivo directamente en `main`, con la misma comprobación de concurrencia que la reserva, y sincronizar el issue. Al completar, conservar el agente como autor del trabajo y cerrar el issue cuando corresponda.
6. Si un traspaso es necesario, registrar el agente entrante, el saliente y el estado de los cambios. Una sesión interrumpida no demuestra por sí sola que la tarea haya terminado ni autoriza borrar su reserva.

Las prioridades P0/P1 y el orden sugerido están documentados en `docs/orden-ejecucion.md`. El orden es orientativo; las dependencias y las reservas vigentes determinan qué tarea está disponible. Este protocolo no requiere desplegar ni ejecutar acciones ajenas a la tarea.

## Ramas, pull requests y merge obligatorios

1. Realizar cada tarea en una rama propia creada desde `main` actualizado. Usar un nombre que identifique la tarea, por ejemplo `codex/MVP-013-contratos-rpc`. Respetar la reserva y el seguimiento anteriores antes de iniciar la implementación.
2. Publicar los commits en esa rama y abrir una pull request hacia `main`, enlazando el issue e indicando el alcance, los criterios de aceptación y las comprobaciones realizadas, incluidos fallos o comprobaciones pendientes.
3. Fusionar la PR en `main` sólo cuando se hayan verificado los criterios de aceptación, pasado las comprobaciones aplicables y resuelto los conflictos y las observaciones pendientes. Respetar las revisiones y protecciones que tenga configuradas el repositorio; no eludirlas.
4. Tras el merge, actualizar la copia local y sincronizar el registro de tareas y el issue con enlaces a la PR, al merge y a las pruebas. Marcar la tarea **Completada** y cerrar el issue sólo cuando su resultado esté integrado y verificado; abrir una PR no equivale a terminarla.
5. Los commits exclusivos de reserva y actualización de estado, responsable o traspaso de tareas se publican directamente en `main`, como exige el protocolo anterior. No mezclar código ni otros cambios documentales en esos commits. Para el resto de cambios, incluida la documentación, usar rama y PR; cualquier otra publicación directa en `main` requiere una excepción explícita del propietario para el cambio concreto. Esta regla no reanuda la implementación pausada.

## TDD obligatorio

Por instrucción explícita del propietario, toda implementación o corrección de comportamiento se realiza con TDD: escribir las pruebas antes del código que deben verificar. No es opcional ni depende de que ya exista una suite.

1. Antes de implementar, identificar y registrar el runner y el comando real aplicable al proyecto. Si aún no existe infraestructura de pruebas, prepararla y verificar que ejecuta antes de iniciar el comportamiento; no inventar comandos ni usar una dependencia ausente como prueba de RED.
2. **RED:** escribir primero la prueba del comportamiento esperado y ejecutarla. Observar que falla por el comportamiento ausente o incorrecto antes de escribir el código de producción.
3. **GREEN:** implementar el mínimo necesario y ejecutar la prueba hasta que pase, junto con las comprobaciones aplicables.
4. **REFACTOR:** mejorar el código sólo manteniendo las pruebas en verde y volver a ejecutar las comprobaciones afectadas.
5. Registrar en la tarea y la PR los comandos ejecutados y los resultados observados de RED, GREEN y REFACTOR, incluidos fallos o bloqueos. No declarar ciclos que no se hayan ejecutado.

Los cambios exclusivamente documentales se verifican mediante revisión de contenido, coherencia y enlaces; registrar esa comprobación sin inventar pruebas ejecutables ni un ciclo RED/GREEN de aplicación.
