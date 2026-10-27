# Moderación manual de encuestas (MVP-021)

El MVP no tiene panel de moderación ni borrado por usuarios (brief §6.5). Una persona con acceso administrativo al proyecto Supabase oculta la encuesta cambiando `polls.status` a `hidden`. **No se borra nada**: opciones y votos se conservan y la encuesta se puede restaurar.

## Qué provoca `hidden`

| Ruta | Efecto | Dónde se impone |
|---|---|---|
| Feed `/` y lectura de `polls` / `poll_options` | Desaparece para todos, autor incluido | RLS `polls_select_published` y `poll_options_select_published` |
| Detalle `/polls/[id]` | «No disponible» (404), igual que si no existiera | `getPublicPoll` → `POLL_UNAVAILABLE` |
| `vote_poll` | Rechazado: `POLL_UNAVAILABLE` | RPC |
| `get_poll_results` | Sin agregados, ni siquiera para quien ya votó: `POLL_UNAVAILABLE` | RPC |
| Voto propio (`votes`) | No visible | RLS `votes_select_own` |

Los clientes (`anon`, `authenticated`) no pueden modificar `status`: no tienen UPDATE en `polls` (MVP-011). Sólo puede hacerlo un rol administrativo: la persona operadora desde el Dashboard o el SQL editor (`postgres`), o `service_role` desde un entorno seguro, nunca desde el navegador.

## Procedimiento

1. **Identificar la encuesta.** El UUID es el final de su URL: `https://<dominio>/polls/<id>`.
2. **Elegir el proyecto correcto:** producción `qchpdrolulcgmiliysvr` para contenido real; desarrollo `ltlrujmqenhktiilsnis` sólo para pruebas. Ver [supabase-acceso.md](supabase-acceso.md).
3. **Ocultar**, por una de estas dos vías:
   - **Table Editor** → tabla `polls` → filtrar por `id` → cambiar `status` a `hidden` → guardar.
   - **SQL editor:**

     ```sql
     update public.polls set status = 'hidden' where id = '<id>' returning id, status;
     ```

     Debe devolver exactamente una fila con `hidden`. Si devuelve cero, el ID no existe en ese proyecto.
4. **Comprobar:** abrir `/polls/<id>` en una ventana privada → «No disponible»; la encuesta ya no aparece en `/`.
5. **Registrar** la decisión (fecha, ID, motivo y quién actuó) donde el equipo lleve los incidentes; hoy, un comentario en el issue de seguimiento correspondiente. No copiar datos personales ni contenido ofensivo en el registro más allá de lo necesario.

### Restaurar

```sql
update public.polls set status = 'published' where id = '<id>' returning id, status;
```

Vuelve a mostrarse con sus opciones y votos intactos; quien había votado recupera sus resultados.

## No hacer

- No borrar filas de `polls`, `poll_options` ni `votes` para moderar: borrar una encuesta elimina en cascada sus opciones y votos y no se puede deshacer.
- No usar otros valores de `status`: la base sólo admite `published` y `hidden` (`CHECK`).
- No dar a la app ni a ningún cliente permisos para cambiar `status`.

## Verificación

`supabase/tests/009_moderation.test.sql` (en `npm run test:db` y en CI) recorre el flujo completo: un usuario normal, autor incluido, no puede ocultar ni restaurar; el operador oculta; anon y el autor dejan de verla; quien votó pierde los resultados y su voto deja de ser visible; nadie puede votar; los datos se conservan; al restaurar vuelven los resultados.
