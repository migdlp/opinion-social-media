---
version: 1
slug: "src-app-page-tsx"
primary_target: "src/app/page.tsx"
related_targets: ["src/app/polls/[id]/page.tsx","src/app/create/page.tsx","src/app/login/page.tsx"]
---

Scope: superficies de la app (feed `/`, detalle `/polls/[id]`, `/create`, `/login`) y sus componentes. Visitor mode: Operate.

Audience/job: público general en el móvil que explora encuestas, elige y vota para descubrir qué opina la gente. Constraints: blanco y negro para el MVP (decisión del propietario); resultados nunca insinuados antes de votar; anonimato; mobile-first desde 320 px.

Chosen direction: «Mercado de opiniones», inspirado en Polymarket y elegido por el propietario entre ocho bocetos (boceto 1), en blanco y negro. Memorable moment: los porcentajes bloqueados (`?? %`) que se revelan al votar.

## Direction contract

THESIS: Cada encuesta es un «mercado» de opinión cuyas cifras están bloqueadas hasta que votas; rechaza el post de red social con botones azules y el panel de datos frío.

OWN-WORLD: Tinta casi negra sobre blanco puro, invertido en modo oscuro; sin color salvo el rojo de error. Geist con cifras tabulares grandes y apretadas; tarjetas blancas de borde fino sobre fondo gris muy claro; botones en píldora negra; barras finas de tinta.

STORY: El visitante entiende que cada tarjeta es una pregunta abierta, ve que las cifras existen pero están ocultas, vota para descubrirlas y sigue explorando.

FIRST VIEWPORT: Cabecera con la marca «Opinión» a la izquierda y la píldora negra «Crear encuesta» a la derecha; debajo, tarjetas a ancho de columna con la pregunta en peso fuerte, cada opción en una fila con el chip `?? %` a la derecha y meta «Anónimo · fecha» al pie.

FORM: Mercado de predicción (familia Polymarket) traducido a blanco y negro; elegido por el propietario fuera de la tirada, que asignaba el candidato 7 de 7 (cuaderno y test). seed: 29b2c8c54d9afd00

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Unresolved: cómo se dispara la revelación en la interfaz real (MVP-036/037); gráfica de evolución descartada para el MVP (no hay historial de votos).
