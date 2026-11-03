# DESIGN-015 — Alineación de tarjetas

En escritorio, cada pareja de tarjetas comparte las filas de metadatos, pregunta,
votación, cierre y pie mediante CSS subgrid. Las preguntas largas y las encuestas de
2–6 opciones determinan el espacio necesario; no se recorta contenido ni se fijan
alturas. Los botones de votar se anclan al final de su zona, y los pies conservan el
mismo inicio aunque el nombre visible ocupe varias líneas. El DOM y el orden de
lectura permanecen iguales.

El cambio se limita a las tarjetas dentro de FeedList, incluidas las que añade su
paginación; el detalle individual conserva su composición. En móvil se mantiene una
columna con alturas naturales. Sin soporte de subgrid se conserva la cuadrícula
normal con tarjetas estiradas y pie al final; ese fallback no garantiza todos los
anclajes interiores. No se añaden mediciones JavaScript ni dependencias.

## Verificación

- RED observado en Chromium del sistema: dos tarjetas de la misma fila terminaban
  a 436,5 y 756,5 px, una diferencia de 320 px. También diferían las posiciones de
  opciones, botón y pie. Se midieron componentes reales con fixtures sintéticos
  locales antes de modificar los estilos.
- GREEN local: 320/390/1024/1280 px, Claro/Oscuro, antes y después de votar y de
  añadir tarjetas. Bordes, títulos, opciones, pies y botones de cada pareja quedan
  dentro de 1 px; móvil sin solapamientos ni desbordamiento horizontal. Capturas
  revisadas de escritorio claro y móvil oscuro. El ensayo usa acciones simuladas
  sólo en el harness local: acredita la composición, no la integración de datos.
- Regresión versionada: `e2e/cuadricula-encuestas.spec.ts`, ejecutada por
  `npm run test:e2e`. Usa la aplicación completa y Supabase efímero local de CI,
  sesiones y RPC reales; combina preguntas/respuestas largas, 2/3/6 opciones,
  encuestas cerradas y votadas. Comprueba la alineación antes/después del voto,
  ambos temas y cuatro anchos, genera capturas y prueba 23 tarjetas con Cargar más.

Los resultados completos de CI y el merge se registran en la PR y el issue #279.
Esta tarea no aplica migraciones ni publica en Vercel. Desarrollo alojado sigue
siendo `ltlrujmqenhktiilsnis`; producción se mantiene en `release`.
