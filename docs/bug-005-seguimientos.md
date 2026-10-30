# BUG-005: seguir cuentas públicas y privadas

Estado: **auditoría con pruebas añadidas; sin ejecutar contra dev ni producción**. El problema comunicado no se ha reproducido ni descartado: no hay acceso de lectura a los proyectos de Supabase desde esta sesión (el conector pide autorización), y los E2E y ataques por HTTP sólo corren en CI.

## Contrato vigente (D-017)

Seguir una cuenta **pública** crea la relación `accepted` al instante (sin solicitud). Seguir una **privada** crea `pending` hasta que el titular acepta o rechaza. Una cuenta que pasa a pública acepta sus pendientes; una que pasa a privada conserva a sus seguidores aceptados.

## Cobertura por criterio

| Criterio de #280 | Evidencia previa | Añadido en BUG-005 |
|---|---|---|
| Pública → accepted directo | `supabase/tests/013_follows.test.sql` (RPC) | Ataque HTTP: `follow_user` devuelve `accepted`, una sola fila y bandeja vacía |
| Privada → una sola pending, también con doble petición; sin acceso hasta aceptar | `013_follows` (idempotencia secuencial); `social-attacks` (lectura directa) | Doble petición **simultánea** → una fila; el solicitante no ve encuestas ni contenido de perfil hasta aceptar |
| Bandeja del titular solo con pendientes entrantes; aceptar/rechazar actualiza contadores y permisos | `022_follow_lists`, `e2e/ciclo-social.spec.ts` | Contador y bandeja tras aceptar (HTTP) |
| Cambio de privacidad conserva a los aceptados y se lee persistido | `013_follows` | Persistencia leída por un cliente distinto y efecto sobre pendientes/aceptados (HTTP) |
| Dos cuentas, REST/RPC directos, comparación dev/prod | Parcial | **Pendiente**: la comparación dev/prod necesita acceso a Supabase |

## Qué falta para cerrar la tarea

- Ver el resultado de los nuevos tests en CI (ataques HTTP).
- Reproducir la incidencia en dev/producción y documentar si era configuración, interfaz o backend. No se ha modificado SQL productivo.
