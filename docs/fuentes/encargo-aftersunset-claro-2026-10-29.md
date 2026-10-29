# TASK: Rediseño UX/UI de la app de encuestas — After Sunset

Actúa como **Senior Product Designer y Senior Frontend Engineer** especializado en Next.js, React, Tailwind CSS, accesibilidad y microinteracciones.

Quiero que implementes un rediseño completo de la interfaz de mi aplicación actual. No crees un proyecto nuevo ni te limites a dar recomendaciones: revisa el repositorio, identifica los componentes existentes, planifica las modificaciones y ejecútalas.

## 1. Objetivo principal

Transformar la interfaz actual en una experiencia moderna, elegante, intuitiva y atractiva, especialmente en móvil.

La experiencia debe girar alrededor de este ciclo:

**Explorar → Elegir → Votar → Descubrir resultados → Seguir explorando.**

Queremos mejorar la claridad, la satisfacción al votar y las ganas de explorar otras encuestas, sin recurrir a efectos exagerados o elementos innecesarios.

Adjunto una referencia visual llamada **After Sunset — Modo claro**, con capturas de las tarjetas antes y después de votar y un prototipo HTML.

El nombre de la aplicación sigue siendo provisional. No lo cambies por PEEK ni realices un rebranding sin aprobación.

## 2. Antes de modificar código

- Analiza las rutas, los componentes, el sistema de estilos, la autenticación, las llamadas a API y los estados actuales.
- Identifica qué funcionalidades ya existen y cuáles son solamente elementos visuales.
- Reutiliza la arquitectura y los componentes que tenga sentido conservar.
- Divide el trabajo en tareas P0, P1 y P2 y ejecútalas.
- No añadas dependencias si CSS y Tailwind resuelven el problema.

## 3. Diseño visual: After Sunset claro

Usa esta paleta de colores:

| Token | Color | Uso |
|---|---|---|
| `background` | `#F9F9FF` | Fondo principal |
| `foreground` | `#161E2E` | Textos y elementos principales |
| `primary` | `#FFB16B` | Botones, acentos y voto seleccionado |
| `secondary` | `#354861` | Metadatos, bordes y elementos secundarios |
| `accent` | `#B4C8F5` | Filtros seleccionados y barras secundarias |

Puedes crear superficies blancas, transparencias y bordes derivados de estos colores.

Requisitos visuales:

- Tarjetas con bordes suaves, radios de 16–22 px y sombras discretas.
- Tipografía de lectura cómoda, con preguntas claramente destacadas.
- Espaciado sistemático y jerarquía visual coherente.
- Iconos de un mismo estilo y grosor.
- Botones naranjas con texto azul noche, nunca blanco sobre naranja.
- Diseño mobile-first desde 320 px, adaptable a escritorio.
- Conservar la compatibilidad con el modo oscuro si ya existe.

## 4. Cabecera, navegación y feed

Simplifica la cabecera para que ocupe menos espacio.

El botón «Crear» no debe competir con toda la pantalla ni duplicar innecesariamente una acción ya disponible en la navegación inferior.

Si hay filtros de categorías, represéntalos en una sola fila horizontal desplazable. Deben tener un estado seleccionado reconocible y navegación por teclado.

Mantén las encuestas ordenadas cronológicamente, las más recientes primero. No introduzcas rankings, recomendaciones, algoritmos ni un feed personalizado.

Revisa la pestaña «Siguiendo»: el planteamiento original no contempla seguidores. Comprueba si está conectada a una función real; no elimines lógica operativa sin documentarlo, pero tampoco mantengas controles sin utilidad.

La navegación inferior debe ser compacta, fácil de pulsar y respetar las áreas seguras del móvil.

## 5. Rediseño de tarjetas

### Antes de votar

Cada tarjeta debe contener:

- Categoría y fecha discretas, cuando esos datos existan.
- Pregunta con tipografía destacada.
- Opciones de respuesta claramente separadas y con zona táctil de al menos 44 px.
- Selección accesible mediante radio.
- Botón principal «Votar y descubrir».
- Aviso breve de resultados ocultos y voto definitivo.

Seleccionar una opción **no debe enviar el voto automáticamente**. El usuario tiene que confirmar expresamente la acción.

Los resultados, porcentajes, recuentos y total no deben existir en el estado del cliente antes de votar.

### Después de votar

Cuando el servidor confirme correctamente el voto:

- Sustituir la lista de opciones por barras horizontales.
- Mostrar cada opción, su porcentaje y su número de votos.
- Destacar la opción elegida mediante el naranja principal y «Tu voto».
- Mostrar el total de votos.
- Mostrar «Ya has votado».
- Mantener la posibilidad de compartir la encuesta.
- Facilitar continuar explorando.

