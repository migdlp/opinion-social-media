# Inventario de datos y requisitos legales — LEGAL-001

Fecha de revisión: **29-10-2026**. Es un inventario técnico y una lista de decisiones para revisión del responsable, no una política publicada ni una acreditación de cumplimiento.

## Alcance y versiones

- Producción observada: `release` `69f8a10`, deployment Vercel `dpl_78nurnzhEzvttMSUwDAqgPVut3Cp`; la comprobación anónima del documento HTML respondió 200, sin Set-Cookie y con HSTS. No se ejecutó un nuevo OAuth real ni se inspeccionaron cookies de una cuenta del propietario.
- Main incluye PRIV-001, migración `20261029152251_vote_history_visibility.sql`, **sin aplicar todavía a proyectos compartidos**. No se puede anunciar en una política que el historial productivo ya es Solo yo: actualmente sigue la versión desplegada hasta integrar y publicar esa migración y sus controles.
- Versiones revisadas: `@supabase/ssr` 0.12.7, `@supabase/supabase-js` 2.118.0, Next.js 16.4.3; fuentes versionadas en package-lock.json. No se han leído claves privadas, datos de usuarios ni tablas Auth de producción para esta revisión.
- País/identidad y contacto del responsable aún no facilitados. **Los tres cerditos** y **Miguel's projects** son nombres de equipos técnicos; no se deben convertir automáticamente en razón social del responsable.

## Matriz de tratamientos

Las bases jurídicas son **propuestas a validar**, no decisiones ya aceptadas. Un consentimiento genérico o aceptar condiciones no justifica por sí solo todos los tratamientos.

