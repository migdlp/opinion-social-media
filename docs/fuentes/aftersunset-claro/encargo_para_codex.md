# TASK PARA CODEX — Rediseño UX/UI After Sunset (modo claro prioritario)

Actúa como diseñador/a de producto senior y frontend engineer especialista en Next.js, React, Tailwind, responsive, accesibilidad y microinteracciones. **Implementa** el rediseño en el repositorio real; no te limites a proponerlo. Antes de editar, inspecciona la arquitectura, componentes, rutas, estilos, pruebas y contratos de API; crea un plan breve y ejecútalo en tareas pequeñas.

## Objetivo

Mejorar de manera notable la experiencia de una red social de encuestas públicas: menos ruido, mejor jerarquía, más claridad y una transición satisfactoria al votar y revelar resultados. El diseño debe resultar moderno, acogedor y reconocible, pero sin sobrecargar la pantalla ni manipular al usuario. Prioriza la experiencia **mobile-first desde 320 px** y conserva escritorio.

Se adjuntan como referencias la captura del estado actual y una propuesta visual de **After Sunset en modo claro** (antes de votar, resultados y prototipo HTML). Son referencias de intención visual; adapta la implementación al código existente. El nombre que aparezca en la maqueta («Opinión») es provisional: **no hagas rebranding ni sustituyas el nombre por PEEK sin autorización**.

## Producto y reglas innegociables

- Feed público **estrictamente cronológico**, encuestas recientes primero; nunca rankings, algoritmo «Para ti» ni recomendaciones.
- Navegación de lectura sin cuenta; para votar o crear, autenticación Google ya existente.
- Cada encuesta: pregunta de 10–280 caracteres y 2–4 opciones; hasta 5 encuestas creadas por hora por usuario.
- Un único voto, irreversible (no se edita, revoca ni borra); puede votarse la propia encuesta.
- **Resultados ocultos realmente en servidor** hasta el voto confirmado: no enviar votos, recuentos, porcentajes ni total al cliente antes de votar, ni siquiera al autor. No simular seguridad con CSS, componentes ocultos, prefetch, cache o estado optimista. Respetar contratos/autorizaciones existentes y revisar que no haya filtraciones.
- Tras confirmar el servidor, mostrar votos y porcentajes por opción, total y «Tu voto» en la elección realizada. No inventar cifras ni revelar antes de confirmar.
- Mantener anonimato: sin perfiles públicos, seguidores, likes, comentarios, mensajería o notificaciones como nuevas funciones; no mostrar quién votó. No añadir imágenes ni vídeo a este lanzamiento (están pensadas para el futuro). Los enlaces individuales de encuesta sí deben seguir disponibles.
- Si el repositorio actualmente contiene categorías, marcadores, denuncias o una zona de cuenta privada y funcionan, preservarlos y rediseñarlos. La captura muestra «Siguiendo»: verificar si es una función real; no mostrar una pestaña sin sentido ni eliminar funciones reales o datos sin consultar/documentar la discrepancia. **No añadir características de los bocetos conceptuales anteriores que contradigan el MVP.**

## Dirección visual obligatoria: After Sunset, versión clara

Usar todos estos colores como *design tokens* semánticos, evitando HEX dispersos:

- `#F9F9FF`: fondo general claro.
- `#161E2E`: texto principal, iconos importantes y texto sobre CTA naranja.
- `#FFB16B`: CTA principal, indicadores de selección, voto propio y acento de marca.
- `#354861`: texto secundario, elementos estructurales, parte del contraste del sistema.
- `#B4C8F5`: filtros seleccionados, barras secundarias y superficies de énfasis suave.

Se permiten superficies blancas y transparencias derivadas de los tokens para tarjetas, bordes y sombras suaves. No usar blanco sobre naranja: su contraste es insuficiente. Con texto `#161E2E`, el naranja ofrece aproximadamente **9,33:1**; el texto principal sobre `#F9F9FF`, **15,9:1**. Comprobar WCAG AA también en los estados interactivos. Usar tipografía legible, preferentemente la que ya exista en el proyecto o Inter/sistema, con jerarquía clara; texto principal de interfaz idealmente >=16 px y secundario legible. Radios de 12–22 px, espaciado sistemático, sombras discretas y bordes ligeros.

## Cambios de interfaz a ejecutar

