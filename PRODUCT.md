# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Público general en España que pasa un rato con el móvil y vota encuestas por curiosidad: quiere saber qué opina la gente. Llega a menudo por un enlace compartido a una encuesta concreta y sigue explorando el feed. Puede mirar sin cuenta; para votar o publicar entra con Google.

## Product Purpose

Opinión es una red social sencilla de encuestas públicas. El ciclo es **explorar → elegir → votar → descubrir resultados → seguir explorando**. El MVP valida si a la gente le gusta crear encuestas, participar y descubrir los resultados. No es una red social completa.

Éxito: la gente vota, vuelve a ver resultados y publica sus propias preguntas.

## Positioning

Los resultados sólo se descubren después de votar, y esa regla la impone el backend (RLS y RPC en Supabase), no sólo la interfaz. Nadie, ni siquiera quien creó la encuesta, ve recuentos, porcentajes ni totales antes de votar. Votar es la llave para descubrir qué opinan los demás.

## Operating Context

- Uso sobre todo en móvil, desde 320 px, también en escritorio.
- Rutas: `/` (feed cronológico público, lotes de 20), `/polls/[id]` (detalle compartible), `/create` y `/login`.
- Se comparte copiando el enlace de una encuesta.
- Sin realtime: los resultados se consultan al entrar o justo después de votar.

## Capabilities and Constraints

- Pregunta de 10–280 caracteres; 2–6 opciones de 1–100 caracteres; espacios normalizados; sin opciones duplicadas (ignorando mayúsculas, respetando tildes).
- Un voto único e inmutable por cuenta y encuesta. Se puede votar en las encuestas propias.
- Resultados: todas las opciones (también con 0 votos), recuento, porcentaje con un decimal, total y opción propia señalada.
- Máximo cinco publicaciones por cuenta y hora.
- Moderación manual: una encuesta oculta desaparece de todas partes y su página responde como no disponible.
- Sin perfiles, usernames, seguidores, comentarios, likes, mensajes, notificaciones, imágenes, edición, borradores ni encuestas privadas.
- Stack fijado: Next.js App Router, React, TypeScript, Tailwind CSS, Supabase y Vercel (`docs/arquitectura.md`, D-014).
- Fuente del detalle: `docs/brief-producto.md`, `docs/contexto-aplicacion.md`, `docs/contratos-api.md`.

## Brand Commitments

- Nombre: **Opinión**, confirmado para el MVP.
- Autor genérico: **«Anónimo»**. No se muestran email, nombre de Google ni identidad de votantes.
- Idioma: español de España.
- Personalidad: **curiosa y lúdica**. Descubrir los resultados es una pequeña sorpresa; tono cercano y con algo de chispa.
- El brief pide un diseño sencillo y moderno, sin identidad visual compleja. No hay logotipo ni activos de marca.

## Evidence on Hand

No hay usuarios reales, testimonios, métricas ni imágenes. Los únicos datos son de prueba (`[fixture MVP-018]` en Supabase de desarrollo) y no deben presentarse como contenido real.

## Product Principles

1. Votar primero, descubrir después: la interfaz nunca insinúa resultados antes del voto.
2. Lo importante son las preguntas y las respuestas de la gente; la interfaz las enmarca sin competir con ellas.
3. Del enlace al voto en segundos: cada pantalla sirve al ciclo explorar → votar → descubrir.
4. Anonimato por defecto: nada en la interfaz identifica a quien publica o vota.
5. Sencillez antes que funciones: lo que queda fuera del MVP no aparece ni insinuado.

## Accessibility & Inclusion

Navegación por teclado, etiquetas accesibles, foco visible y anuncio de carga y errores. Estados vacíos y errores de red comprensibles. Usable desde 320 px sin desbordamientos. Nada se comunica sólo con color.