| Tratamiento / datos | Finalidad y base propuesta para revisión | Acceso / destinatarios | Conservación observada y decisiones pendientes | Evidencia |
|---|---|---|---|---|
| Cuenta Google/Supabase: identificador de usuario/proveedor, email, tokens y metadatos que entregue Google (pueden incluir nombre/foto) | Autenticación y prestación de cuenta: valorar art. 6.1.b RGPD y minimización de atributos; separar las operaciones propias de Google | Supabase Auth, Google y servidor/cliente autenticado; la app no publica email ni importa nombre/foto de Google al perfil automáticamente | No hay baja de cuenta en la UI ni plazo definido en el repo. Vida de JWT, refresh token y logs Auth requiere verificar configuración real del proveedor; no deducirla del Max-Age de cookie | [Cliente](../../src/lib/supabase/client.ts), [callback](../../src/app/auth/callback/route.ts), [onboarding](../../src/app/onboarding/onboarding-form.tsx) |
| Perfil: UUID, @usuario, nombre visible opcional, privacidad, fechas | Identidad elegida por el usuario y funcionamiento social; valorar contrato y publicación explícita de campos | Cabecera pública según D-017, incluso en cuenta privada; no contiene email ni UUID en RPC públicas. Supabase y Vercel procesan las peticiones | Sin expiración automática; FK hacia auth.users. Definir conservación/baja, cambios de usuario y qué ocurre con enlaces/autorías | [Perfiles](../../supabase/migrations/20261028130000_create_profiles.sql), [perfil público](../../supabase/migrations/20261028230000_profile_page.sql) |
| Encuestas: pregunta/opciones, categoría, autor, estado y fechas de creación/cierre | Publicación y participación solicitadas; valorar contrato y reglas de contenido | Visitantes o seguidores aceptados según privacidad; moderación puede ocultar; contenido servido por Supabase/Vercel | **Cerrar u ocultar no borra**. Salir del feed a las 24 h tampoco borra. Sin plazo de borrado definido. Al borrar autor Auth, hay cascadas que afectan a encuesta/opciones/votos de terceros | [Modelo](../../supabase/migrations/20261027193208_create_polls_and_options.sql), [feed](../../supabase/migrations/20261028270000_feed_read.sql) |
| Votos e historial: cuenta, encuesta, opción, fecha; preferencia de audiencia en main | Registrar un voto único y descubrir resultados; valorar contrato. El contenido puede revelar opiniones políticas/salud u otros datos sensibles: evaluar art. 9 y restricciones antes de asumir una base ordinaria | Voto directo sólo propio; RPC de historial según versión/permisos; resultados agregados tras votar o cierre, sin identidades. No prometer anonimato absoluto: el backend asocia votos a cuentas | Inmutable desde cliente, **no anónimo en almacenamiento**. Sin expiración definida. La supresión de Auth puede eliminar votos y cambiar agregados; resolverlo en LEGAL-003. PRIV-001 no borra ni excluye votos de agregados | [Votos](../../supabase/migrations/20261027193601_create_votes.sql), [historial](../../supabase/migrations/20261028220000_profile_votes.sql), [PRIV-001](../priv-001-audiencia-votos.md) |
| Seguimientos/solicitudes: ambas cuentas, pendiente/aceptado, fecha | Función social y permisos solicitados; valorar contrato | Las partes implicadas; listas aceptadas con límites de perfil; Supabase y Vercel | Relación hasta retirar/rechazar/borrar cuenta. Contadores y cabecera tienen visibilidad propia; definir retención adicional sólo si es necesaria | [Follows](../../supabase/migrations/20261028160000_create_follows.sql), [listas](../../supabase/migrations/20261028250000_follow_lists.sql) |
| Guardadas: cuenta, encuesta y fecha | Lista privada solicitada; valorar contrato | Sólo titular, autorizada por RLS | Hasta quitarla o borrar cuenta/encuesta por FK. Que una encuesta deje de ser visible no borra necesariamente la fila guardada | [Guardadas](../../supabase/migrations/20261028260000_saved_polls.sql) |
| Denuncias: denunciante, encuesta, motivo, texto libre y fecha | Moderación y prevención de abuso; valorar interés legítimo documentado u obligación aplicable, minimización y garantías | RPC controlada; administradores revisan en Supabase, sin panel público. No entregar identidades a otros usuarios | Sin plazo definido ni purga automática. El texto puede contener datos de terceros; limitar acceso y conservación, y definir gestión de solicitudes | [Denuncias](../../supabase/migrations/20261028150000_poll_reports.sql), [moderación](../moderacion.md) |
| Eventos de cuota: cuenta y fecha de nuevos seguimientos | Evitar abuso; valorar interés legítimo con análisis de necesidad/proporcionalidad | Sólo RPC/administración; sin lectura ni escritura de clientes | Ventana de cálculo de 60 min y limpieza **al intentar un nuevo seguimiento**, no TTL garantizado: una cuenta inactiva puede conservar eventos más tiempo. Definir plazo efectivo en LEGAL-003 | [Cuota](../../supabase/migrations/20261028280000_follow_quota_events.sql) |
| Peticiones, sesión y seguridad: IP/UA/URL/tiempos y logs que mantengan proveedores | Servir/proteger la app y resolver incidencias; revisar necesidad/base y configuración contractual | Vercel, Supabase/Auth y sus subencargados según contrato; administradores autorizados | No hay logging de contenido/tokens ni SDK de analítica en src. Esto **no prueba ausencia de logs del proveedor**. Retención efectiva de acceso, errores, Auth y copias pendiente de consola/contrato; revisar redacción de URLs con code/next/elige y evitar secretos en trazas | [Proxy](../../src/proxy.ts), [Auth](../../src/app/auth/callback/route.ts), [operación](../vercel-operacion.md) |
| Iconos/fotos de avatar — futuro, no habilitados | Personalización elegida. Imagen personal; no se implementa reconocimiento facial ni se debe clasificar toda foto como biometría automáticamente | Definir lectura conforme a cabecera y explicarla antes de subir; Storage con escritura exclusiva del titular | Iconos como ID permitido; fotos con máximo/tipos y EXIF/GPS eliminados según AVATAR-002. Definir sustitución, huérfanos, caché, baja y copias antes de habilitar | [Backlog](../backlog-cuenta-legales.md), #247/#252/#255 |

## Proveedores, ubicación y transferencias

| Servicio | Hecho comprobado / función | Revisión necesaria |
|---|---|---|
| Supabase | Dos proyectos existentes de Los tres cerditos en Irlanda (`eu-west-1`), PostgreSQL/Auth; Storage futuro. DPA público describe rol de encargado para datos del cliente | Confirmar titular/aceptación del DPA, lista de subencargados vigente, entidades y mecanismos de transferencia aplicables, logs, copias, soporte y configuración real. Región de base no garantiza que todos los tratamientos sean sólo UE |
| Vercel | Hosting Next.js, CDN y funciones. Deployment observado con región **iad1 (EE. UU.)**; no afirmar alojamiento íntegramente europeo | DPA/contrato y subencargados, configuración de región/logs/retención y mecanismos de transferencia. El DPA consultado contempla procesamiento en EE. UU. y otras ubicaciones |
| Google | Proveedor de identidad, OAuth/OIDC; no hay integración de publicidad/Analytics ni importación automática al perfil | Confirmar cliente OAuth/scopes efectivos y metadatos almacenados, política del proveedor y roles por operación. No clasificar a Google automáticamente como mero encargado de toda su actividad |
| GitHub | Fuente/CI y coordinación; fixtures de pruebas, no destino diseñado para usuarios productivos | No canalizar derechos ni datos personales por issues públicos. Revisar acceso del equipo, secretos, artefactos/trazas y retención CI; no subir dumps/cookies de producción |

