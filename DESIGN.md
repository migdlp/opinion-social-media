---
name: Opinión
description: Dirección creativa After Sunset, basada en la referencia PEEK aprobada por el propietario.
colors:
  background: "#F9F9FF"
  surface: "#FFFFFF"
  foreground: "#161E2E"
  muted: "#354861"
  border: "#B4C8F5"
  track: "#F9F9FF"
  bar-muted: "#354861"
  field: "#354861"
  accent: "#FFB16B"
  accent-soft: "#B4C8F5"
  danger: "#c4161c"
  background-dark: "#161E2E"
  surface-dark: "#354861"
  foreground-dark: "#F9F9FF"
  muted-dark: "#B4C8F5"
  border-dark: "#B4C8F5"
  track-dark: "#161E2E"
  bar-muted-dark: "#B4C8F5"
  field-dark: "#B4C8F5"
  accent-dark: "#FFB16B"
  accent-soft-dark: "#B4C8F5"
  danger-dark: "#ff9d9d"
typography:
  brand:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    letterSpacing: "-0.03em"
  question:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.01em"
  figure:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
  body:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.5
  meta:
    fontFamily: "Geist, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  chip: "6px"
  field: "12px"
  card: "16px"
  pill: "9999px"
spacing:
  gutter: "16px"
  card-padding: "16px"
  stack: "12px"
  content-width: "40rem"
  wide-width: "64rem"
---

# Diseño de Opinión — After Sunset

## Autoridad y estado

**Dirección vigente provisional, D-026 (28-10-2026).** El propietario pide seguir el estilo de la lámina PEEK que adjuntó. La [guía de referencia](docs/direccion-creativa.md) describe la imagen para agentes sin acceso a la conversación y delimita su alcance. Esta dirección sustituye las restricciones anteriores de blanco y negro y ausencia de color de marca.

Este archivo especifica el diseño objetivo. Los tokens base están migrados a CSS mediante DESIGN-002, incluidos CTA compartidos, foco y barras. La adaptación completa de pantallas, imágenes sociales y su revisión final sigue en DESIGN-003–006; no confundir la base implementada con el cierre de toda la identidad. El nombre sigue siendo Opinión: PEEK es la referencia creativa, sin cambio de naming confirmado.

## Concepto: votar abre una nueva perspectiva

Curiosidad, mirada y descubrimiento: una abertura revela una forma cálida sobre azul noche. Traducirlo a la interfaz con selección clara y una revelación breve de barras tras confirmar el voto. La aplicación es una superficie de uso: pregunta y opciones primero, controles familiares, decoración contenida. Las ilustraciones con volumen suave, luz melocotón o cortinas se reservan para piezas de marca y estados que las necesiten, sin recargar cada tarjeta.

La apariencia será amable y expresiva: azul noche, blanco frío, melocotón y lavanda, tarjetas redondeadas, tipografía geométrica clara y CTA cálida. Evitar volver al monocromo como identidad por defecto o añadir una paleta distinta por pantalla.

## Color, temas y contraste

- **Claro:** fondo blanco frío, tarjetas blancas, texto azul noche y meta azul pizarra. Melocotón para CTA/selección; lavanda para apoyo visual.
- **Oscuro:** fondo azul noche, tarjetas azul pizarra, texto blanco frío y meta lavanda. Acentos melocotón conservados; los temas no se obtienen invirtiendo colores automáticamente.
- **Texto de CTA:** azul noche sobre melocotón (≈9,33:1), también en oscuro. Evitar texto blanco sobre melocotón (≈1,79:1).
- **Otros pares de referencia:** azul noche sobre blanco frío ≈15,90:1; pizarra sobre blanco frío ≈8,90:1; lavanda sobre azul noche ≈9,94:1. Son contrastes de colores planos calculados, no una auditoría del mockup ni del CSS existente.
- **Controles:** borde/foco azul noche o pizarra en claro, lavanda/melocotón en oscuro. Lavanda y melocotón sobre blanco son decorativos; no bastan como único borde, foco o marca de selección.
- **Resultados:** barra propia azul noche en claro y melocotón en oscuro; barras secundarias pizarra en claro y lavanda en oscuro. Si se usa melocotón en una barra clara, asegurar un contorno contrastado y etiquetas completas. «Tu voto» y el estado semántico identifican siempre la selección, además del color.
- **Errores:** `danger` sigue siendo semántico, con texto e icono/mensaje; no se confunde con el acento cálido. En oscuro se aclara a `#FF9D9D` para mantener 4,5:1 también sobre la superficie pizarra.
- **Roles de interacción:** `accent-foreground` azul noche en ambos temas; `accent-hover` melocotón claro `#FFC28C`; `focus` azul noche en claro/melocotón en oscuro; `bar-own` azul noche en claro/melocotón en oscuro. La utilidad compartida `action-primary` mantiene texto oscuro y estado desactivado sin transparencia.

