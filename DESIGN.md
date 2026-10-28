---
name: Opinión
description: Mercado de opiniones en blanco y negro; los resultados se revelan al votar.
colors:
  background: "#f4f4f5"
  surface: "#ffffff"
  foreground: "#0a0a0b"
  muted: "#5e5e66"
  border: "#e4e4e7"
  track: "#ececef"
  bar-muted: "#767680"
  field: "#8a8a93"
  danger: "#c4161c"
  background-dark: "#0a0a0b"
  surface-dark: "#151517"
  foreground-dark: "#f4f4f5"
  muted-dark: "#a3a3ab"
  border-dark: "#2a2a2e"
  track-dark: "#232327"
  bar-muted-dark: "#787882"
  field-dark: "#707079"
  danger-dark: "#ff7b7b"
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
components:
  button-primary:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.surface}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  chip-locked:
    backgroundColor: "{colors.track}"
    textColor: "{colors.muted}"
    typography: "{typography.meta}"
    rounded: "{rounded.chip}"
    padding: "2px 8px"
  option-selected:
    backgroundColor: "{colors.foreground}"
    textColor: "{colors.surface}"
    rounded: "{rounded.field}"
    padding: "12px 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.field}"
    padding: "10px 14px"
---

# Design System: Opinión

## Overview

**Creative North Star: "El mercado de opiniones"**

Cada encuesta se presenta como un pequeño mercado, a la manera de Polymarket: una tarjeta con la pregunta, sus opciones y una cifra por opción. La diferencia es el gancho del producto: antes de votar, cada cifra es un `?? %` bloqueado; al votar, las cifras aparecen y las barras crecen. La interfaz es una pantalla de uso (modo Operate): controles conocidos, cifras tabulares y nada que compita con las preguntas de la gente.

El MVP es en blanco y negro por decisión del propietario. La personalidad curiosa y lúdica no vive en el color sino en la revelación, en el contraste rotundo y en el tono de los textos.

**Key Characteristics:**

- Tinta casi negra sobre blanco; invertido en modo oscuro siguiendo la preferencia del sistema.
- Cifras grandes, apretadas y tabulares como protagonistas tras votar.
- El `?? %` bloqueado en cada opción antes de votar.
- Píldoras negras para la acción principal; tarjetas blancas de borde fino sobre fondo gris claro.

## Colors

Paleta restringida a tinta y papel. No hay color de marca.

### Primary

- **Tinta** (`foreground`, `#0a0a0b`; oscuro `#f4f4f5`): texto principal, acción principal, opción elegida, barra del voto propio, foco y selección de texto.

### Neutral

- **Fondo** (`background`, `#f4f4f5`; oscuro `#0a0a0b`): suelo de la página.
- **Superficie** (`surface`, `#ffffff`; oscuro `#151517`): tarjetas, cabecera, campos.
- **Texto secundario** (`muted`, `#5e5e66`; oscuro `#a3a3ab`): meta, recuentos, etiquetas. 6,4:1 sobre blanco.
- **Borde** (`border`, `#e4e4e7`; oscuro `#2a2a2e`): separadores y contornos decorativos.
- **Pista** (`track`, `#ececef`; oscuro `#232327`): fondo de barras y del chip bloqueado.
- **Barra secundaria** (`bar-muted`, `#767680`; oscuro `#787882`; contraste ≥ 3:1 con la pista y la superficie): barras de las opciones que no son tu voto.
- **Campo** (`field`, `#8a8a93`; oscuro `#707079`): borde de campos de texto, ≥3:1 frente a superficie y fondo.

### Named Rules

**The Único Color Rule.** El único tono fuera del gris es el rojo de error (`danger`, `#c4161c`; oscuro `#ff7b7b`), y sólo aparece cuando hay un error que corregir.

**The Voto Propio Rule.** La opción propia se distingue por la palabra «Tu voto» y el peso, y además por la barra en tinta plena; nunca sólo por el tono.

## Typography

Una sola familia, Geist, servida desde el propio proyecto (paquete `geist`). Las cifras usan `tabular-nums`.

### Hierarchy

- **Marca** (`brand`): 20 px, 700, tracking -0,03em. Sólo el logotipo textual «Opinión».
- **Pregunta** (`question`): 17 px, 600, tracking -0,01em. Títulos de tarjeta y leyenda del selector.
- **Cifra** (`figure`): 22 px, 700, tracking -0,03em, tabular. Porcentajes revelados.
- **Cuerpo** (`body`): 15 px. Opciones y campos.
- **Meta** (`meta`): 13 px. Autor, fecha, recuentos, etiquetas de campo, chip bloqueado.

## Layout

Mobile-first desde 320 px con 16 px de margen lateral. Cabecera y feed usan el ancho amplio (`64rem`); el feed es una columna de tarjetas en móvil y dos desde 768 px (`md`), con 12 px de separación. Formularios, detalle y páginas de texto mantienen el ancho de lectura (`40rem`). La cabecera es fija arriba.

## Elevation & Depth

Plano. Sin sombras: la profundidad la dan la superficie blanca sobre el fondo gris y el borde fino.

## Shapes

Esquinas suaves y consistentes: chip 6 px, campo y opción 12 px, tarjeta 16 px, botones en píldora.

## Components

### Buttons

- **Primario:** píldora en tinta con texto en superficie («Crear encuesta», «Publicar»). Hover: opacidad 85 %.
- **Secundario:** píldora en superficie con borde («Añadir opción»); el borde pasa a tinta al pasar el cursor.
- **Terciario:** texto secundario que se subraya al pasar el cursor («Quitar»).

### Chips

- **Bloqueado** (`?? %`): fondo pista, texto secundario, con texto accesible «Resultado oculto hasta votar».
- **Tu voto:** píldora con borde de tinta junto a la opción elegida.

### Cards / Containers

Tarjeta en superficie, borde fino, radio 16 px, 16 px de padding. Toda la tarjeta enlaza al detalle; el borde se oscurece al pasar el cursor y pasa a tinta con el foco.

### Inputs / Fields

Campo en superficie con borde `field`, radio 12 px. Foco: borde en tinta. Error: borde y mensaje en `danger`, enlazados con `aria-describedby`.

### Navigation

Cabecera fija en superficie con la marca a la izquierda (vuelve al feed) y la píldora «Crear encuesta» a la derecha.

### Mercado (Signature Component)

Antes de votar, cada opción es una fila con su texto y el chip `?? %`, y el pie dice «Vota para ver». Tras votar, cada opción muestra la cifra grande, la barra fina (tinta para tu voto, gris para el resto) y el recuento; al montarse, las cifras aparecen y las barras crecen (800 ms, ease-out exponencial; desactivado con `prefers-reduced-motion`).

## Do's and Don'ts

### Do:

- **Do** mostrar el `?? %` en cada opción antes de votar; nunca cifras reales.
- **Do** usar `tabular-nums` en toda cifra.
- **Do** reservar la píldora en tinta para la acción principal de cada pantalla.
- **Do** comprobar el modo oscuro: los tokens se invierten solos.

### Don't:

- **Don't** introducir colores de marca, degradados ni sombras en el MVP.
- **Don't** usar el rojo para nada que no sea un error.
- **Don't** añadir gráficas de evolución: el MVP no guarda historial de votos.
- **Don't** usar etiquetas o «kickers» sobre los títulos ni iconos hechos con emoji.
