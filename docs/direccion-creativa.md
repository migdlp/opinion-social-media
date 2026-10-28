# Dirección creativa vigente — After Sunset

**Aprobada provisionalmente:** 28-10-2026 · **Decisión:** D-026 · **Seguimiento:** [DESIGN-001 #185](https://github.com/migdlp/opinion-social-media/issues/185).

El propietario ha enviado una lámina de identidad PEEK y ha pedido «de momento sigas ese estilo creativo», actualizar los `.md` y comunicarlo al resto de IAs. Esta referencia sustituye la dirección anterior en blanco y negro para el trabajo visual futuro. Es vigente hasta una nueva indicación del propietario, sin necesidad de volver a elegir una estética por tarea.

## Referencia descrita para quienes no tengan la conversación

La lámina muestra un logotipo geométrico muy grueso en azul noche, con un hueco que deja ver una esfera melocotón y el lema «Vota para descubrir». Una ilustración de cortinas azul oscuro abiertas deja asomar una luz cálida; la idea central es curiosidad, mirada y revelación. Se muestran variaciones de ojo, cortina, letra con hueco y formas que se deslizan para descubrir un círculo naranja.

Los ejemplos móviles usan fondos claros casi blancos y oscuros azul noche, tarjetas redondeadas, opciones en superficies suaves, CTA melocotón y pequeños acentos lavanda. La selección es cálida y visible. Después de votar, las barras revelan los resultados y se marca la opción propia. El conjunto es amable, limpio y expresivo; la decoración enmarca la pregunta sin competir con ella.

La imagen original está adjunta al mensaje del propietario, no versionada como archivo en este repositorio. Esta descripción y la paleta permiten continuar sin acceso al chat. No existen todavía originales vectoriales ni un paquete de activos extraído de esa lámina; no enlazar archivos inexistentes ni presentar una captura de la lámina como logo de producción.

## Paleta de referencia

Valores transcritos de las etiquetas de la lámina; son la base de los tokens, no una afirmación de que todos los píxeles del mockup usen colores planos.

| Color | Hex | Papel |
|---|---|---|
| Azul noche | `#161E2E` | Fondo oscuro, texto principal claro, símbolo y contraste |
| Blanco frío | `#F9F9FF` | Fondo claro y texto principal oscuro |
| Melocotón | `#FFB16B` | CTA, selección, revelación y pequeños acentos |
| Azul pizarra | `#354861` | Texto secundario claro, superficies o elementos de apoyo oscuros |
| Lavanda | `#B4C8F5` | Acento suave, iconos, superficies y barras secundarias oscuras |

[DESIGN.md](../DESIGN.md) concreta tokens por tema, componentes y accesibilidad. Usar texto azul noche sobre melocotón; blanco sobre melocotón no alcanza contraste para texto normal. Tampoco usar melocotón como único contorno de un control sobre blanco.

## Lo aprobado y lo ilustrativo

- **Aprobado:** estilo visual, paleta, tono curioso, formas redondeadas y metáfora de descubrir/revelar. Se conservan ambos temas, claro y oscuro.
- **Nombre:** la lámina dice PEEK; la petición aprueba seguir su estilo. No confirma por sí sola un cambio de nombre. La aplicación y el repositorio siguen llamándose Opinión hasta una decisión expresa de naming.
- **Funciones:** perfiles y privacidad siguen D-016–D-018. La frase «sin perfiles públicos» de la lámina no revoca esas decisiones. No se añaden likes, comentarios, tendencias, campanas ni nuevas secciones por aparecer dibujadas.
- **Feed:** sigue D-022–D-025: Recientes + Siguiendo, voto en tarjeta, scroll con botón, categorías y cerradas durante 24 horas desde el cierre. No copiar las pestañas de los mockups.
- **Resultados:** una encuesta abierta no revela cifras antes de votar, tampoco total ni datos ocultos en las respuestas. Las cerradas mantienen la excepción autorizada de D-020 y las reglas de visibilidad. La creatividad no cambia permisos ni backend.

## Instrucción para todos los agentes

1. Leer esta guía, `PRODUCT.md` y `DESIGN.md` antes de tocar interfaz, iconos, metadatos sociales o materiales visuales. Aplicar la misma dirección también a onboarding, ajustes y perfiles dentro de sus tareas.
2. Tomar de la referencia el lenguaje visual; implementar sólo lo autorizado en la tarea reservada y el backlog vigente. Evitar que cada IA invente una marca diferente.
3. Mantener la tipografía Geist local y la nomenclatura de tokens semánticos; no incorporar fuentes o activos externos por analogía con la imagen. Un logo definitivo necesita un activo real, no una reconstrucción improvisada del lettering.
4. Verificar claro/oscuro, 320 px/escritorio, foco, contraste, selección sin depender sólo del color y `prefers-reduced-motion` al implementar. Coordinar cambios en CSS/tokens compartidos en [#73](https://github.com/migdlp/opinion-social-media/issues/73).
5. Distinguir **dirección documentada** de **migración implementada**: esta tarea cambia documentación, no CSS, componentes ni despliegues. El código monocromo existente aún debe adaptarse y verificarse dentro de tareas de implementación reservadas, con TDD para cambios de comportamiento.
