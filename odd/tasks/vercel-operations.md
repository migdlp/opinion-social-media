# Coordinación y desbloqueo de Vercel

## Objetivo, problema y alcance autorizado

El propietario pide reservar para Codex las tareas de Vercel y resolver sus bloqueos. El proyecto existe y está vinculado a GitHub, pero carece de variables y main contiene sólo documentación. Configurar Vercel y documentar accesos/operación sin tomar implementaciones reservadas a otros agentes ni declarar una aplicación publicada por un deploy estático READY.

Responsable: `Codex /root (opinion_social_media)`, mediante la conexión del propietario `migdlp`. Equipo `team_Iu3JavtCo0Kv8xW8ebnGukLb`; proyecto `prj_tUC8ZwzxHISZkmzMKd2z2UmVcN5E`.

## Restricciones y verificación

- Estado y reservas: commits exclusivos directos a main actualizado; respetar concurrencia y sincronizar issues.
- Otros documentos/código: rama, PR y merge con comprobaciones observadas.
- TDD ON por instrucción explícita del propietario: RED, GREEN y REFACTOR para comportamiento. Runner: no existe en main durante exploración; no introducir comportamiento sin runner y RED. Configuración externa y documentación: inspección antes/después, coherencia y enlaces; no inventar ciclos de tests.
- RDD off por configuración global previamente observada; entrega disabled/unmanaged, sin revisión nativa.
- Preview/development usan Supabase dev; production usa prod. Sólo URL y Publishable key en NEXT_PUBLIC_*. No cambiar SQL, Auth ni credenciales administrativas.
- Heurística de unas 400 líneas por tarea orientativa, no límite ni motivo para comprimir o retirar verificaciones.
- Engram no expone herramientas en esta sesión. Mirror `odd/vercel-operations/tasks`: pendiente; conservar documento completo y localizador `odd/tasks/vercel-operations.md` para sincronizar cuando esté disponible.

## Tareas y aceptación

- [x] V01 — Reservar MVP-008 y coordinación de MVP-048/049/050/051 en main e issues. Aceptación: responsable real visible, dependencias y bloqueos conservados, sin reservas ajenas modificadas. Checks: readback remoto y diff de filas.
- [x] V02 — Resolver configuración verificable de Vercel. Aceptación: variables públicas separadas por entorno y configuración compatible con la app prevista, sin secretos administrativos. Checks: inventario previo/posterior y despliegue de preview cuando haya código revisable disponible; registrar límites si falta integración.
- [ ] V03 — Publicar documentación de responsabilidad, acceso, operación y evidencia. Aceptación: guía y estado reflejan recursos reales y qué pueden hacer colaboradores; PR fusionada. Checks: enlaces, consistencia, ausencia de secretos y diff --check. Rollback: revertir la PR documental sin tocar reservas ni configuración remota.
- [ ] V04 — Conciliar estados finales y bloqueos en main e issues. Aceptación: cerrar sólo criterios observados; cada bloqueo conserva dependencia y siguiente paso. Checks: main remoto e issues leídos tras publicación; copia local limpia.

## Evidencia inicial

- Main inspeccionado: 972a886; checkout sin app, package.json ni runner.
- Vercel get_project correcto; integración Git ya creada; get envs devolvió cero variables. Deploy inicial READY de documentación no acredita MVP-008 ni MVP-049.
- MVP-007 en progreso por claude-code; MVP-004 bloqueada por red Supabase en su entorno; no apropiarse de esas tareas.
- MVP-008/048/049/050/051 libres tanto en main como en issues al explorar.

## Progreso y siguiente paso

V01 verificada: reservas publicadas en main (b067424) y cuerpos de #13/#55–58 sincronizados, conservando criterios/dependencias. Readback remoto confirmó las cinco filas, aunque otro colaborador actualizó filas ajenas durante la lectura; se preservaron. Copia actualizada a 95427b5. Siguiente paso: publicar y verificar la guía operativa y los estados finales. Mirror Engram pendiente.

## Evidencia V02

- Variables: inventario inicial vacío; creados y releídos 7 registros para URL/Publishable key y NEXT_PUBLIC_VERCEL_ENV. Comparación exacta de valores y targets correcta para development/preview/dev y production/prod; no claves privilegiadas.
- Fallo original real: logs de PR59 y PR65 muestran STATIC_BUILD_NO_OUT_DIR buscando public después de next build correcto; framework del proyecto era null. Configurado nextjs y defaults de raíz/output/build/install, leído después como nextjs.
- Preview PR65, SHA d0e4bed: dpl_A6ihuQeRcxgiX4c5yVeVDUDbJoVx READY; petición con conector autorizado HTTP200, título Opinión y scaffold del feed. No acredita feed completo ni consulta SSR a Supabase, y no se alteró Deployment Protection.
- La primera solicitud API con target=preview fue rechazada (400); corregida según API omitiendo target, que devuelve target null (Preview). No hubo deploy de producción.
- PR59/62/63/64/65 reconstruidas READY y sus cinco raíces HTTP200 autenticado (título Opinión); no se fusionó código ajeno. Ver tabla de SHAs/deployments en docs/vercel-operacion.md.
- No se desplegó producción ni se modificaron OAuth o SQL; sólo se prepararon sus variables públicas en Vercel. El cierre de MVP-008 sigue pendiente de dependencias e integración verificadas.

- Ignored Build Step `test ! -f package.json`: tres escenarios comprobados antes de configurarlo (sin manifest omite; presente o inválido intenta build). Pendiente verificar la omisión integrada con la PR documental.
