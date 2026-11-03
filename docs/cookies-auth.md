# Cookies de autenticación (AUTH-001)

Estado: **implementado y probado con tests unitarios; sin observar un login real en HTTPS**. La duración elegida es una **propuesta** que debe validar la revisión legal antes de actualizar LEGAL-004 y la política de cookies.

## Hechos del código

- `@supabase/ssr` 0.12.7 escribe cada cookie de sesión y de verificador PKCE con `Max-Age` de 400 días y **pisa** cualquier `maxAge` pasado en `cookieOptions` (`cookies.js`, `applyServerStorage`). Por eso la duración no se puede fijar por esa vía.
- Tampoco añade `Secure`. `HttpOnly=false` es decisión del SDK: el cliente de navegador lee la sesión.
- Cambio: `src/lib/supabase/cookies.ts` reescribe las opciones justo antes de guardar, igual en el navegador (`client.ts`, adaptador sobre `document.cookie`), en servidor (`server.ts`) y en el proxy (`proxy.ts`).

## Inventario (según el SDK y este cambio)

| Cookie | Finalidad | Vida | Atributos |
|---|---|---|---|
| `sb-<ref>-auth-token` (y `.0`, `.1`… si se fragmenta) | Sesión de Supabase (acceso y renovación) | 30 días desde la última escritura (propuesta) | `Path=/`, `SameSite=Lax`, `Secure` sólo sobre HTTPS, `HttpOnly=false` |
| `sb-<ref>-auth-token-code-verifier` (y variantes `-flow-<id>-` y `-flows-`) | Verificador PKCE del viaje a Google | 30 minutos; el SDK la borra al canjear el código | igual |

`<ref>` es la referencia del proyecto de Supabase. No se guardan valores en este documento.

## Decisiones

1. **30 días** para la sesión (antes 400). Cada renovación de token reescribe la cookie, así que es una ventana de inactividad. Pendiente de validación legal; cambia con `AUTH_COOKIE_MAX_AGE`.
2. **30 minutos** para el verificador PKCE: un login cancelado no lo deja semanas en el navegador.
3. **`Secure` sólo si la petición es HTTPS** (protocolo de la URL o `x-forwarded-proto`). En desarrollo por HTTP una cookie `Secure` no se guardaría.
4. El borrado (`Max-Age=0`) no se altera.
5. No se clasifica aquí la cookie como exenta o no de consentimiento: lo decide LEGAL-004 con este inventario.

## Verificación

- Tests: `src/lib/supabase/cookies.test.ts`, `server-cookies.test.ts`, `src/proxy.test.ts` y `clients.test.ts`.
- **No verificado**: inventario observado en un navegador real sobre HTTPS, flujo completo de Google, renovación tras horas y logout con cookies fragmentadas, ni los E2E de login/recarga/renovación/logout con ambos protocolos (los E2E sólo corren en CI). No se ha tocado ningún proyecto de Supabase ni ninguna sesión.
