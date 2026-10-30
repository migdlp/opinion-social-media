# Registro técnico de cookies y almacenamiento

Instantánea de LEGAL-001 (29-10-2026). Sólo código/dependencias y una petición HTML anónima; **no es una auditoría completa de cookies autenticadas de producción**. Nunca registrar valores de sesión, JWT, refresh tokens, verificadores PKCE ni códigos OAuth en este documento.

## Estado observado

| Familia | Finalidad / proveedor | Dónde y cuándo | Duración conocida | Clasificación / pendiente |
|---|---|---|---|---|
| `sb-<project-ref>-auth-token` y posibles fragmentos `.0`, `.1`, etc. | Sesión Supabase SSR compartida entre navegador/servidor | Cookies del dominio de la app tras autenticación; los entornos usan refs distintas | SDK 0.12.7 solicita **Max-Age 34.560.000 s (400 días)**; puede renovar al refrescar sesión y el navegador puede limitarlo. No es la vida del JWT ni del refresh token, que depende de Auth/configuración | Persistente según opciones de código. No afirmar exención por llamarse Auth. AUTH-001 y LEGAL-004 deben justificar duración, uso y clasificación real |
| `sb-<project-ref>-auth-token-code-verifier` y fragmentación si procede | Verificador PKCE del retorno de OAuth, Supabase | Se genera al iniciar el flujo, no para cada visita pública | La misma infraestructura usa las opciones de cookie; se retira al consumir el flujo según SDK. Verificar plazo efectivo/retirada en cancelación y errores | Función de seguridad/autenticación; revisar duración mínima y no conservar un verificador abandonado sin justificación |
| Cookies de Google en su propio origen | Cuenta/seguridad del proveedor de identidad | Al abandonar la app para el login Google | No medidas ni enumeradas en esta revisión; no inventar nombres/plazos | Explicar proveedor y política; no confundir con cookies propias ni asumir que son Analytics instaladas por la app |
| Cookies de plataforma/protección, si se activaran | Hosting/protección Vercel u otros componentes | Depende de configuración real/solicitudes del proveedor | Sin cookies Set-Cookie en el documento anónimo observado; no equivale a prueba completa de navegador o ausencia en otros flujos | Verificar en contexto real antes de publicar el inventario final |
| Preferencia de tema — implementación DESIGN-013, pendiente de publicación | Recordar Claro/Oscuro elegido por el usuario; Sistema no guarda clave | localStorage `opinion-theme`, valores light/dark; sólo tras elección explícita | Hasta cambio o borrado del almacenamiento del navegador; sin TTL ni sincronización de cuenta | Preferencia expresamente solicitada, sin tracking ni cookie nueva; incorporar a LEGAL-004 y verificar al publicar |

El valor 400 días procede de `node_modules/@supabase/ssr/src/utils/constants.ts` y la escritura de `cookies.ts`, reproducibles mediante package-lock.json. En esta versión, la ruta de escritura fuerza `DEFAULT_COOKIE_OPTIONS.maxAge`; no basta asumir que un `cookieOptions.maxAge` personalizado prevalecerá.

## Atributos y exposición

- Default SDK revisado: `path=/`, `SameSite=lax`, `HttpOnly=false`. La app usa el SDK de navegador; no cambiar HttpOnly a ciegas rompiendo la integración. Los tokens siguen siendo credenciales y no deben aparecer en trazas públicas.
- `Secure` no se fuerza explícitamente en client.ts/server.ts/proxy.ts ni figura en los defaults consultados. **No se ha verificado una cookie autenticada real en HTTPS**; AUTH-001 debe comprobar atributos efectivos y endurecerlos según el contrato elegido. La respuesta pública observada sí tenía HSTS.
- Ninguna tabla de negocio se guarda por código propio en localStorage/sessionStorage. `createBrowserClient` usa cookies; no se configura `cookies.encode = 'tokens-only'`, modo que podría activar almacenamiento de usuario en localStorage. No generalizar esto a una sesión observada de todas las versiones futuras.
- La selección previa al login viaja como `?elige=<optionId>` dentro de la ruta de retorno (V2-052), no en almacenamiento local. URLs/historial/logs pueden requerir minimización/redacción, especialmente callback `code`, `next` y `elige`; no incluirlas completas con credenciales en incidencias.
- No se encontraron SDKs/scripts de analítica publicitaria o medición en dependencias/src. Fuentes Geist locales; no se llama a Google Fonts para la tipografía. Esto no demuestra ausencia de registros del hosting/identidad.

## Observación HTTP pública

Documento `https://opinion-social-media.vercel.app/`, visita anónima de sólo lectura:

- HTTP 200; `Set-Cookie` recibidos: **0**.
- HSTS: `max-age=63072000; includeSubDomains; preload`.
- No se ejecutó JavaScript ni OAuth ni se inspeccionó una sesión del propietario. No se guardaron valores de cookies. El número cero sólo describe esta petición.

## Decisión de consentimiento pendiente

La LSSI art. 22.2 y la guía AEPD requieren distinguir finalidades, necesidad y persistencia. La guía servida cita cookies de autenticación **únicamente de sesión** entre las exceptuadas; por eso no se convierte automáticamente la configuración persistente del SDK en una exención ya validada. LEGAL-004 debe resolverlo tras AUTH-001:

1. Identificar los valores efectivos en navegador y el plazo justificado.
2. Clasificar cada finalidad/tecnología, incluidas preferencias y cookies de proveedores.
3. Si hay elementos no esenciales sujetos a consentimiento: bloqueo previo, aceptar/rechazar con facilidad equivalente, preferencias y retirada.
4. Si sólo quedan elementos necesarios/exceptuados justificados: informar sin crear un banner que finja consentir lo obligatorio.

Esta tarea no cambia duración, configuración Auth ni cookies del propietario, ni añade analítica o un CMP.
