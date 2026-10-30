# DESIGN-014 — Claro inicial y cambio por icono

D-032 sustituye el selector anterior por un botón de 44 × 44 px que alterna Claro/Oscuro. El icono muestra el tema actual y el nombre accesible/title indica la acción siguiente («Activar modo oscuro» o «Activar modo claro»). Se reutiliza el mismo control en cabecera y Ajustes; no hay desplegable ni opción Sistema.

Sin preferencia, con un valor inválido o Sistema heredado se usa Claro; se conserva Oscuro guardado explícitamente. El dispositivo ya no altera el default ni las variantes dark:. La CSS inicial también es clara con JavaScript desactivado. El bootstrap estático en head aplica la preferencia antes del body; sólo acepta el valor oscuro literal, sin interpolación de datos.

Se mantiene `opinion-theme`: no hay cookies nuevas, ni cambio de sesión o backend. Leer el valor heredado no reescribe almacenamiento; sólo el clic guarda light/dark. Sigue funcionando durante la visita si el navegador bloquea almacenamiento, y sincroniza cambios entre controles/pestañas.

## Pruebas observadas

- RED: `npx vitest run src/components/theme-selector.test.tsx src/lib/theme.test.ts`, 16 fallos y 2 correctas antes del cambio (desplegable/default Sistema/bootstrap sin Claro explícito).
- GREEN focal: selector, bootstrap, contraste y Ajustes, 81 correctas.
- `npm run check`: formato, lint, tipos, **775 unitarias y build** correctos.
- Playwright local sobre Next compilado, Chromium del sistema, **18 recorridos correctos**: defaults en dispositivo oscuro, valores heredados, pre-body/hidratación, almacenamiento bloqueado, persistencia/navegación, dos pestañas, teclado/foco/44 px y 320/390/1280, y Claro sin JavaScript. Capturas locales reales de ambos temas revisadas.
- El primer intento de navegador no arrancó por falta de configuración de Supabase. Se repitió con URL/clave de demostración apuntando exclusivamente a localhost; no se conectó a un proyecto alojado. El feed podía mostrar su estado de error por ausencia de API; esa prueba local acredita el tema, no el flujo de datos/autenticación. La CI comprueba el conjunto con Supabase efímero real.
- Las regresiones visuales existentes ahora eligen tema con el botón real (`e2e/support/theme.ts`); cambiar sólo colorScheme ya no debe oscurecer la aplicación. Se mantienen matrices de ambos temas y tests de Ajustes con dos controles compartidos.

CI completa y merge se registran en el issue #276 y la PR. No hay cambios de SQL, Auth, infraestructura ni despliegue en esta tarea.
