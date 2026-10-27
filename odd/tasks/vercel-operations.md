# Coordinación y desbloqueo de Vercel

## Objetivo, problema y alcance autorizado

El propietario pide reservar para Codex las tareas de Vercel y resolver sus bloqueos. Estado inicial histórico: el proyecto carecía de variables y main contenía sólo documentación. El propietario pide ahora completar cada tarea reservada con su PR y merge; en 79f80f5 ya están integrados scaffold, CI y backend base. Configurar Vercel y documentar accesos/operación sin tomar implementaciones reservadas a otros agentes ni declarar una aplicación publicada por un deploy estático READY.

Responsable: `Codex /root (opinion_social_media)`, mediante la conexión del propietario `migdlp`. Equipo `team_Iu3JavtCo0Kv8xW8ebnGukLb`; proyecto `prj_tUC8ZwzxHISZkmzMKd2z2UmVcN5E`.

## Restricciones y verificación

- Estado y reservas: commits exclusivos directos a main actualizado; respetar concurrencia y sincronizar issues.
- Otros documentos/código: rama, PR y merge con comprobaciones observadas.
- TDD ON por instrucción explícita del propietario: RED, GREEN y REFACTOR para comportamiento. Runner actual: Vitest 5.0.5, `npm run test -- src/lib/supabase/env.test.ts`; suite `npm run check`, secretos `npm run check:secrets`; SQL `npm run test:db` y `npm run test:db:concurrency` requieren PostgreSQL. No introducir comportamiento sin runner y RED. Configuración externa y documentación: inspección antes/después, coherencia y enlaces; no inventar ciclos de tests.
- RDD off por configuración global previamente observada; entrega disabled/unmanaged, sin revisión nativa.
- Preview/development usan Supabase dev; production usa prod. Sólo URL y Publishable key en NEXT_PUBLIC_*. La nueva petición autoriza tareas de despliegue y sus requisitos, pero las escrituras SQL/Auth de producción sólo se harán cuando sus dependencias estén verificadas y exista configuración real; no eludir reservas ajenas ni inventar credenciales.
- Heurística de unas 400 líneas por tarea orientativa, no límite ni motivo para comprimir o retirar verificaciones.
- Engram no expone herramientas en esta sesión. Mirror `odd/vercel-operations/tasks`: pendiente; conservar documento completo y localizador `odd/tasks/vercel-operations.md` para sincronizar cuando esté disponible.

## Tareas y aceptación

- [x] V01 — Reservar MVP-008 y coordinación de MVP-048/049/050/051 en main e issues. Aceptación: responsable real visible, dependencias y bloqueos conservados, sin reservas ajenas modificadas. Checks: readback remoto y diff de filas.
- [x] V02 — Resolver configuración verificable de Vercel. Aceptación: variables públicas separadas por entorno y configuración compatible con la app prevista, sin secretos administrativos. Checks: inventario previo/posterior y despliegue de preview cuando haya código revisable disponible; registrar límites si falta integración.
- [x] V03 — Publicar documentación de responsabilidad, acceso, operación y evidencia. Aceptación: guía y estado reflejan recursos reales y qué pueden hacer colaboradores; PR fusionada. Checks: enlaces, consistencia, ausencia de secretos y diff --check. Rollback: revertir la PR documental sin tocar reservas ni configuración remota.
- [x] V04 — Conciliar estados finales y bloqueos en main e issues. Aceptación: cerrar sólo criterios observados; cada bloqueo conserva dependencia y siguiente paso. Checks: main remoto e issues leídos tras publicación; copia local limpia.

## Evidencia inicial

- Main inspeccionado: 972a886; checkout sin app, package.json ni runner.
- Vercel get_project correcto; integración Git ya creada; get envs devolvió cero variables. Deploy inicial READY de documentación no acredita MVP-008 ni MVP-049.
- MVP-007 en progreso por claude-code; MVP-004 bloqueada por red Supabase en su entorno; no apropiarse de esas tareas.
- MVP-008/048/049/050/051 libres tanto en main como en issues al explorar.

## Progreso y siguiente paso

V01 verificada: reservas publicadas en main (b067424) y cuerpos de #13/#55–58 sincronizados, conservando criterios/dependencias. Readback remoto confirmó las cinco filas, aunque otro colaborador actualizó filas ajenas durante la lectura; se preservaron. Copia actualizada a 95427b5. V03: PR #66 fusionada en ec0ac75; enlaces, contenido y patrones de credenciales comprobados. V04: cinco reservas/bloqueos leídos en main y cinco issues abiertos con responsable y evidencias sincronizados; checkout limpio tras integrar la PR. Siguiente paso: integrar las dependencias pendientes y después verificar MVP-008; MVP-048/049/050/051 siguen reservadas y bloqueadas. Mirror Engram pendiente.

## Evidencia V02

