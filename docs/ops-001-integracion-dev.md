# OPS-001 — Integración de las migraciones de fase 2 en Supabase dev

Fecha: 28-10-2026 · Destino: `opinion-social-media-dev` (`ltlrujmqenhktiilsnis`, Irlanda). Producción y Vercel no se tocaron. Candidato: `main` en `2ab40e6` (migraciones hasta `20261028280000`).

## Estado anterior

| Elemento | Valor |
|---|---|
| Ledger | 8 migraciones del MVP, última `20261027195157` (`harden_default_privileges`) |
| Objetos de fase 2 | Ninguno. Había una migración huérfana `20261028102153_create_profiles` (de una colisión entre agentes en V2-001) con una firma distinta de la del repo; estaba vacía |
| Datos | 28 encuestas, 56 opciones, 5 votos, 3 usuarios (`auth.users`) |
| Huellas de datos (md5 ordenado por `id`) | `polls` `80112a77…`, `poll_options` `3c3b52cb…`, `votes` `cfd7f904…` |

## Procedimiento

1. **Reconciliación.** La migración huérfana se revirtió (tabla vacía, dos funciones y su fila del ledger) desde el SQL Editor por un editor del proyecto, y se verificó que dev quedaba en `20261027195157`. No se marcó como aplicada ninguna migración cuyo efecto no estuviera comprobado.
2. **Ensayo local** sobre una base nueva con datos equivalentes a los de dev: las 17 migraciones posteriores se aplican sin errores y las huellas de datos no cambian; no se crea ningún perfil.
3. **Aplicación.** `20261028120000` y `20261028130000` con el conector de Supabase y las 15 restantes (`20261028140000` a `20261028280000`) con un único script en una transacción, ejecutado en el SQL Editor. El script comprueba antes que la última migración sea `20261028130000`, así que un segundo paso se detiene sin cambiar nada. Cada versión se registra en `supabase_migrations.schema_migrations` con el nombre del fichero.

## Estado posterior

- **Ledger:** 25 migraciones, de `20261027193208` a `20261028280000`, mismas versiones y nombres que `supabase/migrations/`.
- **Datos:** idénticos (28 / 56 / 5 / 3 y las tres huellas anteriores). Perfiles: 0. No se inventan perfiles ni nombres públicos para las cuentas antiguas.
- **Esquema contra Git** (base local construida con las migraciones del repositorio): 141 elementos comparados (tablas con RLS y permisos, políticas, permisos por columna de `polls` y `profiles`, restricciones, índices, columnas y disparadores) con la misma huella md5 en dev y en local.
- **Funciones:** las 25 funciones de `public` coinciden en tipo (`SECURITY DEFINER`), `search_path` vacío y permisos de `anon` y `authenticated`. **Único matiz:** 24 cuerpos contienen `\r` (saltos de línea de Windows) porque el SQL Editor del panel convirtió los saltos de línea al pegar el script; sin los `\r`, el md5 del código coincide con el de Git en las 24. No cambia el comportamiento. `upsert_my_profile` se aplicó por el conector y no los tiene.

## Comprobaciones funcionales (clave publicable, como la app)

- `polls` visibles para `anon`: 27 de 28 (la oculta no sale). `polls?select=user_id` → `42501`. Se leen `closes_at` y `category_slug`.
- RPC públicas de fase 2: `get_feed` → 200 con el feed ordenado; `get_poll_authors` → 200; `get_profile` de un usuario inexistente → `USER_NOT_FOUND`.
- **Regla crítica:** `get_poll_results` anónimo en una abierta → `AUTH_REQUIRED`; `get_feed_results` anónimo → lista vacía.
- Sin acceso para clientes: `votes`, `follows`, `follow_quota_events`, `poll_reports` y `saved_polls` → `42501` como `anon`; `vote_poll`, `follow_user` y `upsert_my_profile` como `anon` → `42501`.
- **Aplicación real** (`next build` y `next start` contra dev): portada con 20 tarjetas y sin error, detalle de una encuesta, `/login`, `/onboarding` y `/u/<inexistente>` responden 200, y el HTML anónimo no contiene `percentage`, `totalVotes` ni cifras con `%`.

## Hallazgos para el propietario

- **`can_view_author` está expuesta como RPC** (`/rest/v1/rpc/can_view_author`, ejecutable por `anon` y `authenticated`). Está en la lista permitida de `008_privileges`, y hace falta que tengan `EXECUTE` porque la usa la política RLS de `polls`. Para que no sea consultable por REST habría que moverla a un esquema no expuesto (propuesta ya hecha en la revisión de V2-005). Con un UUID de autor, `anon` obtiene si sus encuestas son visibles, es decir, si la cuenta es pública. Riesgo bajo (requiere conocer el UUID, que no se expone), pero conviene decidirlo.
- **Avisos del advisor** (sin cambios de comportamiento): `anon_security_definer_function_executable` (10 funciones, las lecturas públicas previstas) y `authenticated_security_definer_function_executable` (22, la API autenticada); `rls_enabled_no_policy` en `follow_quota_events` y `poll_reports`, que es intencionado (sin acceso de clientes); contraseñas filtradas desactivado (Auth).
- **MVP-005:** el proveedor Email sigue activo en Auth.

## Criterios de OPS-001

1. Plan con discrepancias resueltas y evidencia anterior/posterior sin secretos: este documento.
2. Esquema coincidente con Git, segundo despliegue sin cambios y datos preservados: verificado arriba. El segundo paso queda bloqueado por la comprobación inicial del script.
3. SDK configurado con dev, lecturas y RPC de fase 2 con resultados protegidos: verificado con la app real y por REST; producción y Vercel no se modificaron.
4. Sin bloqueo de acceso: el SQL Editor lo ejecutó un editor del proyecto; no se pidieron tokens.
