# Rediseño After Sunset claro — 29-10-2026

## Fuentes y alcance

El [encargo pegado por el propietario](fuentes/encargo-aftersunset-claro-2026-10-29.md) es la petición que se implementa. El [ZIP extraído](fuentes/aftersunset-claro/README.txt), sus PNG y HTML son referencias visuales. Las instrucciones incluidas en el ZIP no sustituyen la petición ni los contratos de seguridad. Sus números y votos JavaScript son ilustrativos: no se ejecutan en la aplicación.

Registro: [DESIGN-012 #235](https://github.com/migdlp/opinion-social-media/issues/235), con P0 funcional/visual, P1 movimiento y P2 refinamiento/entrega. Los defectos concretos tienen sus tareas [DESIGN-007 #227](https://github.com/migdlp/opinion-social-media/issues/227) y [DESIGN-008 #228](https://github.com/migdlp/opinion-social-media/issues/228). Reservas, estado e integración se consultan en `main`, [tareas-futuras.md](tareas-futuras.md).

## Decisiones sobre funciones existentes

| Diferencia con el brief original | Resolución |
|---|---|
| Indica 2–4 opciones; V2 permite 2–6 | Conservar 2–6 y comprobar textos máximos, sin cambiar validación ni SQL |
| Indica sin seguidores/perfiles; existen perfiles, privacidad y Siguiendo | Conservar la función operativa y las pestañas cronológicas acordadas en D-022 |
| Resultados sólo tras votar; D-020 permite cerradas | En abiertas, incluso el autor debe votar; cerradas autorizadas conservan resultados públicos y 24 h en feed |
| La lámina dice PEEK y muestra funciones sociales adicionales | Nombre Opinión provisional; no añadir likes, comentarios, buscador ni controles sin acción real |
| ZIP con prototipo que simula cifras | Usar sólo composición, paleta y ritmo. Las cifras de la app proceden de RPC y las de capturas son votos reales en la base efímera de pruebas |

## Cambios

P0: tarjetas de radio 20 px, pregunta destacada, metadatos discretos, selección con superficie cálida y confirmación explícita. Crear desaparece de la cabecera móvil; sigue disponible en la navegación inferior. Categorías en una fila con desplazamiento local y teclado. El menú conserva una capa opaca, posicionamiento dentro del viewport, Escape y devolución de foco.

Resultados agrupados, barras melocotón/lavanda con contorno interior contrastado y cifras tabulares; «Tu voto», total y «Ya has votado». Sin atribuir un voto a visitantes de encuestas cerradas. Guardar y compartir son acciones independientes. La pregunta enlaza al detalle sin una capa extendida que intercepte otras acciones. Se conserva «Ver más encuestas» del detalle.

P1: selección 160 ms, pulsación 100 ms, confirmación 180 ms, barras 350 ms, menú 140 ms y categorías 150 ms. No se anima antes de una respuesta correcta ni se demora el servidor. `prefers-reduced-motion` elimina movimiento, incluidas transiciones de selección y menú.

P2: estados vacíos/carga/formularios coherentes, iconos SVG de trazo 1,8, foco/contraste y referencias disponibles para otros agentes. Sin paquetes nuevos, cambios de esquema, Auth ni infraestructura.

## Archivos principales

- `src/app/globals.css`: roles de color, opciones, barras, superficies y movimiento.
- `src/components/poll-card.tsx`, `poll-detail-view.tsx`, `poll-option.tsx`, `poll-voting.tsx`, `poll-results.tsx`: ciclo de voto.
- `header.tsx`, `mobile-nav.tsx`, `mobile-navigation.tsx`, `feed-controls.tsx`, `category-rail.tsx`: navegación y categorías.
- `copy-link-button.tsx`, `report-poll.tsx`, `save-poll.tsx`, `poll-author.tsx`: acciones y autoría.
- Formulario de creación, acceso, skeletons y estado vacío: adaptación visual sin cambios de negocio.
- Tests de componentes/contraste y E2E; `.github/workflows/ci.yml` publica sólo los PNG visuales en ejecuciones correctas, sin sesiones ni trazas en ese artefacto.
- `DESIGN.md`, `PRODUCT.md`, decisión D-027 y fuentes originales: contrato compartido.

## Verificación

TDD ejecutado con Vitest antes de implementar: 33 fallos de CTA/roles ausentes; dos fallos por estados «Ya has votado»/cerrada; fallo adicional al exigir barras sin retrasos escalonados. Tras implementación, 118 pruebas enfocadas pasan. El aviso contiene la palabra «voto», por eso las comprobaciones de ausencia se refieren a porcentajes y **recuentos numéricos**, manteniendo la comprobación de ausencia de barras.

La revisión completa detectó regiones `status` vacías repetidas al compartir desde cada tarjeta. Se renderizan sólo cuando hay un mensaje, para conservar el anuncio inequívoco de carga del feed.

La integración y las capturas se verifican contra Supabase local efímero en CI. El entorno de trabajo no puede descargar su imagen PostgreSQL por falta de espacio bajo el controlador Docker existente; no se reinicia ni escribe en los proyectos compartidos para resolverlo. Las capturas cubren 320, 375, 390, 430, 768 y 1280 px, ambos temas, antes de votar, selección sin enviar y resultados confirmados. Las pruebas existentes cubren textos máximos, seis opciones, menús, recuperación de red, voto duplicado, cronología y fugas HTTP/RLS.

Este cambio no despliega Vercel: producción sigue la versión de `release` hasta publicación autorizada. El cierre de DESIGN-012 exige CI verde y revisión de las capturas reales; los enlaces finales y los resultados quedan en el issue/PR y en el registro de tareas.
