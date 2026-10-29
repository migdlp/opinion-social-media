# REL-002 — Publicación de tema y menú de cuenta

Autorización del propietario (29-10-2026): «vete desplegando lo que tienes en forma». Ejecución en [#265](https://github.com/migdlp/opinion-social-media/issues/265). No crear previews: un único despliegue Git desde release, con candidato y CI registrados en la PR de publicación.

## Versión preparada

- BUG-004, PR #260: cierre del menú al pulsar fuera, salir con Tab, Escape, navegar o cerrar sesión; conserva las acciones.
- DESIGN-013, PR #261: Claro / Oscuro / Sistema en cabecera para visitantes y cuentas, persistencia local y fallback si se bloquea almacenamiento. `ThemeSelector` se reutilizará en SETTINGS-001.
- DOC-010 y LEGAL-001: backlog ejecutable e inventario legal. No se publican políticas con datos de responsable inventados.
- PRIV-001 está integrado en código/SQL versionado, pero **no activo en hosted**. No se anuncia la nueva privacidad como función productiva.

CI funcional de DESIGN-013: [40914648426](https://github.com/migdlp/opinion-social-media/actions/runs/40914648426), SHA `79d6dc5bddd93d8d8d527fefd4b604abdf18f32d`: 691 unitarias, 120 E2E, 89 ataques HTTP, SQL/concurrencia/upgrade, migraciones reproducibles/tipos, secretos y build correctos. Capturas reales de 320/390/1280 en ambos temas en su artefacto `aftersunset-capturas`. La CI exacta del candidato final y el resultado Vercel se enlazan en #265/PR de publicación.

Primera CI de tema: 117/120 E2E; corrigió un área nativa de 42 px a 44 px. El estado activo tardío de la barra en una transición cliente se registra en PERF-001; no se da por corregido en esta versión. Las capturas pueden recoger una transición breve de color; los tokens finales pasan contraste automatizado.

## Preflight observado, sin cambios de datos

- Destino: proyecto Vercel `prj_tUC8ZwzxHISZkmzMKd2z2UmVcN5E`, equipo `team_Iu3JavtCo0Kv8xW8ebnGukLb`, Next.js, dominio https://opinion-social-media.vercel.app.
- Versión anterior: release `69f8a1022295105a782f6f2a1a38b1d7b47e8fb5`, deployment `dpl_78nurnzhEzvttMSUwDAqgPVut3Cp`, READY/Production, dominio asignado. Verificar de nuevo justo antes de publicar.
- Supabase producción `qchpdrolulcgmiliysvr`: ledger leído con **25 migraciones**, última `20261028280000`. No repetirlas ni resetear. La 26 `20261029152251_vote_history_visibility.sql` no se aplica en esta publicación.
- Los contratos productivos de create_poll, vote_poll, get_feed, get_poll_results, get_my_profile y get_profile_votes coinciden con las llamadas usadas por las pantallas. Los dos adaptadores nuevos de audiencia no tienen consumidores de UI: pueden permanecer sin activar hasta el rollout coordinado con PRIV-002.
- Esta publicación es compatible con la versión anterior de datos y no incluye DDL ni borrado. La recuperación de datos y la activación de la migración 26 necesitan su plan específico; un rollback de frontend no sustituye un backup.
- Se conserva la configuración de Auth y las variables separadas. No imprimir claves ni configurar nuevos proveedores para publicar el tema.

## Relevo para otras IAs

1. **PERF-001 #262, P0:** medir lag y corregir causas. Pistas, sin causalidad demostrada: funciones Vercel declaradas en iad1 y Supabase en Irlanda; avisos Date.now/prerender y barra móvil que se actualiza tarde. Medir antes/después, sin caché pública de datos privados.
2. **V2-008 #129:** conserva a su agente y PR #263; comprobar su estado en main, sin tomar su reserva. Después SETTINGS-001/PRIV-002 y acabado visual DESIGN-004. Integrar el selector existente y la preferencia de audiencia; coordinar la migración 26 y su validación.
3. **AUTH-001 #258:** reserva de otra IA, conservarla. Cookies/lifetime/atributos investigados en el inventario legal; no asumir resuelto hasta su PR y pruebas.
4. **LEGAL-002/003/004:** responsable público, país, contacto, retención, canal de derechos y revisión pendientes. Inventario en docs/legal/; no inventarlos ni publicar textos ficticios.
5. **AVATAR-001/002/003:** iconos primero, después Storage seguro y subida; dependencias en el backlog.

MVP-049/050/051 conservan bloqueos de aceptación general, pero la reserva de Codex fue liberada en `8ed54b8` por orden del propietario. Sus issues están sincronizados. No declarar el MVP global terminado por esta publicación. Consultar main antes de reservar; conservar autores históricos de tareas completadas no implica que sigan reservadas.

Al terminar REL-002, publicar versión/estado HTTP/observabilidad y límites en #265, cerrar la tarea o liberarla con bloqueo concreto. No dejar reservas abiertas de esta sesión ni atribuirse PERF-001.
