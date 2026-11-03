# OPS-003 — Preparación de integración exclusiva en desarrollo

Estado del 30-10-2026: **preparación verificada; integración alojada bloqueada por la copia previa no autorizada**. [Tarea #272](https://github.com/migdlp/opinion-social-media/issues/272). No se ha aplicado SQL a dev ni a prod en esta sesión.

## Separación observada

| Comprobación | Resultado |
|---|---|
| Vercel Development / Preview | URL de `opinion-social-media-dev`, `ltlrujmqenhktiilsnis` |
| Vercel Production | URL de `opinion-social-media-prod`, `qchpdrolulcgmiliysvr` |
| Dominio productivo | READY, release `60d841b`, deployment `dpl_AZyUak2vjYzubEMi7sf2kzQ7SG3v`; no cambio de versión |
| Ledger de dev / prod | Ambos 25 migraciones; última `20261028280000` |
| MCP del repositorio | Dev y `read_only=true`, sin cambio |
| Configuración de este workspace | `.env.local` sólo dev, modo development y Publishable key dev; permisos 0600 y excluida de Git |
| Conectividad local | `NODE_USE_ENV_PROXY=1 npm run check:env`: proyecto dev, Auth health HTTP 200 |

Se leyeron las URLs públicas y metadatos de configuración sin mostrar claves. No se modificaron variables de Vercel, Auth o producción. Las nuevas funciones de main no estaban ejecutándose en la web pública: el código y la versión publicada son estados diferentes. El problema de integración encontrado es que dev todavía no tiene las migraciones de privacidad/iconos que exige el frontend nuevo.

La instrucción actual del propietario es desarrollar y probar en dev. Una indicación histórica de otra sesión sobre pruebas en producción abierta no autoriza experimentación productiva. Las comprobaciones públicas de una release y una publicación explícitamente autorizada son operaciones distintas.

## Contrato previo observado: falta la integración

En dev son falsos `vote_visibility_rpc`, `avatar_rpc`, `vote_column` y `avatar_column`; `get_my_profile` devuelve sólo username, display_name e is_private. No se fuerza el frontend a usar producción para suplirlo.

Objetivo reservado: aplicar en dev `20261029152251_vote_history_visibility.sql` y después `20261029190000_profile_avatar.sql`, sin repetir las 25 previas. La migración 28 de bio pertenece a una tarea aún parcial: no se aplica automáticamente por estar en main.

## Ensayos completados sin datos reales

PostgreSQL 17 en contenedor propio sin red, con Auth mínimo de pruebas. Fuente congelada `aa6aa3d` para reproducir exactamente el conjunto de 27 migraciones y sus tests, sin incluir bio/bloqueos en progreso.

- Se aplicaron **27 migraciones y 27 suites SQL** con helpers del repositorio; todas correctas.
- `scripts/check-vote-history-upgrade.sh` ensayó 25→26 sobre cuentas/votos sintéticos existentes. Después se aplicó 27 a esa base de prueba.
- Se realizó un pg_dump local de esa base sintética, cifrado GPG, descifrado y pg_restore a una segunda base aislada. Comparación correcta: 3 cuentas, 3 perfiles, 1 encuesta, 1 voto, 3 historiales inicialmente privados y get_my_profile con avatar_icon.
- El archivo cifrado de prueba tiene SHA-256 `024bb19ff63b7dc81e833430b7d09a2018f8c4611ca5ac0a5e702d390efd93f6`. **No es una copia de dev ni una garantía de recuperación de datos reales.**
- Helpers operativos de esta sesión: `/tmp/ops003-verify-local.py` y `/tmp/ops003-synthetic-restore.py`; ejecutan archivos versionados y herramientas locales. Para repetir, usar ese ref con PostgreSQL local, el stub, las 27 migraciones/tests y el script de upgrade; nunca dirigir el script de tests/reset a un proyecto alojado.

Las pruebas de permisos/historial/avatar provienen de las suites SQL 026/027 y sus regresiones, no de pruebas destructivas sobre usuarios reales. No se afirma una validación autenticada del frontend contra dev actualizado: depende de aplicar esas migraciones.

## Bloqueo de copia real y plan concreto pendiente

Antes de modificar datos alojados, el runbook exige «Copia consistente, fecha objetivo, ubicación cifrada, permisos y ensayo aislado; o bloqueo explícito si falta» ([preflight](vercel-operacion.md)).

La revisión automática **rechazó** exportar la copia cifrada al workspace: «cifrarlo no autoriza ese payload sensible ni su destino concreto». No se evitó la revisión con otra vía; no hay archivo con datos reales exportados ni migraciones aplicadas.

Se pidió al propietario autorizar este alcance antes de continuar:

1. Snapshot consistente de las tablas de la aplicación de **dev**, para conservar perfiles, encuestas, opciones, votos y relaciones durante el cambio. No copiar contraseñas, tokens o datos de producción ni registros de Auth completos.
2. Cifrado antes de transferir, copia en `/workspace/.private-ops003-backup`, fuera del repositorio; claves de cifrado separadas, acceso 0700/0600. No publicar contenido en GitHub, logs o artefactos compartidos.
3. Descifrado/restauración exclusivamente en PostgreSQL local aislado, conservación y comparaciones verificadas. Las referencias de usuario necesarias se reconstruyen sólo como IDs de prueba, sin cuentas Auth reales.
4. Con esa verificación y el permiso explícito, aplicar sólo 26/27 en dev, comparar ledger/contratos/RLS/datos y documentar resultado. Producción permanece en 25 y no se publica frontend como efecto lateral.

Si se prefiere una copia gestionada por el propietario en Supabase, verificar el destino y ensayo de recuperación equivalente antes de reemplazar este plan. No asumir una copia existente ni que el ensayo con datos sintéticos la sustituya. OPS-003 queda sin reserva activa de esta sesión si no llega respuesta.

## Advisors leídos antes de intervenir

No se ejecuta una corrección automática de permisos que rompa los contratos públicos:

- Dos avisos informativos [RLS sin políticas](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), poll_reports y follow_quota_events: tablas internas sin lectura directa; operaciones controladas por RPC.
- Diez avisos de [SECURITY DEFINER ejecutable por anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) y 22 por [authenticated](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Es el patrón RPC del proyecto; sus comprobaciones de sujeto, visibilidad, voto y search_path se prueban en SQL/HTTP. No se declara el advisor limpio ni se revocan RPC públicas sin revisar cada contrato.
- [Leaked password protection desactivada](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection): aviso previo de configuración Auth, fuera del cambio 26/27. Coordinar con la tarea de Auth; no se han cambiado proveedores o duración de sesión.