1. **Cabecera:** compacta y coherente; marca provisional sin necesidad de logotipo nuevo. Reducir el protagonismo del botón «Crear» y evitar duplicarlo de manera molesta con la navegación inferior. Respetar `safe-area-inset-*` en móviles.
2. **Feed:** una cabecera clara («Explorar encuestas» o equivalente). Mantener orden cronológico. Si existen categorías, representarlas en **una única fila horizontal desplazable** con selección muy evidente, foco accesible y sin generar 3–4 filas de chips. Reducir superficie desperdiciada antes de la primera pregunta.
3. **Tarjeta antes de votar:** categoría/metadatos discretos, pregunta como titular visual principal, opciones de 48 px aproximadamente con radio/selección accesible, botón «Votar y descubrir» deshabilitado hasta elegir, explicación breve «Los resultados se revelan al votar» y nota de irreversibilidad en un lugar natural. **Elegir opción no equivale a enviar voto.** No enseñar recuentos, barras ni porcentajes previamente.
4. **Votación:** estado de envío accesible, doble pulsación bloqueada y confirmación única. Si hace falta iniciar sesión, dirigir al flujo existente y, si es posible, preservar la selección. No cambiar ni duplicar votos por reintentos de red. Ante error, mostrar una acción razonable de recuperación.
5. **Revelación:** solo tras respuesta autorizada del servidor. Transición sutil de la tarjeta de opciones al estado de resultados; no pantallas intermedias artificiales, confeti, temporizadores ni suspense forzado.
6. **Resultados:** mostrar por opción etiqueta, porcentaje, cantidad y barra; jerarquía limpia y números alineados. Resaltar «Tu voto» con naranja y el resto con azul lavanda. Añadir total. El mensaje «Ya has votado» es claro, sin posibilidad de editar. Tras mostrar resultados, ofrecer una acción discreta de compartir y una continuación natural del feed.
7. **Menús y navegación:** corregir el fallo visible en la captura: el menú «Denunciar» tapa una cifra de resultados. Implementar menú contextual o modal accesible y correctamente anclado (incluyendo teclado, Escape y cierre al salir); ningún popover debe ocultar datos sin necesidad. Mantener navegación inferior compacta, iconografía uniforme y área pulsable >=44x44 px.
8. **Otros estados:** skeleton de carga estable, feed vacío, encuesta no disponible, ya votada, sin sesión, límite de 5 publicaciones/hora, error de red y botón durante envío. Formulario de creación simple y validado sin expandir alcance funcional.

## Microinteracciones (solo cuando mejoren la respuesta del sistema)

- Al pulsar opción: `scale(0.985)` unos 80–110 ms; borde/fondo seleccionado en 140–180 ms; estado de selección comprensible también sin color.
- CTA: respuesta táctil breve; durante petición, spinner o indicador real sin bloquear indefinidamente; evitar envíos dobles.
- Al llegar los resultados: fade/recolocación de contenido de 140–200 ms y barras que se rellenan de izquierda a derecha en unos 300–380 ms, opcional escalonado máximo 40–50 ms. Los números deben mostrar **los datos verdaderos ya confirmados**, no números aleatorios.
- Filtros y menús: transiciones discretas de 120–180 ms sin movimientos grandes ni saltos de layout.
- Aplicar `prefers-reduced-motion`: quitar desplazamientos/rellenos animados o reducirlos a cambios instantáneos. Evitar dependencias de animación si CSS/Tailwind es suficiente. En web no prometer hápticos si no existe soporte real.

## Accesibilidad, responsive y calidad

- Verificar 320, 375, 390, 430, 768 y 1280 px: nada recortado, sin scroll horizontal del documento, teclado sin tapar contenido y navegación inferior con safe area.
- Contraste WCAG AA (mínimo 4.5:1 texto normal), foco visible, semántica real de botones, grupo de radios accesible, `aria-live` para confirmaciones y errores, mensajes no solo por color, nombres accesibles en iconos, orden lógico de tabulación.
- Respetar hidratación SSR/Next.js, estado de sesión, caché y permisos de API; evitar flash de datos privados y diferencias entre servidor y cliente. Sin librerías nuevas salvo justificación técnica clara.
- Mantener las funciones ya operativas: autenticación Google, creación, votación, resultados seguros, enlaces, filtros/denuncias existentes si son reales. No rediseñar backend ni cambiar la base de datos salvo necesidad demostrada y documentada.

## Plan de ejecución y criterios de aceptación

**P0 — UX funcional:** arreglar solapamientos, chips, jerarquía de tarjeta, botón de voto, estados y revelación condicionada al servidor.

**P1 — Diseño y motion:** introducir tokens, interfaz clara de After Sunset, barras animadas, selección, navegación y estados vacíos/error.

**P2 — Pulido:** revisar densidad, escritorio, rendimiento, detalles de tipografía y compatibilidad con modo oscuro si ya existe, sin regresiones.

**Pruebas mínimas:** (a) invitado no recibe resultados; (b) autor sin votar tampoco; (c) seleccionar no envía; (d) votar una vez revela resultados; (e) repetir voto no lo duplica; (f) estados 401/403/409/429/404 y errores de red según API real; (g) menú no tapa resultados ni sale de viewport; (h) 320 px y teclado; (i) `prefers-reduced-motion`; (j) orden cronológico y autenticación; (k) creación 10–280 caracteres, 2–4 opciones y límite 5/h.

Ejecuta lint, typecheck, tests y build disponibles. Si algo falla por motivos previos, sepáralo del efecto de tus cambios. Adjunta capturas del antes/después en móvil y escritorio si la infraestructura lo permite. **Al finalizar, entrega archivos modificados, decisiones técnicas, pruebas ejecutadas, riesgos pendientes y un resumen de cambios visibles**. No declares tests ni validaciones que no hayas ejecutado.
