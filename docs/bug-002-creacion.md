# BUG-002 — Publicación de encuestas

Reportado el 29-10-2026 en [#222](https://github.com/migdlp/opinion-social-media/issues/222): pregunta «Tortilla de patata ¿con o sin cebolla?», opciones «Con cebolla» y «Sin cebolla», sin cierre. El frontend mostraba un error genérico porque `create_poll` y las tablas aún no existían en producción.

La reparación de esquema de BUG-001 ([PR #224](https://github.com/migdlp/opinion-social-media/pull/224)) corrige la causa común. No se modifican las validaciones ni se introduce otro camino de escritura.

## Validación observada en producción

Se ejecutó una transacción con una cuenta sintética nueva y claims locales de esa misma cuenta, seguida siempre de **ROLLBACK**. No se usaron sesiones de personas ni se modificaron cuentas existentes.

1. Sin perfil, `create_poll` devuelve `PROFILE_REQUIRED`.
2. Como rol `authenticated`, `upsert_my_profile` crea el perfil de prueba.
3. `create_poll` con la pregunta y las dos opciones reportadas devuelve un ID.
4. La encuesta existe exactamente una vez y tiene exactamente dos opciones.
5. Su ID aparece en `get_feed('recientes', null, null)`.
6. El rollback retira cuenta, perfil, encuesta y opciones de prueba. No quedan fixtures publicados.

Resultado: `OK: perfil requerido, publicación atómica y encuesta en feed; rollback sin fixtures persistentes`.

## Interfaz y regresiones existentes

Se reutilizan las pruebas de `poll-creation-form.test.tsx` y `create-actions.test.ts`, además de los E2E existentes de creación → detalle → feed → voto, recuperación tras error de red y onboarding. El formulario trata `PROFILE_REQUIRED` con un enlace al onboarding de `/create`, conserva los campos ante errores y no repite automáticamente escrituras inciertas.

El circuito de navegador se ejecuta en CI con Supabase local y sesiones sintéticas. La comprobación SQL productiva valida las RPC y los datos; **no se presenta como un login humano de Google ni como una publicación hecha desde el teléfono del propietario**.

Tras la reparación, las cuentas antiguas que aún no tengan `@usuario` deben completar «Elige tu usuario». No se les asigna un nombre automáticamente. El feed productivo puede seguir vacío hasta que se publique la primera encuesta real.