Los resultados deben venir del servidor. No generar cifras ficticias, no anticipar datos y no revelar nada antes de la confirmación.

## 6. Animaciones y microinteracciones

Implementa movimiento sutil, elegante y útil:

| Interacción | Comportamiento |
|---|---|
| Pulsar opción | Escala breve a 0.985 durante 80–110 ms |
| Seleccionar opción | Transición de borde, fondo y radio de 140–180 ms |
| Pulsar votar | Feedback táctil visual y estado de envío |
| Confirmar voto | Transición entre opciones y resultados de 140–200 ms |
| Revelar barras | Crecimiento de izquierda a derecha de 300–380 ms |
| Cambiar categoría | Transición de estado de 120–180 ms |
| Abrir menú | Entrada suave sin desplazar el contenido |

Las animaciones de los resultados solo deben comenzar después de recibir una respuesta válida del servidor.

Evita confeti, pantallas artificiales de espera, animaciones constantes o movimientos excesivos.

Implementa `prefers-reduced-motion` para usuarios que prefieran reducir las animaciones.

## 7. Fallos visuales que debes corregir

La captura actual revela varios problemas:

1. Demasiada altura ocupada por filtros y controles antes de llegar a la encuesta.
2. Jerarquía insuficiente entre cabecera, categorías, pregunta y resultados.
3. Demasiados bordes y elementos con el mismo protagonismo.
4. Menú «Denunciar» superpuesto sobre el porcentaje de una respuesta.
5. Presentación poco refinada de barras, porcentajes y metadatos.
6. Falta de una transición satisfactoria al descubrir los resultados.
7. Necesidad de mejorar el ritmo visual, los espacios y la consistencia entre componentes.

Especialmente importante: los menús contextuales deben posicionarse correctamente, poder cerrarse con Escape y funcionar con teclado y lector de pantalla.

## 8. Funcionalidad que no debes romper

Conserva las reglas actuales del producto:

- Exploración pública sin iniciar sesión.
- Google para crear y votar.
- Una pregunta de 10–280 caracteres y entre 2 y 4 opciones.
- Límite de cinco encuestas creadas por hora.
- Un voto único, irreversible y no modificable.
- Posibilidad de votar en una encuesta propia.
- Resultados ocultos en servidor hasta votar, también para el autor.
- Anonimato de los votantes.
- Enlaces individuales para compartir.

No introduzcas likes, comentarios, seguidores, perfiles públicos, mensajería, notificaciones, imágenes o vídeos como parte del rediseño.

Si el repositorio contiene alguna función real adicional, consérvala o documenta el conflicto antes de modificar su comportamiento.

## 9. Estados y accesibilidad

Diseña y comprueba los siguientes estados: carga inicial, lista vacía, encuesta no disponible, usuario sin sesión, selección sin confirmar, envío en curso, voto confirmado, error de red, voto ya registrado y límite de publicación alcanzado.

Garantiza:

- WCAG AA y foco visible.
- Controles utilizables con teclado y lector de pantalla.
- Mensajes anunciados correctamente mediante regiones accesibles cuando corresponda.
- Botones táctiles de al menos 44 × 44 px.
- Responsive en 320, 375, 390, 430, 768 y 1280 px.
- Ausencia de scroll horizontal inesperado.
- Sin solapamientos con la navegación inferior.
- Sin filtraciones de resultados mediante prefetch, caché, HTML inicial o estado del cliente.

## 10. Pruebas y criterios de aceptación

Comprueba que:

- Un usuario no autenticado puede explorar pero no votar.
- Antes de votar no se reciben ni muestran resultados.
- El creador tampoco puede ver resultados sin votar.
- Elegir una opción no registra un voto.
- Un voto confirmado revela los resultados correctos.
- Dos pulsaciones no producen dos votos.
- Se gestionan correctamente los errores de autenticación, conflicto, límite de publicaciones, encuesta inexistente y red, de acuerdo con las API reales.
- El feed continúa siendo cronológico.
- Las opciones y los menús funcionan con teclado.
- Las animaciones respetan la reducción de movimiento.
- La app funciona correctamente desde 320 px.

Ejecuta los tests, lint, typecheck y build disponibles.

## 11. Entregables

Al terminar, quiero:

1. Código del rediseño implementado en el repositorio.
2. Lista de componentes y archivos modificados.
3. Capturas del resultado en móvil y escritorio, si es posible.
4. Explicación de las decisiones técnicas.
5. Resultado real de las comprobaciones y tests.
6. Riesgos o tareas pendientes.

**Prioridad principal: que la app se vea y se sienta considerablemente mejor, sin comprometer la mecánica de votar para descubrir.**