# Cuenta, apariencia, privacidad y requisitos legales

Petición del propietario del 29-10-2026, incorporada por DOC-010 [#243](https://github.com/migdlp/opinion-social-media/issues/243). **Este documento es planificación:** los tickets nuevos están pendientes; no se han implementado ni desplegado sus funciones. No se asignan responsables, fechas ni sprints. Estimaciones relativas: S ≈ 0,5 día; M ≈ 1–2 días, no compromisos.

## Qué existe y qué falta

- El tema sigue el sistema (V2-017 [#120](https://github.com/migdlp/opinion-social-media/issues/120) completada). Falta el selector manual; no reabrir el trabajo anterior para fingir que ya lo incluía.
- `/settings` tiene una tarea base **V2-008 [#129](https://github.com/migdlp/opinion-social-media/issues/129) en progreso**, reservada a `claude-code (session_01M3nCEPMNmMFSsQ51LoWr8t)`. SETTINGS-001 organiza las ampliaciones y conserva esa reserva; DESIGN-004 [#190](https://github.com/migdlp/opinion-social-media/issues/190) mantiene su adaptación visual.
- D-017 define «amigos» como **seguidores aceptados**. No se crea otra relación de amistad.
- La privacidad actual de votos depende del perfil. Falta un control independiente que permita ocultar el historial incluso a los seguidores. Afecta también a la existencia de filas y metadatos del historial, no sólo al texto de la opción.
- El avatar actual son iniciales. Se añaden dos entregas: catálogo de iconos y, después, fotos con backend seguro; nunca importar automáticamente la foto de Google.
- El menú de cuenta ya responde al disparador y Escape; falta cerrarlo al tocar fuera/salir con Tab/navegar, sin bloquear otras acciones.
- Faltan inventario y requisitos legales verificables. Crear páginas no prueba por sí solo cumplimiento; no inventar identidad del responsable, contratos, plazos ni consentimiento.

## Prioridad y orden de ejecución

**P0:** privacidad, base de ajustes y requisitos legales para consolidar la siguiente versión. PRIV-001 y LEGAL-001 pueden desarrollarse de forma independiente; la interfaz PRIV-002 espera a su backend y a la base de ajustes. LEGAL-002/003/004 usan el inventario y los datos/revisión del responsable.

**P1:** mejoras de uso y personalización. BUG-004 y DESIGN-013 son independientes y pequeños; avatares empiezan por iconos y después almacenamiento/subida. No esperar a fotos para entregar iconos. El selector de tema debe funcionar también para visitantes, sin esperar a todos los ajustes.

Las dependencias de **coordinación** no implican esperar a todas las ampliaciones: SETTINGS-001 no depende de que ya existan fotos/tema/historial, y PRIV-001 no depende del frontend. LEGAL-004 se resuelve sin banner si sólo hay almacenamiento necesario y queda probado/documentado.

| ID / issue | Trabajo | Prioridad | Tamaño | Dependencias |
|---|---|---|---|---|
| [SETTINGS-001](https://github.com/migdlp/opinion-social-media/issues/248) | Organizar Ajustes por Perfil, Apariencia, Privacidad y Cuenta | P0 | S | V2-008 [#129](https://github.com/migdlp/opinion-social-media/issues/129) (en progreso; conservar su responsable); DESIGN-004 [#190](https://github.com/migdlp/opinion-social-media/issues/190) (coordinar acabado visual) |
| [PRIV-001](https://github.com/migdlp/opinion-social-media/issues/249) | Proteger en backend la audiencia del historial de votos | P0 | M | V2-005 [#128](https://github.com/migdlp/opinion-social-media/issues/128) y V2-007 [#132](https://github.com/migdlp/opinion-social-media/issues/132) (completadas) |
| [PRIV-002](https://github.com/migdlp/opinion-social-media/issues/254) | Elegir desde Ajustes quién puede ver las encuestas que voto | P0 | M | PRIV-001 [#249](https://github.com/migdlp/opinion-social-media/issues/249); SETTINGS-001 [#248](https://github.com/migdlp/opinion-social-media/issues/248); V2-008 [#129](https://github.com/migdlp/opinion-social-media/issues/129) (respetar reserva) |
| [LEGAL-001](https://github.com/migdlp/opinion-social-media/issues/244) | Inventariar tratamientos, cookies y datos necesarios para los textos legales | P0 | S | — |
| [LEGAL-002](https://github.com/migdlp/opinion-social-media/issues/251) | Publicar aviso legal, privacidad, condiciones y política de cookies | P0 | M | LEGAL-001 [#244](https://github.com/migdlp/opinion-social-media/issues/244) y datos reales/revisión del responsable |
| [LEGAL-003](https://github.com/migdlp/opinion-social-media/issues/250) | Definir derechos de usuarios, conservación y procedimiento de borrado | P0 | M | LEGAL-001 [#244](https://github.com/migdlp/opinion-social-media/issues/244) |
| [LEGAL-004](https://github.com/migdlp/opinion-social-media/issues/253) | Aplicar información y consentimiento de cookies según el inventario | P0 | M | LEGAL-001 [#244](https://github.com/migdlp/opinion-social-media/issues/244) (inventario); LEGAL-002 [#251](https://github.com/migdlp/opinion-social-media/issues/251) (enlace a política) |
| [BUG-004](https://github.com/migdlp/opinion-social-media/issues/246) | Cerrar el menú de cuenta al pulsar fuera | P1 | S | — |
| [DESIGN-013](https://github.com/migdlp/opinion-social-media/issues/245) | Añadir selector visible Claro / Oscuro / Sistema | P1 | M | V2-017 [#120](https://github.com/migdlp/opinion-social-media/issues/120) (completada) |
| [AVATAR-001](https://github.com/migdlp/opinion-social-media/issues/247) | Elegir un icono predeterminado como imagen de perfil | P1 | M | V2-001 [#115](https://github.com/migdlp/opinion-social-media/issues/115) (completada); V2-008 [#129](https://github.com/migdlp/opinion-social-media/issues/129) (coordinación) |
| [AVATAR-002](https://github.com/migdlp/opinion-social-media/issues/252) | Preparar subida segura y almacenamiento de fotos de perfil | P1 | M | AVATAR-001 [#247](https://github.com/migdlp/opinion-social-media/issues/247) (contrato común icono/foto/iniciales) |
| [AVATAR-003](https://github.com/migdlp/opinion-social-media/issues/255) | Subir, previsualizar, reemplazar y quitar una foto desde Ajustes | P1 | M | AVATAR-002 [#252](https://github.com/migdlp/opinion-social-media/issues/252); AVATAR-001 [#247](https://github.com/migdlp/opinion-social-media/issues/247); SETTINGS-001 [#248](https://github.com/migdlp/opinion-social-media/issues/248); LEGAL-002 [#251](https://github.com/migdlp/opinion-social-media/issues/251) (información sobre foto y su visibilidad) |

## Decisiones y supuestos explícitos

1. Claro / Oscuro / Sistema con persistencia local, sin login ni tabla de preferencias para algo puramente visual. Sin preferencia se sigue el sistema; la elección manual prevalece sobre la media query y las variantes `dark:`. Evitar destellos y errores de hidratación.
2. Preferencia de votos: **Solo yo / Seguidores aceptados / Según privacidad de la cuenta**. La propuesta conservadora del planificador es iniciar en Solo yo; PRIV-001 debe documentar y revisar la migración de cuentas existentes antes del SQL. La nueva preferencia nunca amplía los límites del perfil ni de la encuesta. Elegir «Según privacidad» conserva el comportamiento existente, explicado sin ambigüedad.
3. Ocultar actividad no elimina votos ni altera los agregados anónimos. Siguen las reglas de abiertas/cerradas y P-1 para mostrar la opción ajena. No mostrar identidades de votantes desde resultados.
4. Fotos: JPEG/PNG/WebP estáticos, hasta 2 MiB, normalización a un máximo de 512 px, eliminación de EXIF/GPS y validación real de contenido. Documentar visibilidad antes de subir; propietario de cada objeto y límites de Storage verificados. Son decisiones de implementación sencillas y revisables, sin activar infraestructura durante esta planificación.
5. Legal: inventariar primero. Aviso legal, privacidad, condiciones y cookies usan datos reales revisados del responsable. Los derechos pueden atenderse con un procedimiento manual seguro y probado en esta fase; no anunciar un autoservicio inexistente. El consentimiento de funciones no esenciales se separa de la autenticación necesaria y de la aceptación de condiciones.

## Tickets ejecutables

### SETTINGS-001 — Organizar Ajustes por Perfil, Apariencia, Privacidad y Cuenta

- **Issue:** [#248](https://github.com/migdlp/opinion-social-media/issues/248) · **Prioridad:** P0 · **Estimación relativa:** S
- **Etiquetas:** `frontend`, `design`, `auth`, `testing`
- **Estado:** Pendiente · **Agente:** —
- **Dependencias:** V2-008 [#129](https://github.com/migdlp/opinion-social-media/issues/129) (en progreso; conservar su responsable); DESIGN-004 [#190](https://github.com/migdlp/opinion-social-media/issues/190) (coordinar acabado visual)

Ampliar la sección existente /settings en lugar de crear otra. Hacerla accesible desde menú de cuenta y perfil propio; agrupar los controles reales de identidad, apariencia, avatar y privacidad. Los controles adicionales se integran cuando sus tickets se implementen, sin botones inactivos ni promesas vacías.

**Criterios de aceptación:**

- [ ] Dado Mi perfil o el menú de cuenta, cuando se abre Ajustes, entonces se llega a la misma ruta protegida y se puede volver.
- [ ] Dado Ajustes, entonces los apartados y textos distinguen Cuenta privada de Quién puede ver mis votos; cambiar una opción no modifica la otra.
- [ ] Dada ausencia de sesión, entonces se inicia el retorno autenticado a /settings, manteniendo los contratos de V2-008.
- [ ] Dado guardado/carga/error/cambios pendientes, entonces hay feedback accesible, valores persistidos y recuperación sin perder los datos introducidos.
- [ ] TDD/E2E móvil/escritorio; conservar nombre/@usuario y las RPC existentes. No tomar ni cerrar V2-008, reservada por otra IA.

### PRIV-001 — Proteger en backend la audiencia del historial de votos

- **Issue:** [#249](https://github.com/migdlp/opinion-social-media/issues/249) · **Prioridad:** P0 · **Estimación relativa:** M
- **Etiquetas:** `backend`, `database`, `security`, `testing`
- **Estado:** Pendiente · **Agente:** —
- **Dependencias:** V2-005 [#128](https://github.com/migdlp/opinion-social-media/issues/128) y V2-007 [#132](https://github.com/migdlp/opinion-social-media/issues/132) (completadas)

Añadir una preferencia independiente de la privacidad de cuenta: Solo yo / Seguidores aceptados / Según privacidad de la cuenta. En este proyecto amigos significa seguidores aceptados (D-017), no una relación nueva. Propuesta de valor inicial conservador: Solo yo; documentar migración de cuentas existentes y revisión del contrato antes de aplicar SQL. La audiencia elegida sólo restringe: nunca amplía los permisos de una cuenta privada ni los de la encuesta.

**Criterios de aceptación:**

- [ ] Dado Solo yo, entonces nadie salvo el titular obtiene encuestas votadas, elección ni metadatos derivados del historial, incluso si es seguidor aceptado o el perfil es público.
- [ ] Dado Seguidores aceptados, entonces sólo self/seguidores aceptados acceden; anónimos, extraños y solicitudes pendientes/rechazadas no acceden. Según privacidad conserva los límites de la cuenta.
- [ ] Dado un cambio o retirada de seguimiento, entonces APIs/RPC, RLS, HTML, RSC, caché/prefetch y listas se ajustan sin filtrar datos ya ocultos a futuras peticiones.
- [ ] La preferencia no modifica el voto, no elimina votos ni los excluye del agregado anónimo; los resultados de abiertas siguen ocultos hasta votar y nunca se entregan identidades de votantes.
- [ ] La opción individual ajena mantiene P-1: sólo se revela si el visitante votó esa encuesta o está cerrada, además de superar las nuevas comprobaciones de audiencia.
- [ ] Migración/tipos/contratos y pruebas SQL/HTTP cubren matriz público/privado × audiencias × relaciones y cambio de permisos; escritura sólo por el titular, sin claves privilegiadas en navegador.

### PRIV-002 — Elegir desde Ajustes quién puede ver las encuestas que voto

- **Issue:** [#254](https://github.com/migdlp/opinion-social-media/issues/254) · **Prioridad:** P0 · **Estimación relativa:** M
- **Etiquetas:** `frontend`, `auth`, `design`, `testing`
- **Estado:** Pendiente · **Agente:** —
- **Dependencias:** PRIV-001 [#249](https://github.com/migdlp/opinion-social-media/issues/249); SETTINGS-001 [#248](https://github.com/migdlp/opinion-social-media/issues/248); V2-008 [#129](https://github.com/migdlp/opinion-social-media/issues/129) (respetar reserva)

Añadir un control de privacidad del historial de votos separado de Cuenta privada. Permitir Solo yo / Seguidores aceptados / Según privacidad de la cuenta, con una explicación de quién ve la actividad en cada caso. Mostrar la preferencia real del backend y su estado de guardado. No cambiarla al alternar la privacidad del perfil.

**Criterios de aceptación:**

- [ ] Dado Solo yo, cuando un amigo/seguidor abre mi perfil, entonces no ve qué encuestas he votado ni mi opción; yo sigo viendo mi historial.
- [ ] Dado un cambio de audiencia guardado, entonces persiste entre sesiones/dispositivos y se refleja al volver al perfil; un error conserva el valor anterior con un mensaje recuperable.
- [ ] La pantalla explica que ocultar el historial no retira votos ni cambia agregados anónimos; no promete resultados de abiertas antes de votar.
- [ ] El perfil ajeno muestra un estado de historial privado comprensible sin pedir datos ocultos al cliente; comprobar también caché, navegación atrás, recarga y peticiones directas.
- [ ] Selector etiquetado y usable con teclado/lector; pruebas de usuario propio, seguidor aceptado, pendiente y extraño, perfiles público/privado y cada audiencia.
- [ ] Documentar valor inicial/migración elegidos en PRIV-001; sin controles decorativos ni cambios de permisos exclusivamente en frontend.

### LEGAL-001 — Inventariar tratamientos, cookies y datos necesarios para los textos legales

- **Issue:** [#244](https://github.com/migdlp/opinion-social-media/issues/244) · **Prioridad:** P0 · **Estimación relativa:** S
- **Etiquetas:** `security`, `auth`
- **Estado:** Pendiente · **Agente:** —
- **Dependencias:** Ninguna

Preparar el inventario real de la app y la información del responsable para redactar aviso legal, privacidad, condiciones y cookies. Registrar como pendiente cualquier dato que deba aportar el titular; no inventar identidad, contacto, bases jurídicas, transferencias ni plazos.

**Criterios de aceptación:**

- [ ] Inventario cubre cuenta Google/Supabase, perfil, seguimientos, votos/historial, denuncias, logs, fotos futuras, finalidades, base jurídica propuesta, destinatarios, ubicación/transferencias y conservación.
- [ ] Cookies/localStorage/sessionStorage identificados con finalidad, proveedor y duración real; separar autenticación/tema imprescindibles de cualquier función no esencial.
- [ ] Checklist concreta de datos del responsable y revisión de aplicabilidad España/UE, requisitos de edad y condiciones de uso; decisiones pendientes con motivo y fuente, sin afirmar cumplimiento por crear una página.
- [ ] Se identifica un canal para derechos/consultas, proveedores y requisitos contractuales/configuraciones por revisar; sin publicar secretos ni datos del titular no facilitados.
- [ ] Entrega matriz revisable que alimenta LEGAL-002/003/004; no instalar analítica ni una plataforma de consentimiento como parte de la auditoría.

### LEGAL-002 — Publicar aviso legal, privacidad, condiciones y política de cookies

- **Issue:** [#251](https://github.com/migdlp/opinion-social-media/issues/251) · **Prioridad:** P0 · **Estimación relativa:** M
- **Etiquetas:** `frontend`, `auth`, `testing`
- **Estado:** Pendiente · **Agente:** —
- **Dependencias:** LEGAL-001 [#244](https://github.com/migdlp/opinion-social-media/issues/244) y datos reales/revisión del responsable

Preparar textos acordes a la app y rutas públicas /legal, /privacy, /terms y /cookies. Aviso legal y responsable; datos/finalidades/bases/destinatarios/conservación/derechos; normas de uso, moderación y contenido; cookies reales. Enlazar desde acceso, Ajustes y navegación secundaria sin recargar la barra móvil.

**Criterios de aceptación:**

- [ ] Todos los documentos son accesibles sin sesión, con enlaces visibles y utilizables en móvil/escritorio; no quedan páginas vacías, enlaces rotos ni placeholders en producción.
- [ ] Los textos se corresponden con Google, Supabase, Vercel, perfiles/seguidores, visibilidad de votos, denuncias y avatares realmente habilitados; explicar agregados y visibilidad sin prometer anonimato absoluto incorrecto.
- [ ] Datos del responsable, contacto, fechas/versiones y plazos están facilitados y revisados; si faltan, se registra el bloqueo de contenido y no se inventan ni se presenta el texto como aprobado.
- [ ] En acceso se ofrece información antes de continuar; las condiciones de uso y la base jurídica de cada tratamiento se distinguen de un consentimiento genérico. Si la revisión exige aceptación registrable, definir y probar versión/fecha antes de incorporarla.
- [ ] Lectura accesible, títulos/metadatos propios, foco y navegación, sin revelar sesiones ni datos personales en páginas públicas. Verificación de enlaces/contenido y E2E de acceso.

### LEGAL-003 — Definir derechos de usuarios, conservación y procedimiento de borrado

- **Issue:** [#250](https://github.com/migdlp/opinion-social-media/issues/250) · **Prioridad:** P0 · **Estimación relativa:** M
- **Etiquetas:** `backend`, `security`, `testing`
- **Estado:** Pendiente · **Agente:** —
- **Dependencias:** LEGAL-001 [#244](https://github.com/migdlp/opinion-social-media/issues/244)

Convertir la política de privacidad en un procedimiento operativo: canal verificable para solicitudes, comprobación proporcionada de identidad, acceso/rectificación/supresión y demás derechos aplicables, conservación de cuentas/votos/denuncias/logs/fotos y tratamiento de proveedores/copias. Puede ser un procedimiento manual seguro en esta fase; no inventar un autoservicio que no existe.

**Criterios de aceptación:**

- [ ] El canal publicado funciona y hay procedimiento del responsable para recibir, verificar, atender y registrar solicitudes con plazos aplicables, sin pedir contraseñas ni tokens por chat.
- [ ] Matriz de conservación justifica finalidad, plazo y borrado/anonimización de cada categoría, incluidas imágenes, objetos sustituidos y copias de proveedores; no prometer eliminación instantánea de backups si no está soportada.
- [ ] Definir qué ocurre con encuestas, votos, resultados agregados, relaciones e identidad al suprimir una cuenta, preservando integridad y obligaciones aplicables; probar el procedimiento en datos sintéticos aislados.
- [ ] Sólo el titular verificado o el administrador autorizado actúa; no revelar datos de terceros en una exportación ni ejecutar borrados de producción como parte de las pruebas.
- [ ] Guía y evidencias de ensayo registradas, coherentes con LEGAL-002 y las capacidades reales. Si se necesita automatización adicional, separarla en tickets concretos antes de afirmar que está disponible.

### LEGAL-004 — Aplicar información y consentimiento de cookies según el inventario

- **Issue:** [#253](https://github.com/migdlp/opinion-social-media/issues/253) · **Prioridad:** P0 · **Estimación relativa:** M
- **Etiquetas:** `frontend`, `auth`, `security`, `testing`
- **Estado:** Pendiente · **Agente:** —
- **Dependencias:** LEGAL-001 [#244](https://github.com/migdlp/opinion-social-media/issues/244) (inventario); LEGAL-002 [#251](https://github.com/migdlp/opinion-social-media/issues/251) (enlace a política)

Revisar cookies y almacenamiento del navegador. Si sólo existen mecanismos necesarios de autenticación y preferencia de tema, documentarlos sin añadir un banner de aceptación inútil. Si se detectan elementos no esenciales, bloquearlos hasta elección válida e implementar preferencias; no instalar analítica como parte de esta tarea.

**Criterios de aceptación:**

- [ ] Inventario identifica finalidad, proveedor y duración de lo que realmente se usa, incluido almacenamiento local; coincide con /cookies y se contrasta en navegador.
- [ ] Si sólo hay funciones necesarias, hay información accesible y justificación de por qué no se solicita consentimiento para ellas; ningún control finge desactivar la sesión obligatoria.
- [ ] Si hay funciones no esenciales, no se cargan antes de consentimiento; Rechazar y Aceptar son equivalentes en facilidad, sin opciones premarcadas ni patrones engañosos.
- [ ] Cuando proceda, preferencias granulares persistidas/versionadas y revocables desde Ajustes; retirar consentimiento impide futuras cargas y conserva el uso básico de la app.
- [ ] Pruebas de red/almacenamiento verifican primera visita, rechazo, aceptación, retirada y cambio de versión. Si no se requiere código, registrar verificación documental real y no inventar un ciclo TDD.

### BUG-004 — Cerrar el menú de cuenta al pulsar fuera

- **Issue:** [#246](https://github.com/migdlp/opinion-social-media/issues/246) · **Prioridad:** P1 · **Estimación relativa:** S
- **Etiquetas:** `frontend`, `design`, `testing`
- **Estado:** Pendiente · **Agente:** —
- **Dependencias:** Ninguna

Corregir AccountMenu: actualmente <details> sólo se cierra al activar el avatar o con Escape. Pulsar o tocar fuera debe cerrarlo sin bloquear la acción del elemento pulsado.

**Criterios de aceptación:**

- [ ] Dado el menú abierto, cuando se pulsa/toca fuera, entonces se cierra y el destino pulsado conserva su acción.
- [ ] Dado un clic dentro, entonces no se cierra antes de ejecutar Mi perfil/Ajustes/Solicitudes/Cerrar sesión; navegar cierra el menú.
- [ ] Dado Escape o salida de foco del conjunto con Tab, entonces se cierra; Escape devuelve foco al disparador y el clic exterior no roba foco.
- [ ] Dado el avatar, entonces comunica abierto/cerrado y sigue funcionando con teclado, lector de pantalla y táctil, sin listeners duplicados.
- [ ] TDD y E2E móvil/escritorio, ambos temas: fuera, dentro, Escape, Tab y navegación.

### DESIGN-013 — Añadir selector visible Claro / Oscuro / Sistema

- **Issue:** [#245](https://github.com/migdlp/opinion-social-media/issues/245) · **Prioridad:** P1 · **Estimación relativa:** M
- **Etiquetas:** `frontend`, `design`, `testing`
- **Estado:** Pendiente · **Agente:** —
- **Dependencias:** V2-017 [#120](https://github.com/migdlp/opinion-social-media/issues/120) (completada)

El tema actual sólo sigue prefers-color-scheme: no hay botón para elegir claro. Añadir control accesible y fácilmente encontrable en cabecera/menú de cuenta, también para visitantes, y reflejarlo en Ajustes. Reutilizar After Sunset; cambiar tema no requiere login ni llamadas de backend.

**Criterios de aceptación:**

- [ ] Dado el sistema oscuro, cuando se elige Claro, entonces todas las rutas se ven claras; Oscuro fuerza el caso inverso y Sistema vuelve a la preferencia del dispositivo.
- [ ] Dada una elección, entonces persiste al recargar/navegar; sin preferencia guardada se usa Sistema, sin destello incorrecto ni desajuste SSR/hidratación.
- [ ] Dado Sistema, cuando cambia la preferencia del dispositivo, entonces la interfaz se actualiza; una elección manual permanece estable.
- [ ] Dado almacenamiento no disponible, entonces el control funciona en la sesión sin romper la página.
- [ ] Control con nombre y estado seleccionados, teclado, foco, 44 px; contraste, opciones, barras, menús y formularios coherentes en 320/390/1280. TDD/E2E incluyen persistencia y acceso anónimo.

### AVATAR-001 — Elegir un icono predeterminado como imagen de perfil

- **Issue:** [#247](https://github.com/migdlp/opinion-social-media/issues/247) · **Prioridad:** P1 · **Estimación relativa:** M
- **Etiquetas:** `frontend`, `backend`, `database`, `design`, `testing`
- **Estado:** Pendiente · **Agente:** —
- **Dependencias:** V2-001 [#115](https://github.com/migdlp/opinion-social-media/issues/115) (completada); V2-008 [#129](https://github.com/migdlp/opinion-social-media/issues/129) (coordinación)

Ofrecer un pequeño catálogo de iconos propios de la misma familia visual, con selección y vista previa en Ajustes. Guardar sólo un identificador permitido; conservar iniciales como alternativa. No importar la foto de Google automáticamente. Esta tarea ya ofrece personalización sin esperar a Storage.

**Criterios de aceptación:**

- [ ] Dado un usuario, cuando elige un icono y guarda, entonces aparece de forma consistente en cabecera, perfil y autoría donde exista avatar, también tras recargar y en otro dispositivo.
- [ ] Dado iniciales o un icono distinto, entonces puede cambiar/restablecer su elección con feedback y sin modificar nombre/@usuario.
- [ ] Dado un identificador ajeno al catálogo o una actualización del perfil de otra cuenta, entonces el backend la rechaza.
- [ ] Los activos tienen procedencia/licencia registrada, buen contraste, tamaño estable, nombre accesible y selector de teclado; no se añaden imágenes decorativas que aparenten acciones.
- [ ] Migración/tipos/RPC y TDD verifican persistencia, autorización y fallback; no exponer email, foto de Google ni datos privados.

### AVATAR-002 — Preparar subida segura y almacenamiento de fotos de perfil

- **Issue:** [#252](https://github.com/migdlp/opinion-social-media/issues/252) · **Prioridad:** P1 · **Estimación relativa:** M
- **Etiquetas:** `backend`, `database`, `security`, `testing`
- **Estado:** Pendiente · **Agente:** —
- **Dependencias:** AVATAR-001 [#247](https://github.com/migdlp/opinion-social-media/issues/247) (contrato común icono/foto/iniciales)

Implementar el backend y las políticas de Storage para fotos elegidas expresamente por el usuario. Usar los proyectos Supabase existentes y migraciones/configuración reproducibles; no crear proyectos de sustitución. Definir lectura coherente con la cabecera del perfil y explicar si el avatar es público antes de subirlo. No reutilizar ni publicar automáticamente la foto de Google.

**Criterios de aceptación:**

- [ ] Sólo el titular con sesión puede subir/asociar/reemplazar/borrar su avatar; otro usuario no puede escribir rutas ni asociar objetos ajenos, tampoco mediante llamadas directas.
- [ ] Aceptar JPEG/PNG/WebP estáticos hasta 2 MiB; validar contenido real, decodificación y límites de dimensiones, no sólo extensión/MIME del navegador. Rechazar SVG, contenido activo, archivos falsos y animaciones no soportadas.
- [ ] Normalizar a un tamaño máximo razonable (512 px), eliminar EXIF/GPS y nombres personales; rutas no predecibles dentro del espacio autorizado del titular.
- [ ] Lectura y URLs respetan la política documentada; sin listado global de archivos ni claves administrativas expuestas. Revisar caché y retirada/reemplazo de imágenes.
- [ ] Un fallo entre subir y guardar mantiene el avatar anterior; limpiar objetos huérfanos/reemplazados de forma controlada, sin borrar objetos de otros usuarios.
- [ ] Tests reales de Storage/autorización y casos corruptos, exceso de tamaño, sustitución concurrente y borrado; documentar cuotas/coste/configuración y fallo recuperable.

### AVATAR-003 — Subir, previsualizar, reemplazar y quitar una foto desde Ajustes

- **Issue:** [#255](https://github.com/migdlp/opinion-social-media/issues/255) · **Prioridad:** P1 · **Estimación relativa:** M
- **Etiquetas:** `frontend`, `auth`, `design`, `testing`
- **Estado:** Pendiente · **Agente:** —
- **Dependencias:** AVATAR-002 [#252](https://github.com/migdlp/opinion-social-media/issues/252); AVATAR-001 [#247](https://github.com/migdlp/opinion-social-media/issues/247); SETTINGS-001 [#248](https://github.com/migdlp/opinion-social-media/issues/248); LEGAL-002 [#251](https://github.com/migdlp/opinion-social-media/issues/251) (información sobre foto y su visibilidad)

Integrar en Perfil/Ajustes la alternativa de subir una foto, junto a iconos e iniciales. Usar exclusivamente el backend autorizado de AVATAR-002. Mostrar formatos/tamaño, vista previa, quién podrá verla y cómo quitarla, sin importar fotos de Google.

**Criterios de aceptación:**

- [ ] Dado un archivo válido, entonces se previsualiza y sólo se publica tras confirmar; guardar actualiza cabecera/perfil y donde haya avatar sin desajustes de tamaño ni depender del dispositivo actual.
- [ ] Dado cancelar o fallo de red/subida/guardado, entonces se conserva el avatar anterior y se puede reintentar sin perder el contexto.
- [ ] Dado formato, tamaño o contenido inválidos, entonces se explica el error; las validaciones del cliente no sustituyen las del backend.
- [ ] Se puede reemplazar o quitar la foto y volver a iniciales o a un icono; no quedan enlaces que expongan objetos eliminados como avatar activo.
- [ ] La visibilidad y el tratamiento se explican antes de confirmar; controles accesibles de 44 px, selección de archivo móvil/escritorio y mensajes de progreso/error.
- [ ] E2E con Storage local y permisos reales, sesiones distintas, cambios concurrentes/fallos y ambos temas; no subir imágenes de prueba a producción.

## Cobertura de la petición

| Petición | Tickets |
|---|---|
| Poder activar modo claro con un botón | DESIGN-013 |
| Elegir iconos de perfil | AVATAR-001 |
| Subir una foto propia | AVATAR-002 + AVATAR-003 |
| Sección de ajustes con varias opciones | V2-008 existente + SETTINGS-001; integración de los controles anteriores |
| Decidir si amigos ven qué encuestas voto | PRIV-001 + PRIV-002; amigos = seguidores aceptados |
| Cerrar menú pulsando fuera | BUG-004 |
| Bases legales y derechos | LEGAL-001 a LEGAL-004 |

## Comprobaciones y coordinación

Cada implementación con código exige TDD y las pruebas de su ticket; datos/Storage se prueban en entornos locales aislados y nunca con archivos o votos de prueba en producción. Las tareas con esquema o políticas exigen migraciones/tipos y comprobaciones por HTTP/RLS, no sólo capturas. La apariencia conserva After Sunset, accesibilidad, estados de error y móvil desde 320 px.

DOC-010 verifica únicamente coherencia documental, enlaces, ausencia de IDs duplicados y cobertura de la petición. No atribuye ciclos TDD ni resultados de aplicación a esta ampliación documental. Comunicar al responsable de V2-008 y a todas las IAs por #73. Las nuevas funciones requieren futuras reservas/PR; esta petición no pide implementarlas ni desplegar ahora.
