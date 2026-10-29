# Imágenes de perfil: iconos predeterminados (AVATAR-001)

## Qué hay
Cada cuenta puede elegir **un icono de un catálogo cerrado** o quedarse con sus **iniciales** (valor por defecto, `null`). No se importa la foto de Google ni ninguna imagen externa. Las fotos subidas por la persona quedan para AVATAR-002/003 y no existen todavía.

| Identificador | Etiqueta accesible |
|---|---|
| `sol` | Sol |
| `luna` | Luna |
| `estrella` | Estrella |
| `hoja` | Hoja |
| `ola` | Ola |
| `montana` | Montaña |
| `nube` | Nube |
| `llama` | Llama |

El catálogo vive en dos sitios que deben coincidir: `src/lib/avatar-icons.ts` (dibujo y etiqueta) y la restricción `check` de `profiles.avatar_icon` en `supabase/migrations/20261029190000_profile_avatar.sql`. Un test (`src/lib/avatar-icons.test.ts`) falla si se desincronizan. Para añadir un icono hay que tocar ambos y crear una migración nueva que amplíe el `check` y la función.

## Procedencia y licencia
Los ocho dibujos son **obra propia de este proyecto**: trazos vectoriales simples sobre una malla de 24×24, escritos a mano como datos de `path` SVG en `src/lib/avatar-icons.ts`. No proceden de ninguna librería de iconos, fuente de imágenes ni herramienta generativa, y no se ha copiado ningún recurso de terceros, así que no hay licencia ajena que atribuir. Se publican con la misma licencia que el resto del repositorio. Si en el futuro se sustituye alguno por un recurso externo, hay que anotar aquí su origen, autor y licencia antes de fusionar.

## Comportamiento
- Se muestran con `Avatar` (`src/components/avatar.tsx`): cabecera (menú de cuenta), perfil y listas de seguidores, seguidos y solicitudes. Son decorativos (`aria-hidden`): el nombre accesible lo da el texto cercano (`@usuario`, nombre visible).
- Color: trazo blanco (`currentColor`) sobre el mismo fondo gris estable que las iniciales (contraste ≥ 4,5:1 del texto, ≥ 3:1 exigido a gráficos). Tamaño fijo por variante (`md`, `lg`), sin cambio de maquetación al cambiar de icono.
- Selección: Ajustes → Perfil → «Imagen de perfil» (`AvatarPicker`, grupo de radios operable con teclado, vista previa). Se guarda al elegir, se marca al instante y vuelve a la elección anterior con un aviso si falla. Cambiarlo no toca nombre ni @usuario.
- Un identificador desconocido en la base de datos (por ejemplo, de una versión futura) se trata como «sin icono» y se muestran las iniciales.

## Datos y privacidad
El icono es información pública del perfil, como `username` y `display_name`: se lee de la columna pública de `profiles` (también en cuentas privadas). No es el email ni la foto de Google. Sólo el titular lo cambia, mediante la RPC `set_profile_avatar`; no hay escritura directa.
