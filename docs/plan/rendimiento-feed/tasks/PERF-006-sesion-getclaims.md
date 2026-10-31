---
id: PERF-006
title: Sesión con getClaims() en feed y navegación
epic: E-PERF
status: todo
depends_on: []
requirements: [RF-07, RNF-04]
size: S
---

# PERF-006 · Sesión con `getClaims()` en feed y navegación

## Objetivo
El feed, «Cargar más» y la cabecera obtienen el usuario con un helper `getSessionUserId` basado en `auth.getClaims()`, sin cambiar quién se considera con sesión.

## Contexto
- Hoy usan `supabase.auth.getUser()`, que siempre hace una petición a Supabase Auth: `src/app/feed.tsx`, `src/app/feed-actions.ts` y `src/lib/auth/navigation.ts`.
- `auth.getClaims()` (supabase-js 2.118) verifica el JWT localmente con las claves públicas del proyecto (JWKS, cacheadas) si son asimétricas; si son simétricas hace la misma petición que `getUser()`. Devuelve `{ data: { claims } | null, error }`; `claims.sub` es el id de usuario.
- `src/proxy.ts` ya llama a `getClaims()` en cada petición para renovar la sesión.
- La autorización no cambia: RLS y RPC usan el JWT enviado a Supabase.
- PA-1 ([03-risks-open-questions.md](../03-risks-open-questions.md)): comprobar si dev/prod usan claves asimétricas.

## Archivos
- Crear: `src/lib/auth/session.ts`
- Crear: `src/lib/auth/session.test.ts`
- Modificar: `src/app/feed.tsx`, `src/app/feed-actions.ts`, `src/lib/auth/navigation.ts`
- No tocar: Server Actions de escritura, `src/proxy.ts`, `src/lib/supabase/*` (AUTH-001 #264 los está tocando).

## Pasos
1. Ejecuta `curl -s https://ltlrujmqenhktiilsnis.supabase.co/auth/v1/.well-known/jwks.json` y `curl -s https://qchpdrolulcgmiliysvr.supabase.co/auth/v1/.well-known/jwks.json` (endpoints públicos). Anota en el issue si `keys` está vacío o no (PA-1).
2. RED: `session.test.ts` con el doble de Supabase: claims con `sub` → devuelve el id; `error` → `null`; `data` nulo → `null`; excepción → `null`. Ejecuta y comprueba que falla.
3. Implementa `export async function getSessionUserId(supabase: SupabaseClient): Promise<string | null>` con `try { const { data, error } = await supabase.auth.getClaims(); return error || !data?.claims?.sub ? null : data.claims.sub } catch { return null }`.
4. Sustituye `auth.getUser()` por `getSessionUserId` en los 3 archivos; `signedIn = userId !== null`.
5. GREEN: tests nuevos y existentes (`feed.test.tsx`, `feed-actions.test.ts`, tests de navegación y cabecera) en verde. Ajusta el doble para que exponga `getClaims` si los tests existentes lo necesitan, sin cambiar sus expectativas.

## Casos límite a cubrir
| Caso | Comportamiento esperado |
|---|---|
| Sin cookie de sesión | `null` → visitante |
| Token caducado no renovado | `null` → visitante |
| Supabase Auth no responde (claves simétricas) | `null` → visitante, sin error en la página |

## Criterios de aceptación
- [ ] Los 3 archivos usan `getSessionUserId` y ninguno llama a `getUser()`.
- [ ] Tests del helper y existentes en verde.
- [ ] Resultado de PA-1 anotado en el issue.
- [ ] RED, GREEN y REFACTOR registrados en la PR.

## Verificación
```bash
npx vitest run src/lib/auth src/app/feed.test.tsx src/app/feed-actions.test.ts
npm run check
npm run test:e2e
```

## Fuera de alcance
- Server Actions de escritura (votar, crear, seguir): mantienen `getUser()`.
- Rotar o migrar claves JWT en Supabase.

## Si te bloqueas
- Si `getClaims` no existe en la versión instalada de supabase-js, para y repórtalo; no actualices dependencias.
