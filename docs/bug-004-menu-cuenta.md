# BUG-004 — Cierre del menú de cuenta

El `<details>` de cuenta sólo cerraba al pulsar el avatar o Escape. Se conserva el control nativo y su aspecto, añadiendo cierre por pointerdown exterior, salida de foco con Tab, enlace interior y envío del formulario de logout. No se cancela el clic exterior ni se fuerza foco allí; Escape sí vuelve al summary. Un listener de documento se limpia al desmontar.

TDD de componente: seis fallos observados antes del cambio, siete pruebas en verde después. `npm run check` local: 679 pruebas, formato/lint/tipos/build correctos.

Se comprobó el componente real en Chromium con un harness Vite y acción externa de prueba: el menú cierra, la acción exterior se ejecuta y Escape devuelve el foco. Captura local revisada a 390 px. El primer locator de prueba asumía rol ARIA button, pero Chrome expone summary como **DisclosureTriangle**; CDP Accessibility confirmó el nombre «Menú de cuenta», foco y propiedad expanded=true. Se corrigió el locator, sin reemplazar la semántica nativa con atributos artificiales. Los E2E comprueban la propiedad nativa open y la visibilidad de los contenidos.

E2E de la app compilada con Supabase local efímero en CI: 320/1280, claro/oscuro, clic/tap exterior, Escape/Tab, enlaces de perfil/ajustes/solicitudes y logout real. `/settings` aún depende de V2-008: se verifica su navegación y cierre, no se presenta la pantalla pendiente como implementada. Los resultados finales e integración se registran en el issue #246 y la PR #260 antes de cerrar la tarea.

Sin cambios de autenticación, datos o cookies. No se ha publicado otra versión de Vercel por esta tarea. No se ha probado con lector de pantalla físico; la comprobación de accesibilidad mencionada usa el árbol AX de Chromium y teclado.