No se han aceptado contratos ni cambiado regiones/configuraciones durante esta tarea.

## Marco para revisión del responsable

- RGPD: finalidad/minimización/conservación y bases (arts. 5 y 6), posibles categorías especiales por contenido de voto (art. 9), información (arts. 12–14), derechos (arts. 15–22), seguridad/encargados (arts. 28 y 32), transferencias (arts. 44 y siguientes). Determinar ámbito territorial y obligaciones concretas con el país/actividad del responsable; no asumir que alojar la base en Irlanda resuelve transferencias.
- LSSI: revisar aplicabilidad del art. 10 al prestador y art. 22.2 sobre almacenamiento/recuperación de información. Nombre/razón social, domicilio/contacto y otros datos exigibles no se inventan. Ser gratuito no resuelve por sí solo toda la aplicabilidad.
- Menores: no hay control específico de edad/consentimiento parental en la app. Para España, el art. 7 LOPDGDD regula consentimiento de menores y el umbral de 14 años en ese contexto; **no es una conclusión de que toda participación a partir de 14 sea suficiente** para cualquier tratamiento/condición. Definir audiencia/edad y medidas aplicables antes de afirmarlo en términos.
- Condiciones: publicación pública, cuenta/privacidad, voto irreversible frente a derechos aplicables, moderación/denuncias, contenidos prohibidos, cambios y soporte. Sin pagos/suscripciones ni promesas de anonimato o disponibilidad no verificadas. No vincular una casilla genérica a todos los tratamientos.

## Canal para derechos y decisiones bloqueantes

Canal operativo propuesto: **correo dedicado controlado por el responsable**, con registro privado de solicitudes y verificación proporcionada de identidad; dirección concreta y funcionamiento pendientes de que el titular los facilite/valide. No usar GitHub público ni pedir tokens, contraseñas o documentación excesiva. LEGAL-003 debe probar atención, acceso/rectificación/supresión y demás derechos aplicables; distinguir borrado técnico, anonimización y retención justificada de copias.

La [ficha del responsable](datos-responsable-pendientes.md) separa lo pendiente de lo conocido. LEGAL-002 queda condicionada a esos datos y revisión; no se han creado páginas legales vacías ni políticas con información ficticia. El inventario en sí es entregable, sin presentar el canal propuesto como ya operativo.

## Fuentes revisadas

Consulta del 29-10-2026:

- [RGPD, copia oficial BOE/DOUE](https://www.boe.es/doue/2016/119/L00001-00088.pdf), lectura de arts. 5/6/9 y apartados de información/encargados/transferencias. EUR-Lex devolvió 202 vacío en este entorno; se utilizó BOE, sin simular acceso al texto vacío.
- [LSSI consolidada en BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2002-13758), arts. 10 y 22.2.
- [LOPDGDD consolidada en BOE](https://www.boe.es/buscar/act.php?id=BOE-A-2018-16673), art. 7.
- [Guía AEPD sobre cookies](https://www.aepd.es/guias/guia-cookies.pdf), documento servido **mayo 2024**, apartado de cookies exceptuadas (incluye matices sobre autenticación de sesión).
- [DPA Supabase](https://supabase.com/legal/customer-resources/data-processing-addendum) y [subencargados](https://supabase.com/legal/customer-resources/subprocessor-list).
- [DPA Vercel](https://vercel.com/legal/dpa).
- [Scopes OIDC Google](https://developers.google.com/identity/protocols/oauth2/scopes#openid-connect).

## Entrega a las siguientes tareas

- **LEGAL-002:** datos del responsable y revisión del inventario; redactar textos para funciones realmente habilitadas y su versión, no para promesas futuras.
- **LEGAL-003:** plazos efectivos por categoría, canal operativo y procedimiento ensayado. Atender cascadas de Auth y limpieza perezosa de cuotas antes de prometer una conservación concreta.
- **LEGAL-004:** usar el [registro de cookies](registro-cookies.md) y AUTH-001 #258. No declarar automáticamente exentas las cookies Auth persistentes de 400 días, ni añadir un banner de aceptación inútil sin clasificar lo observado.
- **AUTH-001:** verificar atributos/duración de sesión/PKCE en HTTPS sin registrar secretos y coordinar las decisiones con los textos.

Validación de LEGAL-001: revisión de esquema/código/dependencias y fuentes oficiales, lectura anónima HTTP sin sesión, matriz de hechos/pendientes y enlaces. Sin tests de aplicación ni un ciclo TDD inventado: no se ha modificado comportamiento.
