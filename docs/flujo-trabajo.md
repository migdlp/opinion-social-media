# Flujo de trabajo del proyecto

[← Volver al repositorio](../README.md) · [Tareas y responsables](tareas-futuras.md) · [Coordinación de agentes #73](https://github.com/migdlp/opinion-social-media/issues/73) · [Acciones de CI](https://github.com/migdlp/opinion-social-media/actions)

Este mapa describe el proceso vigente a **30 de octubre de 2026**, según [AGENTS.md](../AGENTS.md). Los diagramas se muestran directamente en GitHub con Mermaid. `main` integra el desarrollo; `release` contiene la versión publicada. **Fusionar una tarea en `main` no publica la aplicación.**

## De la petición a una tarea terminada

```mermaid
flowchart TD
    accTitle: Ciclo de trabajo de una tarea
    accDescr: Petición, backlog, reserva publicada, rama propia, pruebas y PR, integración, actualización del estado y cierre del issue. Los bloqueos se registran y las reservas se liberan de forma explícita.
    A["Petición o fallo detectado"] --> B["Issue con alcance, aceptación,<br/>prioridad y dependencias"]
    B --> C["Actualizar main remoto y leer tareas<br/>y coordinación de agentes en #73"]
    C --> D{"¿Disponible y con<br/>dependencias verificadas?"}
    D -->|No| E["Respetar la reserva o dependencia<br/>coordinar y elegir otra tarea"]
    E --> C
    D -->|Sí| F["Commit exclusivo en main:<br/>En progreso + agente real<br/>Publicar y sincronizar el issue"]
    F --> G["Crear rama propia desde main<br/>y avisar de archivos compartidos en #73"]
    G --> H["Implementar con TDD:<br/>RED → GREEN → REFACTOR"]
    H --> I["Abrir PR hacia main<br/>con cambios y pruebas observadas"]
    I --> J{"¿Criterios, revisión y<br/>comprobaciones correctos?"}
    J -->|Falta algo| H
    J -->|Sí| K["Fusionar la PR en main"]
    K --> L["Actualizar main remoto<br/>Commit exclusivo: Completada + evidencias"]
    L --> M["Actualizar y cerrar el issue<br/>Dejar relevo en #73"]
    H -. Bloqueo real .-> N["Registrar causa y siguiente paso<br/>Sincronizar main e issue<br/>Liberar o traspasar reserva explícitamente"]
    N -. Cuando se resuelva .-> C
    classDef work fill:#F9F9FF,stroke:#354861,color:#161E2E;
    classDef gate fill:#FFE1C2,stroke:#A64B00,color:#161E2E;
    class A,B,C,E,F,G,H,I,K,L,M,N work;
    class D,J gate;
```

Se eligen P0 disponibles antes de P1, respetando el encargo concreto del propietario. Cada agente trabaja con su identificador real y reserva antes de implementar; no ocupa tareas de otra IA. Un push rechazado obliga a releer `main`, comprobar la reserva y rehacer la actualización sin forzar.

Las reservas, cambios de estado y traspasos llevan **commits exclusivos directamente a `main`**. El código y el resto de la documentación pasan por rama y PR. Al terminar se conserva el agente como autor de la tarea completada; eso no mantiene una reserva activa. Una sesión interrumpida tampoco libera automáticamente una tarea ajena.

TDD se aplica al comportamiento: la prueba falla por el problema real antes de implementar, pasa con el cambio y sigue pasando al refactorizar. La documentación se comprueba por contenido, coherencia, enlaces y render; no se inventa un ciclo TDD de aplicación. Las pruebas y bloqueos quedan registrados en el issue y la PR.

## Dónde se desarrolla y dónde se prueba

```mermaid
flowchart TD
    accTitle: Separación de desarrollo, pruebas y producción
    accDescr: Las ramas de tarea y main se verifican en local y CI. El desarrollo alojado usa Supabase dev; CI crea bases locales efímeras. Sólo release despliega Vercel y usa Supabase prod.
    A["Rama de tarea / main"] --> B["App local y pruebas manuales<br/>Configuración de desarrollo"]
    B --> C["Supabase DEV<br/>ltlrujmqenhktiilsnis"]
    A --> D["GitHub Actions<br/>en pushes y PR"]
    D --> E["Formato, lint, tipos, unitarias y build<br/>SQL, concurrencia y reproducibilidad<br/>Seguridad HTTP, E2E y secretos"]
    E --> G["Pruebas de datos sobre<br/>PostgreSQL / Supabase efímeros<br/>localhost y datos sintéticos"]
    R["release<br/>versión autorizada"] --> V["Vercel Production"]
    V --> P["Supabase PROD<br/>qchpdrolulcgmiliysvr"]
    classDef work fill:#F9F9FF,stroke:#354861,color:#161E2E;
    classDef production fill:#161E2E,stroke:#B4C8F5,color:#F9F9FF;
    class A,B,C,D,E,G work;
    class R,V,P production;
```

| Destino                                       | Uso y límites                                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Rama de tarea                                 | Código/documentación aislados, PR hacia `main`. No despliega en Vercel.                                                                                       |
| `main`                                        | Integración y registro compartido de tareas. Puede contener funciones aún pendientes de activar en dev o publicar.                                            |
| Supabase dev                                  | Desarrollo y pruebas manuales alojadas. Organización **Los tres cerditos**, Irlanda. Migraciones sólo dentro de su tarea y con las verificaciones necesarias. |
| Supabase/PostgreSQL local o de CI             | Suites automáticas con datos sintéticos; no prueban contra las bases alojadas dev/prod.                                                                       |
| Vercel Preview                                | Desactivado para ahorrar cuota. Tener variables Preview configuradas con dev no crea una URL de preview.                                                      |
| `release` + Vercel Production + Supabase prod | Versión pública. No se usa para desarrollar ni para suplir migraciones que falten en dev.                                                                     |

La configuración efectiva está en [vercel.json](../vercel.json), [el guard de build](../scripts/vercel-ignore-build.mjs), [la pipeline](../.github/workflows/ci.yml) y [la guía de entornos](entornos.md). **La CI valida migraciones en bases efímeras; no las aplica automáticamente a Supabase alojado.** Las claves publicables corresponden al proyecto de cada entorno; los secretos y `.env.local` no se guardan en Git.

## Publicar una versión

```mermaid
flowchart TD
    accTitle: Publicación autorizada de una versión
    accDescr: Una versión de main validada y con recuperación revisada se propone mediante PR a release. El propietario autoriza esa versión, se preparan los cambios productivos necesarios, se fusiona y Vercel despliega; después se verifica el resultado y se registra o gestiona una incidencia.
    A["Candidato de main<br/>SHA y tareas incluidas identificados"] --> B["Cerrar el alcance de la versión<br/>CI del candidato verde, incluidos E2E<br/>y flujos críticos verificados"]
    B --> C["Validar integración en dev<br/>Revisar compatibilidad, migraciones,<br/>Auth y recuperación productiva"]
    C --> D["Abrir PR de main a release<br/>con SHA, tareas y evidencias"]
    D --> E{"¿El propietario autoriza<br/>esa versión?"}
    E -->|Pendiente| W["La versión permanece en main"]
    E -->|Sí| F["Completar preflight y operaciones<br/>productivas necesarias y autorizadas<br/>según el runbook"]
    F --> G["Fusionar la PR en release"]
    G --> H["Vercel despliega release<br/>con configuración de producción"]
    H --> I{"¿READY y flujos públicos<br/>verificados?"}
    I -->|Sí| J["Registrar URL, SHA, ledger,<br/>evidencias y resultado de la release"]
    I -->|No| K["Registrar incidente y coordinar<br/>corrección o recuperación<br/>según el runbook"]
    classDef work fill:#F9F9FF,stroke:#354861,color:#161E2E;
    classDef gate fill:#FFE1C2,stroke:#A64B00,color:#161E2E;
    classDef production fill:#161E2E,stroke:#B4C8F5,color:#F9F9FF;
    class A,B,C,D,W,F,J,K work;
    class E,I gate;
    class G,H production;
```

Un requisito pendiente mantiene la versión bloqueada en `main`; abrir una PR de publicación no autoriza su merge. La operación de Vercel corresponde a **Codex /root (opinion_social_media)** salvo traspaso registrado. Las operaciones de infraestructura/datos requieren la tarea y la autorización aplicables. Un despliegue READY no sustituye las pruebas funcionales; volver el frontend a una versión anterior tampoco revierte la base de datos. Los hotfixes productivos parten de `release`, llevan PR hacia `release` y después se integran en `main`.

## Cómo saber qué está pasando ahora

| Consulta                                                                  | Fuente vigente                                                                                                                               |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Qué tarea está libre, en progreso, bloqueada o completada; quién la lleva | [Registro en main](https://github.com/migdlp/opinion-social-media/blob/main/docs/tareas-futuras.md) y el issue de la tarea                   |
| Archivos compartidos, avisos y relevo entre IAs                           | [Canal #73](https://github.com/migdlp/opinion-social-media/issues/73); no sustituye la reserva                                               |
| Prioridad y dependencias                                                  | [Orden de ejecución](orden-ejecucion.md), backlog e issue; el número del issue no determina el orden                                         |
| Cambios propuestos o integrados                                           | [Pull requests](https://github.com/migdlp/opinion-social-media/pulls) y [CI](https://github.com/migdlp/opinion-social-media/actions)         |
| Qué está publicado y qué falta activar                                    | [Estado del proyecto](estado-proyecto.md), [última release documentada](rel-002-tema-cuenta.md) y [operación de Vercel](vercel-operacion.md) |
| Reglas obligatorias                                                       | [AGENTS.md](../AGENTS.md) y las instrucciones posteriores del propietario                                                                    |

**Ejemplo del bloqueo registrado al crear este mapa:** [OPS-003 #272](https://github.com/migdlp/opinion-social-media/issues/272) está bloqueada y sin reserva activa porque la revisión automática rechazó la exportación de la copia real de dev por su contenido/destino, pendientes de autorización. Sus ensayos sintéticos no equivalen a recuperar datos reales. [REL-003 #273](https://github.com/migdlp/opinion-social-media/issues/273) depende de esa integración. Consultar los issues y el registro en main para el estado posterior; este diagrama no elimina dependencias ni concede permisos para exportar, migrar o desplegar.
