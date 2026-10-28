# Cierre del feed (V2-031 a V2-036)

Estado: **implementado y verificado en local/CI; sin desplegar**. Este documento recoge qué se entregó, con qué evidencia, qué **no** está verificado y cómo comprobarlo después de una publicación autorizada. Describe el resultado de [D-022 a D-025](decisiones.md); el diseño está en [feed-por-definir](feed-por-definir.md). No acredita que el feed esté en producción: la publicación sólo ocurre por el flujo de `release` con orden del propietario ([AGENTS.md](../AGENTS.md#despliegues-de-producción-por-sprint)).

## Qué se entregó

| Tarea | Resultado | PR |
|---|---|---|
| V2-031 | RPC `get_feed` (Recientes/Siguiendo, categoría, cursor compuesto, retención de 24 h tras el cierre) y adaptador `getFeed`; contrato en [contratos-api §3.14](contratos-api.md) | [#204](https://github.com/migdlp/opinion-social-media/pull/204) |
| V2-032 | `/` con pestañas Recientes/Siguiendo y filtro de categoría en la URL (`?tab=`, `?categoria=`), entrada por defecto según los seguimientos aceptados | [#206](https://github.com/migdlp/opinion-social-media/pull/206) |
| V2-033 | Voto desde la tarjeta (mismo componente y acción que el detalle); el visitante vuelve del login a `/polls/<id>?option=<opción>` sin voto automático | [#205](https://github.com/migdlp/opinion-social-media/pull/205) |
| V2-034 | Scroll infinito con `IntersectionObserver` y botón «Cargar más» siempre disponible | [#208](https://github.com/migdlp/opinion-social-media/pull/208) |
| V2-035 | Ataques HTTP al feed (modos, categorías, cursores, retención, voto simultáneo) y prueba por mutación | [#207](https://github.com/migdlp/opinion-social-media/pull/207) |
| V2-036 | E2E del recorrido completo en escritorio y móvil y esta ficha | [#209](https://github.com/migdlp/opinion-social-media/pull/209) |

## Reglas del feed (resumen)

- **Entrada:** visitante → Recientes. Cuenta con algún seguimiento **aceptado** → Siguiendo; sin ninguno, o sólo con solicitudes pendientes → Recientes. Una pestaña o categoría explícita en la URL gana; una desconocida se ignora.
- **Recientes** = todo lo publicado que quien mira puede ver. **Siguiendo** = sólo autores seguidos con relación aceptada; sin sesión se rechaza. Ambas cronológicas, 20 por página, sin ranking ni popularidad.
- **Categoría** opcional («Todas» por defecto), validada en la base de datos.
- **Retención (D-025):** una cerrada permanece en el feed hasta `closes_at + 24 h` (límite exclusivo, hora del servidor) con sus resultados públicos para quien pueda verla; después sale del feed sin borrarse y su enlace y su perfil siguen funcionando. Sin fecha de cierre no caduca.
- **Voto:** las abiertas no votadas no llevan cifras (ni en HTML, ni en props, ni en respuestas); al confirmar, la tarjeta pasa a mostrar los resultados. Las votadas y las cerradas muestran resultados desde la carga; las cerradas no admiten voto.

## Evidencias

- Pruebas unitarias y de componentes: `npm run check` (formato, lint, tipos, Vitest y build).
- SQL: `supabase/tests/024_feed_read.test.sql` (modos, categorías, cursor estable con fechas iguales, límite exacto de 24 h con el reloj fijado) y `008_privileges`.
- Ataques HTTP: `tests/security/feed-attacks.test.ts` junto con `social-attacks.test.ts` y `rls-attacks.test.ts` (job «Ataques a RLS por HTTP»). Prueba por mutación documentada en la [PR #207](https://github.com/migdlp/opinion-social-media/pull/207#issuecomment-6471201954): `get_feed` sin `can_view_author`, con solicitudes pendientes y sin retención deja en rojo SQL y HTTP.
- E2E: `e2e/feed.spec.ts` (recorrido completo), `e2e/voto-tarjeta.spec.ts` (voto desde la tarjeta) y `e2e/ciclo-social.spec.ts`, en escritorio y móvil (Playwright, Supabase local). Dos ejecuciones independientes de CI (eventos `push` y `pull_request` del mismo SHA `2e801b6`, en runners distintos) pasaron los dos proyectos: [push](https://github.com/migdlp/opinion-social-media/actions/runs/40705953033) y [pull_request](https://github.com/migdlp/opinion-social-media/actions/runs/40705964712). Se lanzaron a la vez, no una tras otra. Un primer intento (`167d807`) falló por selectores demasiado amplios y por esperar a `networkidle`, no por el comportamiento de la aplicación; corregido en `2e801b6`.

## No verificado

- Las migraciones de la fase 2 (`20261028120000` a `20261028270000`) **no están aplicadas** en Supabase de desarrollo ni de producción; hasta aplicarlas, el feed nuevo no funciona en esos entornos.
- Ninguna comprobación manual en navegador real: foco, lector de pantalla, 320 px con dispositivos reales, umbral del scroll en móvil.
- Rendimiento con volumen real: el `exists` de «Siguiendo» y `can_view_author` por fila no se han medido a gran escala.
- Nada de esto se ha desplegado ni probado contra Vercel: no se crean despliegues como prueba (créditos del plan gratuito).

## Checklist antes de publicar (a cargo de quien proponga el paso a `release`)

1. CI verde del SHA candidato en `main`, incluidos los E2E y los ataques HTTP.
2. Todas las tareas de la versión **Completada** en [tareas-futuras](tareas-futuras.md) con enlaces a PR y pruebas.
3. Migraciones: aplicar en el orden de `supabase/migrations/` primero a **desarrollo** y comprobar `list_migrations`; sólo con orden del propietario, a producción. No conectar desarrollo ni previews a producción.
4. Regenerar los tipos de Supabase y comprobar que no hay diferencias con `src/lib/supabase/database.types.ts` (el job de CI ya lo exige).
5. PR de `main` a `release` con la lista de tareas y el SHA; la aprueba el propietario. Ningún agente fusiona en `release` ni dispara `vercel --prod`.

## Comprobación posterior en producción (tras una publicación autorizada)

Sin crear deployments adicionales ni usar cuentas reales de terceros; con cuentas de prueba propias:

1. `/` como visitante: entra en **Recientes**; «Siguiendo» lleva al login y vuelve a esa pestaña; el HTML no contiene porcentajes ni recuentos de encuestas abiertas.
2. Con una cuenta sin seguimientos: Recientes. Tras seguir (y que acepten) a una cuenta con encuestas: Siguiendo muestra sólo las suyas.
3. Filtro de categoría: la selección sobrevive a recargar y el scroll/botón recorren todas las páginas sin repetir tarjetas.
4. Votar desde una tarjeta de una encuesta de prueba: los resultados aparecen en la tarjeta, persisten al recargar y se cuenta un único voto.
5. Una encuesta de prueba cerrada hace menos de 24 h sigue en el feed con resultados; una cerrada hace más de 24 h no está en el feed pero su enlace funciona.
6. Una cuenta privada de prueba: sus encuestas no aparecen en el feed de un extraño ni de una solicitud pendiente.
7. Si algo falla, el rollback es el de la [guía de operación de Vercel](vercel-operacion.md); no se corrige directamente en producción sin PR.