Al implementar, comprobar WCAG AA: texto normal ≥4,5:1, texto grande y elementos necesarios para identificar controles ≥3:1, también en hover/focus/disabled y con transparencias.

## Tipografía, forma y composición

Mantener Geist local, cifras tabulares y jerarquía de los tokens. Marca contundente y geométrica; preguntas legibles y compactas. No imitar el lettering de PEEK con caracteres deformados ni sustituir el nombre por un logo que aún no existe como activo.

Mobile-first desde 320 px; márgenes y padding de 16 px, separación de 12 px, tarjeta de radio 16 px y opciones de 12 px. Anchos actuales de 40rem para lectura/formularios y 64rem para feed/cabecera. Mantener espacio para la navegación inferior y áreas seguras. Superficies limpias con borde fino; una sombra suave y desplazada puede separar capas cuando ayude. El volumen de la ilustración de marca no se convierte en sombras pesadas en todos los controles.

## Componentes y estados

- **CTA principal:** fondo melocotón con texto azul noche, nombre según la acción real: «Votar y descubrir», «Publicar» o «Crear encuesta». Hover, foco y carga distinguibles; no usar «descubrir» en acciones que no revelan nada.
- **Opciones:** superficie suave, radio y selector reconocible. Al seleccionar, relleno melocotón, texto/borde azul noche y estado accesible `checked`; no enviar el voto al tocar una opción si el flujo exige confirmación.
- **Antes del voto:** pregunta y opciones, texto «Vota para descubrir» y, si se conserva, chip `?? %` con nombre accesible «Resultado oculto hasta votar». Nunca cifras reales, totales, barras con longitudes sugeridas ni popularidad implícita por opción.
- **Después del voto:** barras horizontales, porcentaje, recuento, total y «Tu voto». La animación de revelación se limita a datos autorizados y respeta `prefers-reduced-motion`.
- **Cerradas:** resultados visibles sólo según D-020 y permisos. Su permanencia de 24 horas en el feed no afecta a su apariencia ni autoriza nuevos votos.
- **Campos:** fondos de superficie y borde contrastado, etiquetas visibles, foco claro y errores asociados. No sacrificar legibilidad por una superficie pastel.
- **Navegación:** misma familia visual para cabecera, avatar inicial, menú y barra Feed/Crear/Perfil. En el feed, Recientes/Siguiendo y categoría Todas según D-022–D-025; no copiar pestañas de la lámina.
- **Tarjetas con voto:** no envolver controles interactivos en un enlace global; conservar un acceso claro al detalle. Respetar el estado de implementación y los contratos de V2-033.
- **Iconos:** trazos y peso coherentes, ojos/aberturas sólo como recurso pertinente de marca. Sin emoji como iconos de controles. No añadir botones sin funcionalidad autorizada para imitar la referencia.

## Reglas para agentes

Leer también [PRODUCT.md](PRODUCT.md), [AGENTS.md](AGENTS.md) y la [guía creativa](docs/direccion-creativa.md). Perfiles y privacidad siguen el backlog: el claim «sin perfiles públicos» y los likes/comentarios/campanas dibujados en la imagen son ilustrativos. Mantener backend, accesibilidad y alcance funcional acordados.

Coordinar cambios de tokens compartidos en [#73](https://github.com/migdlp/opinion-social-media/issues/73), aplicarlos en tareas reservadas y verificar imágenes reales de claro/oscuro y móvil/escritorio. No declarar esta dirección implementada sólo porque estos `.md` se hayan actualizado.
