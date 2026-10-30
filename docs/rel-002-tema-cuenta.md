# REL-002 — Publicación de tema y menú de cuenta

**Publicada el 30-10-2026:** https://opinion-social-media.vercel.app. [PR #268](https://github.com/migdlp/opinion-social-media/pull/268), release `60d841b9218c0d7ad5c1d199ef54b1e89d625490`; deployment `dpl_AZyUak2vjYzubEMi7sf2kzQ7SG3v`, **READY / Production**, con el dominio asignado. [Tarea #265](https://github.com/migdlp/opinion-social-media/issues/265).

El propietario autorizó publicar lo validado el 29-10 y reiteró el 30-10 «revisa, y haz un deploy de lo que vayas teniendo». El intento anterior de merge no se ejecutó: la revisión automática no pudo completarse por límite de uso. La misma operación se reintentó el 30-10 y se ejecutó correctamente, sin vías alternativas que eludieran la revisión.

## Qué está publicado

- **DESIGN-013 / PR #261:** Claro, Oscuro o Sistema desde el icono de la cabecera, para visitantes y cuentas. La elección persiste en el navegador; Sistema sigue el dispositivo; almacenamiento bloqueado no rompe la visita. Se aplica antes del body y afecta también a las variantes dark: de componentes.
- **BUG-004 / PR #260:** el menú de cuenta cierra al pulsar fuera, salir con Tab, pulsar Escape, navegar o cerrar sesión; mantiene las acciones.
- **V2-008 / PR #263:** base de Ajustes de perfil y Cuenta privada. La ampliación posterior por apartados y audiencia independiente no pertenece a este corte.

Candidato exacto `e9a8c6380314ab687ead3fbdcf6b3ebfee20147b`, snapshot de main `704ec15` y documentación integrada en PR #266. El corte se congeló para que otros merges de main no añadieran funciones todavía sin activar en Supabase. No se creó ninguna preview ni se hizo un redeploy auxiliar: sólo el merge Git hacia release.

## Evidencia

- CI [40916736798](https://github.com/migdlp/opinion-social-media/actions/runs/40916736798) y [40916743118](https://github.com/migdlp/opinion-social-media/actions/runs/40916743118), del candidato exacto: **710 unitarias, 120 E2E y 89 HTTP** correctos; build, SQL/concurrencia/upgrade, reproducción real de migraciones/tipos y secretos verdes. TDD y correcciones de comportamiento documentados en sus PR.
- Vercel confirmó SHA de release, rama release, destino Production y alias del dominio. Proyecto `prj_tUC8ZwzxHISZkmzMKd2z2UmVcN5E`, equipo `team_Iu3JavtCo0Kv8xW8ebnGukLb`; build aproximadamente 37 s según buildingAt/ready.
- HTTP público: `/`, `/login`, `/settings` y detalle de una encuesta confirmada pública y abierta respondieron 200. CSS 200, reglas manuales de tema presentes y bootstrap de preferencia antes del body.
- `/settings` sin sesión incluye el redirect de Next a `/login?next=%2Fsettings`. Al usar streaming responde 200 con meta refresh/redirect RSC; no confundirlo con una sesión autenticada ni exigir un 302 que ese render no emite.
- No se serializó `total_votes` en el HTML anónimo del detalle abierto comprobado. No sustituye las pruebas de autorización completas de CI.
- Consulta de logs del deployment, niveles error/fatal, ventana de 10 minutos después del smoke: **sin registros con esos criterios**. Es una observación acotada, no monitorización continua ni garantía de ausencia total de errores.
- Google real y ajustes guardados con la cuenta del propietario no se probaron en esta sesión. La validación de navegador del candidato se ejecutó en CI con Supabase efímero y sesiones de prueba; no se afirma una prueba autenticada productiva nueva.

## Supabase y siguiente versión

Lectura del 30-10: dev `ltlrujmqenhktiilsnis` y prod `qchpdrolulcgmiliysvr` mantienen **25 migraciones**, última `20261028280000`. Esta publicación no cambió SQL, Auth, variables ni datos. Los contratos existentes, incluido `set_profile_privacy(p_private boolean)`, son compatibles con el corte publicado.

Main `aa6aa3d` ya incorpora trabajo posterior, aún sin publicar: SETTINGS-001 / PR #267, PRIV-002 / PR #270, AVATAR-001 / PR #271 y la corrección parcial de PERF-001 / PR #269. PRIV-001 añade la migración 26 `20261029152251_vote_history_visibility.sql`; AVATAR-001 añade la 27 `20261029190000_profile_avatar.sql`, que recrea get_my_profile con avatar_icon. No desplegar ese frontend sobre el esquema 25.

1. **[OPS-003 #272](https://github.com/migdlp/opinion-social-media/issues/272), P0:** integrar 26/27 en dev, comparando ledger, preparando copia/recuperación y verificando conservación de datos, contratos y RLS. Pendiente, sin reserva de Codex.
2. **[REL-003 #273](https://github.com/migdlp/opinion-social-media/issues/273), P0:** tras dev y recuperación revisados, activar sólo esas pendientes en prod y publicar el candidato verificado de ajustes ampliados, audiencia, iconos y primera optimización del feed. Pendiente, sin reserva de Codex.
3. **PERF-001 #262:** sigue parcial y reservada a su agente. La versión actual aún declara funciones en **iad1**, mientras Supabase está en Irlanda. PR #269 reduce consultas en serie, pero no forma parte de REL-002. Medir después del próximo despliegue y coordinar la región sin atribuirle toda la causa por intuición.
4. **AUTH-001 #258:** conserva su reserva y revisión pendiente; no incluirla sin resolver sus dependencias.
5. **LEGAL-002/003/004:** faltan datos reales/revisión del responsable, retención y canal de derechos. AVATAR-002/003 preparan después Storage y fotos; no inventar textos ni prometer subida activa.

MVP-049/050/051 mantienen aceptación global pendiente y sus reservas de Codex fueron liberadas en `8ed54b8`. REL-002 se cierra con esta evidencia; conservar autores históricos de tareas completadas no significa que sigan reservadas. Consultar siempre main y #73 antes de tomar una tarea.
