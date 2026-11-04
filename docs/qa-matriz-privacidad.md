# QA-001: matriz de privacidad y convivencia (parcial)

Estado: **parcial**. Cubre los módulos ya integrados (bloqueos, búsqueda, comentarios, denuncias, bio, historial). Fotos de perfil/encuesta (AVATAR-002, MEDIA-*) y las capturas reales quedan pendientes de sus módulos.

Runner y comandos reales: SQL con `supabase/tests/*.test.sql` (CI «Migraciones y tests SQL»; local con PostgreSQL 16 y `supabase/tests/000_helpers.sql`); HTTP contra PostgREST local con `tests/security/social-attacks.test.ts` (CI «Ataques a RLS por HTTP»); E2E con `npx playwright test` (CI «E2E con Playwright»); unitarias con `npx vitest run`.

## Matriz cruzada (`supabase/tests/034_combined_privacy.test.sql`)

Actores: anon, titular de cuenta privada, seguidora aceptada, solicitud pendiente, extraña, bloqueada por la titular, quien bloquea a una cuenta pública y la bloqueada.

| Cruce | Verificado |
|---|---|
| Búsqueda + cuenta privada | Sólo titular y seguidora aceptada encuentran encuestas de la privada; anon, extraña y pendiente no. |
| Búsqueda + bloqueo | La bloqueada por la titular deja de encontrarla aunque la siguiera; quien bloquea a una pública no encuentra nada de ella y la bloqueada tampoco encuentra a quien la bloqueó. |
| Debate + voto + acceso | Abierta pública: `VOTE_REQUIRED` sin voto, debate visible tras votar. Privada: extraña, pendiente, bloqueada y anon obtienen `POLL_UNAVAILABLE` (sin distinguir de inexistente). Quien bloquea a la autora no ve ni comenta. Cerrada pública: un visitante lee; comentar exige sesión. |
| Perfil + historial | Cuenta privada y «quién ve mis votos» son independientes: cambiar una no altera la otra; la audiencia `followers` oculta el historial a una extraña aunque pueda ver el perfil; la privada sólo muestra votos a seguidores aceptados. |
| Bloqueo + historial/listas | Un bloqueo sobre una cuenta **pública** responde `PROFILE_PRIVATE` en historial y listas (en los dos sentidos). |

## Hallazgo corregido

`get_profile_votes` sólo comprobaba `can_view_author` en cuentas privadas: con la audiencia «cualquiera que vea mi perfil» (`profile`), quien bloqueaba a una cuenta pública seguía leyendo su historial de votos. RED observado en `034` (la llamada no falló); corregido en `20261030180000_profile_votes_block.sql` con la guarda incondicional, sin cambiar la firma. Las demás funciones de perfil/listas ya usaban la guarda sin condición.

## Pendiente

- Concurrencia y duplicados cruzados por HTTP (votos/comentarios/denuncias con ráfagas) más allá de lo que cada módulo ya prueba.
- URLs de Storage, fotos + privacidad (MEDIA-002, AVATAR-002).
- Capturas reales por módulo (320/390/1280 px, ambos temas) y cuadrícula con tamaños mixtos.
- Aplicar las migraciones en el Supabase de desarrollo y repetir la matriz allí.
