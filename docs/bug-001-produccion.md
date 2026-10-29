# BUG-001 — Esquema productivo y feed restaurados

Fecha: 29-10-2026. Incidente [#221](https://github.com/migdlp/opinion-social-media/issues/221). Destino: Supabase prod `qchpdrolulcgmiliysvr`, Los tres cerditos. No se cambió dev, Auth, configuración OAuth ni frontend publicado.

## Causa y comprobación RED

Vercel ya servía `release` SHA `4e22089` (merge de #219), con el frontend de fase 2. Producción tenía **0 tablas en public, 0 funciones propias y ningún ledger**. Había cuatro cuentas y cuatro identidades de Auth. No era un problema de estilos: las peticiones dependían de contratos inexistentes.

`scripts/check-public-contract.mjs` ejecutado contra producción falló con `get_feed no disponible (PGRST202)`, HTTP 404. El primer intento de Node falló por no utilizar el proxy del entorno; se repitió con `NODE_USE_ENV_PROXY=1` y se observó el fallo real de contrato. Un fallo de transporte no se contabiliza como RED de aplicación.

## Ensayo y aplicación

Se concatenaron **sin modificar** los 25 SQL de `supabase/migrations`, junto con sus versiones, nombres y SQL original para el ledger. Envoltorio exclusivamente operativo: transacción, bloqueo asesor, guardas de public/ledger vacíos, timeout, huellas de Auth previas/posteriores y recarga de PostgREST. Nunca se ejecuta sobre tablas existentes. Auth se consulta y bloquea durante la transacción, sin insertar, actualizar o borrar cuentas/identidades.

Ensayo aislado con PostgreSQL 17 y el stub Supabase del repositorio:

- Inicialización: 25 versiones, cuatro usuarios e identidades de prueba conservados.
- Las **25 suites SQL** existentes pasan sobre el resultado.
- Repetición: se rechaza con `INITIALIZATION_REQUIRES_EMPTY_PUBLIC`, sin modificar el estado.
- Fallo inyectado al final (`division by zero`): rollback íntegro, public y ledger quedan ausentes, cuenta previa conservada.

La recuperación ensayada corresponde a esta **inicialización aditiva transaccional de un esquema vacío**. No constituye un dump de producción ni un ensayo de restauración general de Auth/Storage. Los requisitos de recuperación para futuras operaciones con datos existentes siguen vigentes.

Bundle probado: SHA-256 `b950f18b4c80a387af03427fc24611fc0c35d78ee1c956d3cb9b1c4f13520859`. Se aplicó con `apply_migration`, nombre `bug001_initialize_empty_public`. Un primer intento devolvió `Invalid or expired requestState`; se confirmó que public seguía vacío antes de repetir, y el segundo devolvió éxito.

El conector añadió una versión de envoltorio `20261029100400`. Antes de reconciliarla se verificaron **25/25 versiones, nombres y MD5 del SQL original** contra Git, y el MD5 exacto del envoltorio `f84824d59fa12a514c5d02fe2d0d8fa0`. Se retiró sólo esa fila redundante de ledger con guardas de nombre, versión, contenido y total de filas; no se ejecutó ni eliminó ningún objeto de aplicación durante la reconciliación. Quedan las 25 versiones originales, sin marcar SQL pendiente como aplicado.

## Resultado observado

- Nueve tablas propias. Cuatro cuentas y cuatro identidades conservadas; huellas completas de sus filas iguales antes y después.
- El comprobador público pasa: feed, categorías, contrato de perfiles, resultados por lotes vacíos, Siguiendo exige sesión y votos no accesibles al visitante.
- `https://opinion-social-media.vercel.app/` responde con categorías y **«Todavía no hay encuestas»**, sin «No se han podido cargar las encuestas». No se insertaron fixtures en producción para rellenarlo.
- Creación y navegación del usuario se verifican separadamente en BUG-002/003; no se declara login humano completo por haber pasado consultas anónimas.

## Comprobar antes de futuras publicaciones

Con URL y Publishable key del mismo proyecto configuradas en el entorno:

```bash
node scripts/check-public-contract.mjs
```

Es de sólo lectura, no requiere claves administrativas ni publica datos. En este entorno Node 24 necesita `NODE_USE_ENV_PROXY=1` para usar el proxy inyectado. La prueba valida el contrato público, no sustituye las suites de seguridad ni el login con Google real.
