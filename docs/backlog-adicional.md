# Tareas adicionales — auditoría del alcance aprobado

**Origen:** petición del propietario del 28-10-2026; [AUDIT-001 #187](https://github.com/migdlp/opinion-social-media/issues/187). Fuentes: brief, D-015–D-026, DESIGN.md, limitaciones registradas en tareas-futuras y todos los issues existentes. Ver [matriz de cobertura](auditoria-tareas.md).

Nueve tareas nuevas, todas P0 para completar el candidato de fase 2 y el diseño pedido. No son nuevas funcionalidades de producto. Estimaciones relativas: S ≈0,5 día, M ≈1 día, L ≈2 días, sin responsables, fechas ni sprints asignados. No cambian las condiciones de un eventual lanzamiento del MVP original que excluya fase 2.

Reservar desde main actualizado conforme a AGENTS.md; respetar reservas. TDD al cambiar comportamiento; revisión de contenido/enlaces para documentación. SQL sólo dentro de su tarea y entorno; producción/Vercel mantienen el proceso release autorizado. Crear estas tareas no las ejecuta ni acredita sus criterios.

## Catálogo y dependencias

| ID / issue | Tarea | Prioridad | Tamaño | Dependencias |
|---|---|---|---|---|
| [DESIGN-002](https://github.com/migdlp/opinion-social-media/issues/188) | Migrar tokens y estilos base a After Sunset | P0 | M | DESIGN-001 |
| [DESIGN-003](https://github.com/migdlp/opinion-social-media/issues/189) | Adaptar feed, detalle, creación y acceso al nuevo estilo | P0 | L | DESIGN-002 |
| [DESIGN-004](https://github.com/migdlp/opinion-social-media/issues/190) | Adaptar perfiles, ajustes y solicitudes a After Sunset | P0 | M | DESIGN-002, V2-006, V2-008, V2-009 |
| [DESIGN-005](https://github.com/migdlp/opinion-social-media/issues/191) | Adaptar las imágenes sociales a la nueva identidad | P0 | S | DESIGN-002, V2-019 |
| [DESIGN-006](https://github.com/migdlp/opinion-social-media/issues/192) | Verificar la adaptación visual completa y su accesibilidad | P0 | L | DESIGN-003, DESIGN-004, DESIGN-005, V2-025, V2-036 |
| [SEC-001](https://github.com/migdlp/opinion-social-media/issues/193) | Impedir que borrar seguimientos reinicie la cuota | P0 | M | V2-004 |
| [OPS-001](https://github.com/migdlp/opinion-social-media/issues/194) | Integrar las migraciones de fase 2 en Supabase dev | P0 | L | V2-007, V2-014, V2-021, V2-031, SEC-001 |
| [OPS-002](https://github.com/migdlp/opinion-social-media/issues/195) | Validar fase 2 integrada con Google real en desarrollo | P0 | L | OPS-001, MVP-005, V2-025, V2-036 |
| [DOC-001](https://github.com/migdlp/opinion-social-media/issues/196) | Actualizar documentación operativa al candidato de fase 2 | P0 | M | OPS-002, DESIGN-006 |

**Listas para tomar cuando se integre esta auditoría:** DESIGN-002 y SEC-001, cuyas dependencias ya figuran completadas. Después DESIGN-003/005; DESIGN-004 espera las pantallas sociales. OPS-001 espera las migraciones del feed y la cuota; OPS-002 prueba el conjunto contra dev; DESIGN-006 y DOC-001 cierran verificación y guías. No usar el orden de los números de issue como orden de ejecución.

## Tareas implementables

### DESIGN-002 — Migrar tokens y estilos base a After Sunset

**Issue:** [#188](https://github.com/migdlp/opinion-social-media/issues/188) · **Épica:** [#111](https://github.com/migdlp/opinion-social-media/issues/111)

- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** frontend, design
- **Estado:** consultar tareas-futuras.md; al crear, Pendiente y Agente —.
- **Dependencias:** [DESIGN-001](https://github.com/migdlp/opinion-social-media/issues/185)
- **Bloquea a:** [DESIGN-003](https://github.com/migdlp/opinion-social-media/issues/189), [DESIGN-004](https://github.com/migdlp/opinion-social-media/issues/190), [DESIGN-005](https://github.com/migdlp/opinion-social-media/issues/191)

Convertir los tokens objetivo de DESIGN.md en estilos reales, sustituyendo el monocromo sin alterar contratos ni funciones.

**Requisitos:**

- Conservar nombres semánticos existentes y añadir sólo los acentos necesarios; fuentes Geist locales, temas claro y oscuro según D-026.
- Actualizar estilos base, foco, selección, bordes, campos y botones compartidos. Azul noche sobre CTA melocotón, sin texto blanco sobre ese fondo.
- Coordinar globals.css y componentes compartidos por #73. Actualizar las comprobaciones de contraste a la nueva paleta y conservar garantías funcionales; TDD para cambios de comportamiento.

**Criterios de aceptación:**

1. Dado tema claro u oscuro, cuando se renderizan los controles base, entonces usan los tokens documentados y sus colores calculados cumplen contraste AA.
2. Dado teclado y estados hover/focus/disabled/error, entonces el control sigue siendo identificable sin depender sólo del color.
3. Dadas las pruebas existentes de autenticación, voto y formularios, entonces siguen pasando y no cambian rutas, SDK ni permisos. Adjuntar capturas reales de ambos temas.

### DESIGN-003 — Adaptar feed, detalle, creación y acceso al nuevo estilo

**Issue:** [#189](https://github.com/migdlp/opinion-social-media/issues/189) · **Épica:** [#111](https://github.com/migdlp/opinion-social-media/issues/111)

- **Prioridad:** P0 · **Estimación relativa:** L · **Etiquetas:** frontend, design
- **Estado:** consultar tareas-futuras.md; al crear, Pendiente y Agente —.
- **Dependencias:** [DESIGN-002](https://github.com/migdlp/opinion-social-media/issues/188)
- **Bloquea a:** [DESIGN-006](https://github.com/migdlp/opinion-social-media/issues/192)

Aplicar After Sunset a los recorridos principales existentes: cabecera, menú, barra móvil, tarjetas, selección/resultados, formulario, login y onboarding.

**Requisitos:**

- Reutilizar componentes/tokens, incluyendo cargas, vacío, error, encuesta no disponible y diálogos de denuncia. No añadir funciones dibujadas en la lámina.
- Adaptar elementos con colores fijos y referencias monocromas; comprobar el caso de seis opciones largas y pregunta de 280 caracteres.
- Conservar formularios, foco, errores asociados y regla de resultados. Los nuevos componentes del feed reutilizarán este sistema; su integración final se verifica en DESIGN-006.

**Criterios de aceptación:**

1. Dado cada recorrido en claro y oscuro a 320px/escritorio, entonces la pregunta, controles y CTA siguen la dirección aprobada sin desbordarse ni quedar tapados por la barra.
2. Dada encuesta abierta sin votar, entonces no aparecen cifras, totales ni barras que sugieran resultados; al confirmar el voto se revelan sólo los agregados autorizados y Tu voto.
3. Dado reduced-motion o navegación con teclado, entonces el flujo es usable sin animación y el diálogo de denuncia mantiene/recupera el foco. Pruebas y capturas adjuntas.

### DESIGN-004 — Adaptar perfiles, ajustes y solicitudes a After Sunset

**Issue:** [#190](https://github.com/migdlp/opinion-social-media/issues/190) · **Épica:** [#111](https://github.com/migdlp/opinion-social-media/issues/111)

- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** frontend, design
- **Estado:** consultar tareas-futuras.md; al crear, Pendiente y Agente —.
- **Dependencias:** [DESIGN-002](https://github.com/migdlp/opinion-social-media/issues/188), [V2-006](https://github.com/migdlp/opinion-social-media/issues/135), [V2-008](https://github.com/migdlp/opinion-social-media/issues/129), [V2-009](https://github.com/migdlp/opinion-social-media/issues/138)
- **Bloquea a:** [DESIGN-006](https://github.com/migdlp/opinion-social-media/issues/192)

Aplicar la misma identidad a las pantallas sociales cuando sus tareas funcionales estén integradas.

**Requisitos:**

- Cubrir /u/[username], /me, /settings y /solicitudes, listas paginadas, contadores, cambios de privacidad y estados pending/accepted.
- Mantener nombres accesibles, iniciales y opciones de salir sin publicar datos de Google ni cambiar quién ve una cuenta privada.

**Criterios de aceptación:**

1. Dado perfil público, privado autorizado y privado no autorizado, entonces sus estados tienen estilo coherente y muestran sólo la información que permite el backend.
2. Dado cambio de privacidad o aceptación/rechazo de solicitud, entonces carga/error/confirmación son comprensibles y navegables con teclado.
3. Dado 320px y escritorio en ambos temas, entonces etiquetas, nombres largos y listas no desbordan; se adjuntan capturas reales y pasan las regresiones funcionales.

### DESIGN-005 — Adaptar las imágenes sociales a la nueva identidad

**Issue:** [#191](https://github.com/migdlp/opinion-social-media/issues/191) · **Épica:** [#111](https://github.com/migdlp/opinion-social-media/issues/111)

- **Prioridad:** P0 · **Estimación relativa:** S · **Etiquetas:** frontend, design
- **Estado:** consultar tareas-futuras.md; al crear, Pendiente y Agente —.
- **Dependencias:** [DESIGN-002](https://github.com/migdlp/opinion-social-media/issues/188), [V2-019](https://github.com/migdlp/opinion-social-media/issues/134)
- **Bloquea a:** [DESIGN-006](https://github.com/migdlp/opinion-social-media/issues/192)

Actualizar la composición PNG de las encuestas y su variante genérica con la paleta y tipografía de D-026.

**Requisitos:**

- Modificar sólo presentación de opengraph-image: conservar lectura anónima, no-store, dimensión 1200×630 y variante genérica para no disponibles.
- No crear un logo PEEK definitivo ni renombrar Opinión; emplear tipografía local y marca textual actual. No introducir descargas de activos o fuentes.

**Criterios de aceptación:**

1. Dada una encuesta pública, entonces el PNG muestra pregunta, opciones y @autor con identidad After Sunset, incluyendo seis opciones largas sin solapamientos.
2. Dada encuesta privada, oculta o inexistente, incluso con cookies del autor, entonces devuelve la misma imagen genérica; votar no introduce cifras en ninguna imagen.
3. Dado el E2E de imagen social y render real de PNG normal/extremo/genérico, entonces pasan y las capturas quedan registradas.

### DESIGN-006 — Verificar la adaptación visual completa y su accesibilidad

**Issue:** [#192](https://github.com/migdlp/opinion-social-media/issues/192) · **Épica:** [#111](https://github.com/migdlp/opinion-social-media/issues/111)

- **Prioridad:** P0 · **Estimación relativa:** L · **Etiquetas:** testing, frontend, design
- **Estado:** consultar tareas-futuras.md; al crear, Pendiente y Agente —.
- **Dependencias:** [DESIGN-003](https://github.com/migdlp/opinion-social-media/issues/189), [DESIGN-004](https://github.com/migdlp/opinion-social-media/issues/190), [DESIGN-005](https://github.com/migdlp/opinion-social-media/issues/191), [V2-025](https://github.com/migdlp/opinion-social-media/issues/140), [V2-036](https://github.com/migdlp/opinion-social-media/issues/183)
- **Bloquea a:** [DOC-001](https://github.com/migdlp/opinion-social-media/issues/196)

Cerrar la migración visual con evidencia del conjunto integrado, no sólo de componentes aislados.

**Requisitos:**

- Matriz de rutas: feed/detalle/create/login/onboarding/perfil/settings/solicitudes y variante no disponible; claro/oscuro, 320px/escritorio, carga/error/vacío/selección/resultados.
- Revisar teclado, foco, lector de pantalla básico, contraste de colores calculados, zoom, safe-area y reduced-motion. Verificar seis opciones, preguntas largas, denuncia y límites temporales.
- Comprobar la hoja nativa de compartir en un móvil compatible y su alternativa de copia; distinguir pruebas reales de simuladas. No crear deployments de Vercel para verificar.

**Criterios de aceptación:**

1. Dada la matriz completa y el SHA candidato, entonces hay capturas y resultados enlazados de todas las combinaciones esenciales, sin desbordamientos ni contenido tapado.
2. Dada navegación por teclado/lector de pantalla y reduced-motion, entonces selección, errores y revelación son comprensibles y el foco no se pierde; contraste AA comprobado en los estados reales.
3. Dado un defecto encontrado, entonces se corrige y repite la comprobación afectada antes de cerrar; CI completa verde y limitaciones de dispositivo documentadas sin afirmar pruebas no ejecutadas.

### SEC-001 — Impedir que borrar seguimientos reinicie la cuota

**Issue:** [#193](https://github.com/migdlp/opinion-social-media/issues/193) · **Épica:** [#114](https://github.com/migdlp/opinion-social-media/issues/114)

- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** database, security, testing
- **Estado:** consultar tareas-futuras.md; al crear, Pendiente y Agente —.
- **Dependencias:** [V2-004](https://github.com/migdlp/opinion-social-media/issues/126)
- **Bloquea a:** [OPS-001](https://github.com/migdlp/opinion-social-media/issues/194)

Corregir la limitación registrada en V2-004: la cuota cuenta filas follows vigentes y se libera al cancelar o eliminar la relación.

**Requisitos:**

- Mantener el límite ya aprobado de 200 nuevas relaciones por cuenta en una ventana móvil de 60 minutos, aunque luego se dejen de seguir, rechacen o eliminen. Las llamadas idempotentes a una relación existente no consumen cuota nueva.
- Persistir el mínimo necesario en PostgreSQL, sin Redis/colas ni claves privilegiadas en clientes; documentar retención/limpieza del control de cuota. Operación atómica y segura con concurrencia.
- Nueva migración sobre el cuerpo vigente de follow_user; no editar migraciones aplicadas ni perder las validaciones de perfil, identidad y privacidad. RLS/permisos mínimos y tipos regenerados si procede.

**Criterios de aceptación:**

1. Dado un usuario que crea y borra 200 relaciones dentro de 60 minutos, cuando intenta otra, entonces recibe FOLLOW_RATE_LIMITED aunque follows esté vacío.
2. Dado 199 consumos y dos nuevas solicitudes simultáneas, entonces sólo una se acepta y el contador no supera 200; rechazar o remove_follower tampoco libera consumos.
3. Dado el límite temporal con reloj SQL fijado, entonces sólo caducan consumos fuera de la ventana; llamadas idempotentes y usuarios distintos permanecen aislados.
4. Dadas llamadas REST directas, entonces anon y terceros no pueden leer, alterar o borrar el control de cuota. RED/GREEN SQL y prueba concurrente registrados; CI verde.

### OPS-001 — Integrar las migraciones de fase 2 en Supabase dev

**Issue:** [#194](https://github.com/migdlp/opinion-social-media/issues/194) · **Épica:** [#114](https://github.com/migdlp/opinion-social-media/issues/114)

- **Prioridad:** P0 · **Estimación relativa:** L · **Etiquetas:** devops, database, security
- **Estado:** consultar tareas-futuras.md; al crear, Pendiente y Agente —.
- **Dependencias:** [V2-007](https://github.com/migdlp/opinion-social-media/issues/132), [V2-014](https://github.com/migdlp/opinion-social-media/issues/133), [V2-021](https://github.com/migdlp/opinion-social-media/issues/131), [V2-031](https://github.com/migdlp/opinion-social-media/issues/178), [SEC-001](https://github.com/migdlp/opinion-social-media/issues/193)
- **Bloquea a:** [OPS-002](https://github.com/migdlp/opinion-social-media/issues/195)

Cerrar la distancia entre migraciones integradas en Git/CI y el esquema alojado de desarrollo, sin tocar producción.

**Requisitos:**

- Destino exclusivo: Los tres cerditos, dev ltlrujmqenhktiilsnis, Irlanda. Inspeccionar historial y esquema reales antes de planificar/aplicar el SHA candidato.
- Detectar versiones o nombres divergentes y objetos creados previamente; documentar una reconciliación verificable. No borrar/resetear dev ni marcar como aplicada una migración cuyo efecto no esté comprobado.
- Comprobar reproducción local limpia, preparar recuperación de los datos dev antes de mutar y aplicar sólo SQL versionado del candidato. No crear proyectos sustitutos.
- Verificar esquema, RPC, RLS, permisos y tipos contra el candidato; segundo paso no duplica cambios ni pierde encuestas/votos existentes. P1 no incluidos en el candidato no bloquean este trabajo.

**Criterios de aceptación:**

1. Dado el ledger real de dev y las migraciones del SHA, entonces existe plan de aplicación con discrepancias resueltas y evidencia anterior/posterior sin secretos.
2. Dado el plan aplicado, entonces tablas/funciones/permisos coinciden con Git y un segundo despliegue no cambia datos ni historial. Se preservan datos anteriores y no se inventan perfiles ni nombres públicos para cuentas antiguas.
3. Dado el SDK configurado con dev, entonces lee encuestas y llama las RPC de fase 2 correctamente, con resultados protegidos; producción y Vercel no se modifican.
4. Dado acceso OAuth insuficiente, entonces se registra el bloqueo y la invitación/autorización necesaria, sin pedir tokens en chat ni sustituir el entorno.

### OPS-002 — Validar fase 2 integrada con Google real en desarrollo

**Issue:** [#195](https://github.com/migdlp/opinion-social-media/issues/195) · **Épica:** [#114](https://github.com/migdlp/opinion-social-media/issues/114)

- **Prioridad:** P0 · **Estimación relativa:** L · **Etiquetas:** testing, auth, devops
- **Estado:** consultar tareas-futuras.md; al crear, Pendiente y Agente —.
- **Dependencias:** [OPS-001](https://github.com/migdlp/opinion-social-media/issues/194), [MVP-005](https://github.com/migdlp/opinion-social-media/issues/10), [V2-025](https://github.com/migdlp/opinion-social-media/issues/140), [V2-036](https://github.com/migdlp/opinion-social-media/issues/183)
- **Bloquea a:** [DOC-001](https://github.com/migdlp/opinion-social-media/issues/196)

Verificar los flujos del candidato contra el Supabase de desarrollo, complementando los E2E locales que usan sesiones de prueba.

**Requisitos:**

- Google real lo completa una persona autorizada; no automatizar desafíos de Google. Probar cuenta nueva y cuenta previa sin perfil, cancelación y retorno a ruta previa sin voto automático. La selección en tarjeta sigue V2-033; el retorno de selección en detalle/onboarding se verifica si V2-052 forma parte del candidato, sin convertir esa P1 en bloqueo general.
- Con dos cuentas de verificación: crear, votar, volver desde otra sesión/dispositivo, seguir a una cuenta privada, aceptar/rechazar y ver resultados sólo con permiso. Verificar feed, categorías y cierre/retención 24h.
- Revisar sesiones/logout, redirecciones internas y datos de red sin almacenar tokens/cookies. Sembrar sólo fixtures aisladas para medición dev del feed (≥1000 encuestas/50 relaciones, requisito pendiente de V2-005), guardar EXPLAIN ANALYZE y limpiar sus datos.
- No esperar 24 horas para validar el borde: usar fechas de fixtures controladas sin cambiar relojes ni datos reales. No desplegar en Vercel ni ejecutar pruebas sobre producción.

**Criterios de aceptación:**

1. Dado Google real y cuenta sin perfil, cuando autentica y completa onboarding, entonces regresa al flujo previo con sesión persistente y sin publicar datos de Google automáticamente.
2. Dadas dos cuentas y sesiones/dispositivos distintos, entonces voto único, privacidad, solicitudes y feed coinciden con el backend y el logout elimina el acceso privado.
3. Dadas fixtures de cierre y volumen, entonces se verifican el límite temporal de 24h y el plan/tiempos de consulta, con evidencia y limpieza posterior.
4. Dado el informe, entonces identifica SHA, proyecto dev, pasos reales, comprobaciones simuladas y limitaciones; no declara listo producción.

### DOC-001 — Actualizar documentación operativa al candidato de fase 2

**Issue:** [#196](https://github.com/migdlp/opinion-social-media/issues/196) · **Épica:** [#114](https://github.com/migdlp/opinion-social-media/issues/114)

- **Prioridad:** P0 · **Estimación relativa:** M · **Etiquetas:** devops, testing, docs
- **Estado:** consultar tareas-futuras.md; al crear, Pendiente y Agente —.
- **Dependencias:** [OPS-002](https://github.com/migdlp/opinion-social-media/issues/195), [DESIGN-006](https://github.com/migdlp/opinion-social-media/issues/192)
- **Bloquea a:** —

Consolidar las guías funcionales y operativas después de integrar fase 2, preservando las fuentes históricas sin tratarlas como instrucciones vigentes.

**Requisitos:**

- Actualizar README, docs/README, contexto, estado-proyecto, migraciones, entornos y runbooks al SHA verificado: perfiles/privacidad, 2–6 opciones, cierre, feed y diseño aplicado.
- Eliminar de fuentes vigentes afirmaciones obsoletas como main genera previews/produce o todas las tareas están pendientes. Registrar observaciones de Supabase con fecha, sin convertirlas en estados permanentes.
- Reconciliar tareas/issue abiertos frente a completadas con enlaces de evidencia y agentes reales; no cerrar por suposición, borrar reservas ni afirmar pruebas ajenas.
- Relacionar el candidato fase 2 con MVP-049/050/051 y su checklist de release: producción/recuperación ya tienen tareas, no se duplican. Sólo release con orden explícita; sin despliegue automático ni antes de la restricción horaria vigente.

**Criterios de aceptación:**

1. Dado un colaborador nuevo, cuando sigue README y guías, entonces arranca el candidato con entorno dev correcto y reconoce qué código, esquema y pruebas están realmente verificados.
2. Dado el mapa de tareas y GitHub, entonces los estados reflejan evidencias integradas y las discrepancias no verificables quedan explícitas sin apropiarse de trabajo ajeno.
3. Dado el checklist de publicación de un candidato que incluye fase 2, entonces enlaza OPS-001/002, seguridad y DESIGN-006 cuando correspondan, conservando los tickets productivos existentes y la aprobación de release.
4. Dadas referencias Markdown y ejemplos de configuración, entonces son coherentes con AGENTS.md, no contienen secretos y no afirman funcionalidades todavía pendientes.

## Tarea existente que faltaba en el registro de main

### V2-052 — Conservar la elección al iniciar sesión

**Issue existente:** [#169](https://github.com/migdlp/opinion-social-media/issues/169) · **P1 · S · frontend, auth** · **Dependencias:** ninguna bloqueante según su ticket; reutiliza el flujo de autenticación existente.

No se crea otra tarea ni se aprueba la propuesta de crecimiento #184 en bloque. Este requisito ya estaba en contexto-aplicacion.md y en el retorno de autenticación original. V2-033 cubre el voto desde tarjeta; V2-052 conserva la selección en el detalle y a través del onboarding. Coordinar ambas para reutilizar el contrato y evitar dos mecanismos distintos.

Criterios preservados del issue existente:

1. Dado visitante que elige B y abre login, cuando vuelve, entonces B está seleccionada y no existe voto hasta confirmar.
2. Dado `elige` inválido o de otra encuesta, entonces se ignora sin error.
3. Dado usuario que ya votó, entonces se muestran resultados y se ignora `elige`.
4. Dado onboarding pendiente, entonces conserva la selección hasta volver al detalle.
5. Dado el código, entonces no persiste esa selección en localStorage ni sessionStorage; sólo retorno interno validado.
6. Dado E2E móvil/escritorio con sesión de prueba, entonces autentica, vuelve, confirma y ve resultados.

La prueba con Google real forma parte de OPS-002, además del E2E local. El issue original conserva su prioridad, estado y autoría; esta auditoría no lo reserva.

## Exportación

[JSON](tareas-adicionales.json) y [CSV](tareas-adicionales.csv) contienen los nueve tickets nuevos y sus URLs/dependencias reales. El JSON referencia además V2-052 como ticket existente, sin duplicarlo. No sustituyen las exportaciones históricas del MVP.
