# DESIGN-013 — Selector de tema

Claro, Oscuro y Sistema están disponibles en la cabecera para visitantes y cuentas. El control nativo tiene etiqueta «Tema», icono según la opción, área de 44 × 44 px y foco visible en su contenedor. Respeta la dirección After Sunset y los mismos tokens de contraste.

Sistema es el valor inicial y sigue los cambios del dispositivo mediante CSS. Una elección manual prevalece también sobre las variantes `dark:` de Tailwind. Un script estático en el head lee la preferencia antes del body; sólo acepta light/dark y no interpola contenido del visitante. La excepción de hidratación se limita al html que modifica ese script.

La clave localStorage `opinion-theme` contiene únicamente light o dark. Sistema elimina la clave. No se escribe nada hasta elegir explícitamente y no se añade ninguna cookie, llamada a Supabase ni dato de cuenta. Persiste hasta cambiarla o borrar datos del navegador, sin sincronización entre dispositivos. Si el almacenamiento falla, funciona durante la visita. Los cambios de otra pestaña se reflejan sin recargar.

`ThemeSelector` se puede reutilizar en Ajustes. La inserción en esa página corresponde a SETTINGS-001 / V2-008: su base sigue reservada a otro agente. Esta tarea no da por implementada la ruta /settings.

## Verificación

- RED real: Vitest sobre contraste (1 fallo / 51 correctas), por ausencia de override manual; y Header (3 fallos), porque no existía el selector accesible.
- GREEN inicial: `npx vitest run src/components/theme-selector.test.tsx src/app/contrast.test.ts`: 55 correctas.
- Revisión local de React y CSS compilado con Tailwind en Chromium: teclado Home/ArrowDown selecciona Claro, foco 2 px, sin overflow a 320 px, colores y variantes dark: respetan Claro/Oscuro/Sistema. Harness de componentes con autenticación simulada, no recorrido de aplicación completo.
- Formato, lint, tipos y 691 unitarias correctas. `next build` local bloqueado por binding de puerto interno de Turbopack (EPERM), también con ejecución ampliada; no se cuenta como fallo funcional ni se omite el build de CI.
- Pruebas de navegador añadidas: sistema/manual, persistencia y navegación, bootstrap anterior al body e hidratación, almacenamiento bloqueado, tamaños 320/390/1280 y capturas en ambos temas. El resultado completo se registra en la PR y en la tarea al terminar la CI.

No incluye despliegue ni migraciones alojadas.