- Variables: inventario inicial vacío; creados y releídos 7 registros para URL/Publishable key y NEXT_PUBLIC_VERCEL_ENV. Comparación exacta de valores y targets correcta para development/preview/dev y production/prod; no claves privilegiadas.
- Fallo original real: logs de PR59 y PR65 muestran STATIC_BUILD_NO_OUT_DIR buscando public después de next build correcto; framework del proyecto era null. Configurado nextjs y defaults de raíz/output/build/install, leído después como nextjs.
- Preview PR65, SHA d0e4bed: dpl_A6ihuQeRcxgiX4c5yVeVDUDbJoVx READY; petición con conector autorizado HTTP200, título Opinión y scaffold del feed. No acredita feed completo ni consulta SSR a Supabase, y no se alteró Deployment Protection.
- La primera solicitud API con target=preview fue rechazada (400); corregida según API omitiendo target, que devuelve target null (Preview). No hubo deploy de producción.
- PR59/62/63/64/65 reconstruidas READY y sus cinco raíces HTTP200 autenticado (título Opinión); no se fusionó código ajeno. Ver tabla de SHAs/deployments en docs/vercel-operacion.md.
- No se desplegó producción ni se modificaron OAuth o SQL; sólo se prepararon sus variables públicas en Vercel. El cierre de MVP-008 sigue pendiente de dependencias e integración verificadas.

- Ignored Build Step `test ! -f package.json`: tres escenarios comprobados antes de configurarlo (sin manifest omite; presente o inválido intenta build). Omisión integrada verificada en PR #66: estado Vercel success con descripción Canceled by Ignored Build Step; check Vercel Preview Comments success, sin feedback pendiente.

## Cierre del alcance de desbloqueo

Configuración Vercel corregida y documentación fusionada. No se cierran tareas del MVP por infraestructura parcial; dependencias y próximos pasos constan en main e issues. No se ejecutaron tests de aplicación, login real, SQL/migraciones ni pruebas de producción en este alcance. La prueba HTTP usa acceso autorizado, no acredita acceso anónimo. Mirror Engram permanece pendiente por falta de herramientas.

## Reanudación: una PR por tarea

Petición explícita: implementar las tareas reservadas, una PR por tarea y merge después de verificar. La fase anterior se conserva completada y no equivale al cierre del MVP. Engram sigue sin herramientas: espejo pendiente; reconciliado este archivo con main 79f80f5.

- [x] V05 / MVP-008 — completar previews y protección de configuración pública; PR propia, preview del SHA correcto, HTTPS y entorno dev. Dependencias MVP-003/007 ya integradas.
- [ ] V06 / MVP-022 — requisito libre de infraestructura: reproducibilidad de migraciones y tipos generados en CI; reservar antes de implementar, PR propia y comprobar runner real.
- [ ] V07 / MVP-048 — runbook de producción verificable tras MVP-008/020/022; PR propia.
- [ ] V08 / MVP-049 — despliegue productivo tras MVP-008/022/047/048, OAuth y migraciones reales; PR propia y pruebas observadas.
- [ ] V09 / MVP-050 — smoke y seguridad producción tras MVP-044/045/046/049; dos cuentas reales; PR propia.
- [ ] V10 / MVP-051 — checklist final tras MVP-047/049/050; PR propia; no declarar release completa con criterios pendientes.

Siguiente paso: retomar MVP-008 como En progreso en main e issue, instalar dependencias fijadas y ejecutar RED antes de cambiar comportamiento. Las reservas ajenas MVP-004/018/019/025/028 se mantienen.

### MVP-008: implementación y comprobaciones antes de PR

- Cambios: vercel.json versiona Next.js e ignoreCommand; lector público exige clave sb_publishable_ no vacía y rechaza secretos/JWT sin revelar valores.
- Node24.22.1 y Vitest5.0.5. RED focal: 6 fallos/4 pasan por comportamiento ausente; GREEN y REFACTOR tras formato: 10/10. Suite global: 19/19; formato, lint y typecheck correctos.
- check:secrets detectó inicialmente el JWT falso literal de un test; se sustituyó por construcción desde JSON/base64url sin debilitar el scanner, y pasó (62 commits revisados).
- npm ci tuvo un error inicial por cargar /dev/null como config global y usuario; corregido con config global temporal distinta. Node25 del sistema está fuera del rango declarado de Vitest: las comprobaciones usan Node24 incluido.
- Build local por Turbopack bloqueado por restricción del SO al abrir puerto interno, también al solicitar ejecución ampliada. No se atribuye a código ni se declara check completo local correcto. Validación del build pendiente en CI/Vercel remotos.
- SQL local no ejecutado: psql/Docker ausentes. Sus checks se ejecutarán en la CI existente de la PR.

MVP-008 cerrada: PR #70 fusionada e877f02; CI 40577319870 app/build+SQL+secretos verde, preview Git automática SHA2aadfbf READY y /,/login,/create HTTP200 autorizado; inventario remoto confirmado dev/prod. Build local bloqueado por SO documentado, build remoto correcto. Siguiente: MVP-022 reservada en main/issue27. Mirror Engram pendiente.
