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

# QA-002: matriz de privacidad para las épicas E13–E21 (preparación)

Estado: **sólo preparación documental (paso 1 de [QA-002 #388](https://github.com/migdlp/opinion-social-media/issues/388))**. Ninguna de las lecturas de abajo existe todavía en `main`: la matriz recoge lo que **deben** cumplir según las fichas de [docs/plan/historias-2026-11-04](plan/historias-2026-11-04/README.md) y las decisiones D-044 a D-054. No hay aserciones SQL, ataques HTTP ni E2E escritos (pasos 2–4 de la ficha) y, por tanto, **ninguna celda está verificada**. Cada fila se marca como verificada sólo cuando su tarea llegue a `main` y su test SQL la cubra.

Cuando una ficha no fija el valor exacto de una celda, la matriz lo dice («como …» o «lo fija el test») en vez de inventarlo. Si un contrato cambia al implementarse, se corrige aquí en la misma PR.

## Lectores y situaciones

Cada fila de la primera tabla es una combinación de lector y situación. Las columnas de esa tabla son las lecturas basadas en una encuesta.

| Clave | Situación |
|---|---|
| V | Visitante sin sesión, encuesta abierta de una cuenta pública. |
| A | Autora que aún no ha votado su propia encuesta abierta. |
| VT | Persona que ya votó una encuesta abierta visible. |
| SA | Seguidora aceptada de una cuenta privada, encuesta abierta. |
| SP | Solicitante pendiente (seguimiento no aceptado) de una cuenta privada. |
| X | Persona ajena que no sigue a una cuenta privada. |
| B | Bloqueo en cualquier sentido entre lectora y autora. |
| S | Autora silenciada por quien lee (D-050). |
| H | Encuesta oculta por moderación. |
| D | Encuesta borrada por su autora (D-046). |

Leyenda: **✔** se permite; **✘ CÓDIGO** se niega con ese error; **omitida** la fila no se devuelve y no hay error; **—** no aplica. «Total» es sólo `total_votes` (D-044). «Reparto» es cualquier dato por opción, porcentaje, opción líder o derivado: **nunca** se obtiene en una encuesta abierta sin haber votado.

## Lecturas basadas en una encuesta

| Situación | `get_poll_vote_counts` (RESULTS-005) | `get_poll_cards` (`vote_count`, `description`) | `get_poll_following_votes` (RESULTS-001) | `get_poll_timeline` (RESULTS-003) | `list_replies` (CMT-004) | `get_feed` / `get_ranked_feed` (FEED-002/003/006, TREND-001, SOCIAL-003) |
|---|---|---|---|---|---|---|
| V | ✔ total | ✔ `vote_count`; reparto ✘ (sin columna) | ✘ sin permiso de ejecución para `anon` | ✘ AUTH_REQUIRED (como `get_poll_results`) | ✘ como `list_comments` (lo fija el test) | ✔ sólo ids; `p_unvoted` ✘ AUTH_REQUIRED |
| A | ✔ total; `get_poll_results` sigue ✘ NOT_VOTED | ✔ `vote_count`; reparto ✘ | ✘ NOT_VOTED (también siendo la autora) | ✘ NOT_VOTED (también la autora) | como `list_comments` | ✔ aparece; con «Sin votar» también aparece (propias no votadas sí) |
| VT | ✔ total | ✔ `vote_count` y reparto como hoy | ✔ sólo seguidas aceptadas visibles por su `vote_visibility` (D-051), máx. 100, sin `user_id` | ✔ con 10 votos o más; con menos ✘ NOT_ENOUGH_VOTES | ✔ si el debate está activo | ✔ aparece; «Sin votar» la excluye |
| SA | ✔ total | ✔ `vote_count`; reparto sólo si votó | ✘ NOT_VOTED si no votó; ✔ si votó | como VT si votó; ✘ NOT_VOTED si no | como VT si votó | ✔ aparece en Siguiendo |
| SP | omitida | omitida | ✘ POLL_UNAVAILABLE | ✘ POLL_UNAVAILABLE | ✘ sin distinguir de inexistente: POLL_UNAVAILABLE (como `034`) o COMMENT_UNAVAILABLE (lo fija el test) | no aparece |
| X | omitida | omitida | ✘ POLL_UNAVAILABLE | ✘ POLL_UNAVAILABLE | ✘ sin distinguir de inexistente: POLL_UNAVAILABLE (como `034`) o COMMENT_UNAVAILABLE (lo fija el test) | no aparece; ni siquiera con categoría seguida (FEED-006) |
| B | omitida | omitida | ✘ POLL_UNAVAILABLE; además la cuenta bloqueada desaparece de la lista de otra encuesta | ✘ POLL_UNAVAILABLE | ✘ POLL_UNAVAILABLE o COMMENT_UNAVAILABLE (lo fija el test); las respuestas de cuentas bloqueadas se omiten y `reply_count` las descuenta | no aparece |
| S | ✔ total (el silencio no cambia permisos) | ✔ | ✔ | ✔ | ✔ | **no aparece** en Recientes, Siguiendo ni secciones; sí en perfil, búsqueda y enlace directo |
| H | omitida | omitida | ✘ POLL_UNAVAILABLE | ✘ POLL_UNAVAILABLE | ✘ COMMENT_UNAVAILABLE si la raíz está oculta | no aparece aunque siga en `poll_rankings` hasta el siguiente recálculo |
| D | omitida | omitida | ✘ POLL_UNAVAILABLE | ✘ POLL_UNAVAILABLE | ✘ COMMENT_UNAVAILABLE | desaparece por la cascada de `poll_rankings` |

Casos que deben tener aserción propia además de la tabla:

- `get_poll_cards` nunca incluye reparto para una abierta no votada, tampoco con `vote_count` y `description` presentes.
- Cursor de una sección usado en otra, o ilegible: `INVALID_CURSOR`.
- Más de 20 ids en `get_poll_vote_counts`: sólo se procesan los 20 primeros; un id inexistente se omite sin error.
- Con `p_unvoted = false`, `get_feed` devuelve exactamente lo mismo que antes de FEED-002.
- Las secciones Tendencias, Populares y Reñidas se calculan sobre una instantánea global, pero la visibilidad se aplica **al leer** para cada persona (TREND-001): una encuesta de cuenta privada entra en la instantánea y sólo la ven sus seguidoras aceptadas. Reñidas no contiene abiertas (D-045).

## Lecturas de cuenta y de datos propios

| Lectura | Tarea | Quién ejecuta | Debe permitir | Debe negar |
|---|---|---|---|---|
| `search_users` | SEARCH-003 | `anon` y `authenticated` | `username`, `display_name`, `avatar_icon` e `is_private` de perfiles encontrados, también privados (`is_private = true`) y silenciados | Cuentas con bloqueo en cualquier sentido (con sesión); `user_id`, `bio` y cualquier dato no público; consultas de menos de 2 o más de 30 caracteres (`INVALID_QUERY`); cursor de otra búsqueda (`INVALID_CURSOR`) |
| `list_notifications` y `count_unread_notifications` | NOTIF-001, NOTIF-002, CMT-004, MOD-005 | `authenticated` (sin sesión `AUTH_REQUIRED`; sin perfil `PROFILE_REQUIRED`) | Los 7 tipos: `new_follower`, `follow_request`, `follow_accepted`, `poll_closed`, `my_poll_closed`, `comment_reply`, `poll_hidden`; sólo avisos propios de los últimos 30 días; `count_unread_notifications` con máximo 100 | Avisos con bloqueo en cualquier sentido; avisos de cuentas silenciadas (D-050); resultados o agregados en `poll_closed`/`my_poll_closed`; `user_id`; avisos de encuestas ocultas, borradas o no visibles; `poll_closed` y `my_poll_closed` a la vez para la misma encuesta; aviso de una solicitud rechazada |
| `list_my_reports` | MOD-003 | `authenticated` | Sólo las denuncias propias, con su estado (`pending`, `actioned`, `dismissed`) | Denuncias de otras cuentas; `target_label` y `target_path` cuando el objetivo ya no es visible para quien llama (deben ser `null`); qué medida se tomó o quién fue el operador |
| `get_my_hidden_polls` | MOD-005 | `authenticated` | Sólo encuestas **propias** con `status = 'hidden'`: pregunta, fecha, motivo y estado de la reclamación | Encuestas ocultas de otras cuentas; cualquier agregado o resultado; una segunda reclamación sobre la misma encuesta |
| `export_my_data` | ACCOUNT-003 | `authenticated` | Los datos propios y, de terceros, sólo `@usuario` dentro de relaciones propias (sigo, me siguen, bloqueé, silencié, denuncié) | `user_id` de terceros; votos o comentarios ajenos; agregados de encuestas; quién ha bloqueado a la cuenta; segunda petición antes de 10 minutos (`DATA_EXPORT_RATE_LIMITED`), también si llegan a la vez; ejecución por `anon` |
| `list_dismissed_polls` | FEED-003 | `authenticated` | Descartes propios aún visibles | Descartes de otras cuentas, por RPC o por la API REST; encuestas que dejaron de ser visibles; descartar una encuesta propia (`CANNOT_DISMISS_OWN`) |
| `list_muted_users` y `get_profile.is_muted` | SOCIAL-003 | `authenticated` | Silencios propios; `is_muted = true` sólo para quien silenció | Que la cuenta silenciada lo detecte por RPC, listas o `get_profile`; silenciar a una cuenta bloqueada (`USER_NOT_FOUND`) o a sí misma (`CANNOT_MUTE_SELF`) |
| `list_my_categories` | FEED-006 | `authenticated` | Categorías seguidas propias | Las de otras cuentas; lectura directa de `category_follows`; slug en mayúsculas o inexistente (`INVALID_CATEGORY`) |

Tablas que ningún cliente puede leer ni escribir directamente (RLS sin `grant`): `dismissed_polls`, `category_follows`, `user_mutes`, `poll_rankings`, `data_export_events`, `released_usernames` y `moderation_appeals`. Cada una necesita una aserción de lectura directa denegada para `anon` y `authenticated`.

Ya en `main`: ACCOUNT-001 (`delete_my_account`, `supabase/tests/035_delete_my_account.test.sql` y `tests/security/account-deletion-attacks.test.ts`). Esa tarea no es una lectura, así que su cobertura es la suya; QA-002 la reutilizará en el recorrido E2E final (paso 4 de la ficha).

## Ataques combinados previstos (paso 3 de la ficha, sin escribir)

Cada uno debe dar **como máximo** lo que permiten D-044 y D-051. Si algo deducible es el riesgo residual que D-051 acepta, se documenta como tal en vez de fallar.

| Ataque | Combinación | Resultado esperado |
|---|---|---|
| Deducir el reparto por el total | `vote_count` antes y después del voto de una cuenta controlada, junto con `get_ranked_feed` | Sólo se deduce que hubo un voto más, nunca por qué opción; ninguna sección ordena abiertas por su reparto |
| Reparto por tarjetas y resultados | `get_poll_vote_counts` + `get_poll_cards` + `get_feed_results` sin votar | `get_feed_results` y `get_poll_results` siguen negando; ninguna columna de reparto |
| Evolución con tramos | `get_poll_timeline` con tramos de 6 h y 10 votos mínimos | Sólo tras votar o con la encuesta cerrada; el voto individual deducible por hora de voto es el residual de D-051 y se documenta |
| Seguimiento cambiante | `get_poll_following_votes` cambiando seguimiento, bloqueo o `vote_visibility` | Una cuenta `private` no aparece nunca; un cambio de relación se refleja de inmediato; sin `user_id` |
| Instantánea de rankings | Lectura directa de `poll_rankings` y `get_ranked_feed` con una encuesta que pasa a privada u oculta | Tabla denegada a los clientes; la encuesta no aparece para quien no debe aunque siga en la instantánea |
| Filtro sin sesión | `anon` con `p_unvoted = true` | AUTH_REQUIRED |
| Estado de silencios y descartes | Lectura directa de `user_mutes`, `dismissed_polls`, `category_follows` y comparación de feeds entre dos cuentas | Ningún cliente lee filas ajenas; la cuenta silenciada no detecta el silencio |
| Exportación cruzada | `export_my_data` de dos cuentas con relaciones mutuas | Cada JSON sólo contiene lo propio y `@usuario` de terceros |

## Pendiente en QA-002

- Pasos 2–4 de la ficha: `supabase/tests/<NNN>_combined_privacy_v2.test.sql`, `tests/security/combined-v2-attacks.test.ts` y `e2e/regresion-historias-2026-11.spec.ts`. Requieren las tareas de E13–E21 en `main` y un entorno con `npm` operativo.
- Marcar cada fila de las tablas de arriba como verificada al fusionarse su tarea.
- Enlazar desde esta matriz cada hallazgo que aparezca, con su tarea o BUG.
