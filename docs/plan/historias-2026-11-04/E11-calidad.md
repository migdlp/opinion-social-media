# E11 · Calidad (épica existente): regresión de las historias del 04-11-2026

La épica E11 ya existe ([#114](https://github.com/migdlp/opinion-social-media/issues/114)). Esta tarea comprueba que las épicas E13–E21 no rompen la privacidad entre sí ni con los módulos anteriores. Reglas comunes en el [README](README.md).

| Tarea | Prioridad | Tamaño | Dependencias |
|---|---|---|---|
| [QA-002](https://github.com/migdlp/opinion-social-media/issues/388) | P0 | L | Se prepara desde el principio; se cierra cuando todas las tareas de E13–E21 están en main |

---

### QA-002 — Regresión de privacidad y convivencia para E13–E21

**Objetivo:** demostrar con pruebas automáticas que, con todas las funciones nuevas activas a la vez, ninguna combinación filtra el reparto de encuestas abiertas no votadas, contenido de cuentas privadas sin permiso, datos de cuentas bloqueadas, silencios ajenos, descartes ajenos, avisos ajenos ni datos exportados de otra persona.

- **Épica:** E11 [#114](https://github.com/migdlp/opinion-social-media/issues/114) · **Prioridad:** P0 · **Tamaño:** L
- **Etiquetas:** `testing`, `security`, `backend`
- **Dependencias:** todas las tareas de E13–E21. El trabajo empieza en paralelo: la matriz y los datos sembrados se preparan con los contratos de las fichas, y cada fila se marca cuando su tarea llega a main.

**Trabajo**
1. Ampliar [qa-matriz-privacidad.md](../../qa-matriz-privacidad.md) con una fila por cada lectura nueva:
   - `get_feed` (con «Sin votar», descartes, categorías y silencios), `get_ranked_feed` y `get_poll_vote_counts`;
   - `get_poll_cards` (`vote_count`, `description`), `get_poll_following_votes` y `get_poll_timeline`;
   - `search_users`, `list_notifications` (los 7 tipos), `list_replies`, `list_my_reports` y `get_my_hidden_polls`;
   - `export_my_data`, `list_dismissed_polls`, `list_muted_users` y `list_my_categories`.
   
   Cada lectura se cruza con estas columnas de lector y situación:
   - visitante;
   - autora sin voto;
   - votante;
   - seguidora aceptada;
   - solicitante pendiente;
   - persona ajena;
   - bloqueada (en los dos sentidos);
   - silenciada;
   - encuesta oculta;
   - encuesta borrada.
2. Crear `supabase/tests/<NNN>_combined_privacy_v2.test.sql`, siguiendo el patrón de `034_combined_privacy.test.sql`, con al menos una aserción por cada celda «debe negar».
3. Crear `tests/security/combined-v2-attacks.test.ts` con ataques que combinen varias RPC para deducir el reparto. Por ejemplo:
   - `vote_count` antes y después del voto de una cuenta controlada, junto con `get_ranked_feed`;
   - `get_poll_timeline` con tramos;
   - `get_poll_following_votes` cambiando el seguimiento.
   
   Ninguno debe dar más información que la permitida por D-044 y D-051. Si la información deducible es la residual que acepta D-051, se documenta como tal.
4. Crear un E2E de recorrido completo en `e2e/regresion-historias-2026-11.spec.ts`:
   1. Una cuenta sigue a otra y a una categoría.
   2. Descarta una encuesta y silencia a otra cuenta.
   3. Vota desde Tendencias, ve el total antes de votar y el desglose de seguidos después.
   4. Responde a un comentario y recibe y lee avisos.
   5. Exporta sus datos.
   6. Elimina la cuenta.
   
   Se ejecuta a 320/390/1280 px y en los dos temas.
5. Anotar en la PR los resultados de `npm run check`, `test:db`, `test:db:concurrency`, `test:security` y `test:e2e`.

**Criterios de aceptación**
- [ ] Todas las celdas de la matriz tienen aserción y pasan. Las celdas pendientes de una tarea no fusionada quedan marcadas y la tarea no se cierra hasta completarlas.
- [ ] Ningún ataque combinado obtiene el reparto de una abierta no votada.
- [ ] El recorrido E2E completo pasa en CI.
- [ ] Cada hallazgo se corrige en su tarea o en un BUG nuevo, con enlace desde la matriz.

**Fuera de alcance:** pruebas en dev o prod alojados y pruebas de carga.
