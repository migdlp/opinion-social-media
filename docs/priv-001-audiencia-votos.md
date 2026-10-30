# PRIV-001 — Backend de privacidad del historial

## Contrato y decisión de migración

La actividad de voto tiene audiencia propia: `private` (Solo yo), `followers` (seguidores aceptados) o `profile` (según privacidad de cuenta). No sustituye el permiso de la cuenta ni el de la encuesta. El propietario solicitó poder ocultar qué encuestas vota incluso a sus amigos; D-017 define amigos como seguidores aceptados.

Se ha revisado la propuesta conservadora del backlog y se elige **Solo yo para nuevas y existentes**. Es un cambio restrictivo respecto a D-018: tras aplicar la migración, los historiales antes visibles dejan de compartirse hasta que el titular elija otra audiencia. No se modifica la privacidad de cuenta, los votos, su opción, los resultados agregados ni las relaciones. El dueño conserva su historial. La aplicación del SQL compartido debe coordinarse con los controles de PRIV-002 y la revisión de la versión; no se ejecuta sobre dev/prod durante esta tarea.

Migración creada con la CLI 2.122.0: `20261029152251_vote_history_visibility.sql`. La columna tiene DEFAULT constante, NOT NULL y CHECK. No se amplía el GRANT de columnas públicas de profiles. `get_my_vote_visibility` y `set_vote_visibility` son RPC sólo para authenticated con auth.uid y perfil, sin argumento de usuario objetivo. Mantienen search_path vacío, revocación de PUBLIC/anon y comprobación propia pese a SECURITY DEFINER. Es necesario el acceso privilegiado porque los clientes no pueden leer/escribir la columna directamente.

`get_profile_votes` comprueba primero privacidad de cuenta, después audiencia y sólo entonces consulta filas/cursor. Niega con `VOTES_PRIVATE`, sin encuestas, elecciones ni metadatos del historial. P-1 y visibilidad del autor de cada encuesta permanecen en la consulta. El backend no almacena esos resultados en una caché pública; las páginas existentes consultan por petición. Nada puede borrar datos que otro navegador ya hubiera recibido con permiso.

## Pruebas reales

- Runner SQL: `scripts/db-test-local.sh`, sobre PostgreSQL 17 aislado con stub de Auth. Los 25 tests previos pasaron antes del cambio. RED del nuevo test: se esperaba VOTES_PRIVATE para un seguidor y la RPC entregó historial. Tras implementación, los 26 archivos SQL pasan.
- Vitest: RED de adaptadores ausentes y códigos no reconocidos (7 fallos); GREEN de 141 casos enfocados en operaciones/errores/preferencia.
- `npm run check`: 672 pruebas unitarias, formato, lint, tipos y build correctos.
- Ensayo de migración: `scripts/check-vote-history-upgrade.sh` siembra cuentas/perfiles/encuesta/voto antes de aplicar la nueva migración; comprueba conservación y valor inicial privado. Añadido al job SQL de CI.
- Nuevas pruebas HTTP en `tests/security/vote-visibility-attacks.test.ts`: matriz de dos tipos de cuenta, tres audiencias, propio/aceptado/pendiente/extraño/anon; permisos directos, identidad ajena, valores inválidos, cierre, agregados y revocación con cursor anterior. Las antiguas pruebas de P-1 optan explícitamente por profile para conservar su objetivo, sin cambiar el nuevo valor inicial.
- E2E `historial-privado.spec.ts`: ausencia de encuesta/ID en HTML/RSC para un visitante, cambios de audiencia y acceso del propietario. Datos y permisos reales de Supabase local efímero en CI; no Google ni proyectos alojados.

El entorno local no dispone de espacio para la imagen completa de Supabase; se usa PostgreSQL aislado para SQL y la pila efímera de CI para HTTP/Auth/tipos generados/navegador. El error inicial del wrapper local de psql y la ruta de telemetría CLI no se cuentan como RED de aplicación; se corrigió el entorno antes de observar el fallo de permisos real.

Supabase CLI `db advisors --db-url` contra PostgreSQL local aislado: **No issues found**. La primera conexión exigía TLS a un servidor de pruebas sin TLS; se corrigió la conexión local con `sslmode=disable`, sin alterar conexiones remotas. El inventario de permisos SQL y las pruebas HTTP complementan el asesor.

## Alcance pendiente

La UI y la invalidación tras guardar son PRIV-002; SETTINGS-001 y V2-008 conservan sus dependencias/reservas. Las migraciones no están aplicadas en los proyectos compartidos y no hay publicación de esta versión por esta tarea. Los resultados finales de CI y la integración se registran en el issue #249 y la PR correspondiente antes del cierre.
