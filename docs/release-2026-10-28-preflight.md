# Publicación solicitada para las 22:00 del 28-10-2026

Seguimiento: MVP-049 #56 y [PR de versión #219](https://github.com/migdlp/opinion-social-media/pull/219). El propietario autoriza preparar y publicar; la autorización no acredita las comprobaciones pendientes. No se ha creado un deployment ni aplicado SQL en producción durante este preflight.

## Candidato y código

- Implementación revisada: `c14039aa2ceda041193bbb7c5761a51b8712a068`, [CI completa verde](https://github.com/migdlp/opinion-social-media/actions/runs/40769505317).
- `main` añade después `3b11289`, exclusivamente la reanudación de MVP-049. Comprobar el SHA final de nuevo antes del merge a `release`.
- `release` sigue en `1491468e01e2b73df045585f3c339468edec76e4`. La PR #219 está en borrador y no se fusionará hasta completar las condiciones de publicación.
- 25 migraciones versionadas: desde `20261027193208_create_polls_and_options.sql` hasta `20261028280000_follow_quota_events.sql`. Desarrollo ya tiene ese esquema (OPS-001). No copiar usuarios, encuestas ni fixtures de dev a producción.

## Observaciones de producción, 21:51–21:55 UTC

Destino exclusivo: Supabase `opinion-social-media-prod`, ref `qchpdrolulcgmiliysvr`, organización Los tres cerditos. Consultas de sólo lectura:

```sql
select
  (select count(*) from auth.users) as auth_users,
  (select json_agg(tablename) from pg_tables where schemaname = 'public') as tables,
  to_regclass('supabase_migrations.schema_migrations') as ledger;
```

Resultado: **2 cuentas Auth; ninguna tabla en public; ledger inexistente**. No interpretar ledger inexistente como un error que justifique resetear la base. No borrar ni recrear cuentas.

`GET /auth/v1/settings`, con la clave publicable del mismo proyecto: Google activo y Email activo. `GET /auth/v1/authorize?provider=google` redirige con HTTP 302 a `accounts.google.com`; el callback de Google es `https://qchpdrolulcgmiliysvr.supabase.co/auth/v1/callback`. Esto no prueba login completo ni que la allowlist de retorno de la aplicación esté configurada.

Vercel: equipo `team_Iu3JavtCo0Kv8xW8ebnGukLb`, proyecto `prj_tUC8ZwzxHISZkmzMKd2z2UmVcN5E`. Los siete registros públicos de entorno mantienen URL/Publishable key de dev para development/preview y de prod para production, más la marca de entorno correspondiente. No se consultan claves privilegiadas.

## Requisitos pendientes antes de publicar

1. Completar V2-008 (ajustes; reserva ajena), DESIGN-004, DESIGN-006, aceptación manual OPS-002 y DOC-009 según el registro vivo. El aviso en #73 solicita estado o traspaso explícito; no modifica responsables.
2. Verificar en el panel de Vercel que Production Branch sea `release`. `get_project` no expone ese dato y `update_project` no permite cambiarlo. No se dispone de CLI autenticada ni navegador conectado en esta sesión. Se ha pedido al propietario la comprobación concreta.
3. Disponer de copia de producción y restauración ensayada según el runbook. No hay conexión PostgreSQL configurada en este entorno; el conector SQL no sustituye un dump completo. Conservar las dos cuentas Auth existentes. No pedir contraseñas ni tokens en el chat.
4. Revisar y aplicar las 25 migraciones pendientes con historial de versiones correcto, usando CLI autenticada cuando esté disponible. Antes comparar catálogo e inventario; después verificar esquema, RLS, permisos y cuentas conservadas. No reset remoto, no SQL inverso improvisado ni reparación del ledger a ciegas.
5. En Auth prod: desactivar Email; verificar Site URL `https://opinion-social-media.vercel.app` y Redirect URL `https://opinion-social-media.vercel.app/auth/callback`; completar Google real con una persona. Se han solicitado los ajustes al propietario porque el conector no expone configuración Auth.
6. Con CI verde del SHA final y requisitos anteriores verificados, actualizar la PR #219, salir de borrador y fusionar hacia `release` dentro de la autorización recibida y sin hacerlo antes de las 22:00. Seguir el deployment Production por su SHA; comprobar dominio, feed, login, publicación, voto único, resultados autorizados y ausencia de secretos.

La hora de ejecución de esta sesión es UTC; no se ha deducido otra zona horaria. Una hora objetivo no convierte un preflight incompleto en un resultado aceptado. Los bloqueos se mantienen visibles en MVP-049; MVP-050/051 sólo se completan con pruebas productivas observadas.
