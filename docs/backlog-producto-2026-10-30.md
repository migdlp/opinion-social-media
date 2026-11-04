# Backlog de producto — peticiones del 30-10-2026

Origen: petición y aclaración del propietario; [DOC-011 #275](https://github.com/migdlp/opinion-social-media/issues/275). **22 tickets nuevos de implementación/definición/calidad**, organizados en las épicas existentes. Iconos de perfil reutilizan AVATAR-001; su activación ya está en OPS-003 → REL-003. No duplicar ni reabrir tareas históricas completadas.

Estados y reservas reales: [tareas-futuras.md](tareas-futuras.md) en main. Aquí se conserva el plan inicial; todos los tickets nuevos nacen Pendiente y Agente —. Estimaciones relativas S ≈ 0,5 día, M ≈ 1 día, L ≈ 2 días, sin responsables, sprints ni fechas comprometidas. [JSON](tareas-producto-2026-10-30.json) y [CSV](tareas-producto-2026-10-30.csv) importables.

## Decisiones y límites

- **D-032:** Claro por defecto, sin consultar el tema del dispositivo para decidir el inicial. Un icono alterna Claro ↔ Oscuro; sin desplegable ni Sistema en el control. Una elección manual Oscuro previa se conserva. La ausencia/valor heredado Sistema se interpreta como Claro.
- **D-033:** Recientes por defecto con y sin sesión, también si ya se sigue a personas. Siguiendo continúa disponible al elegirlo explícitamente; sustituye sólo el default de D-022.
- **D-034:** quitar el botón Sí/No. Dos inputs vacíos con esos placeholders; ocultarlos al enfocar. Sólo si ambos campos iniciales siguen vacíos al publicar se guardan Sí/No reales. Una opción personalizada + otra vacía o tres o más incompletas sigue siendo error. La RPC no acepta strings vacíos arbitrarios.
- **D-035:** comparación de fotos está solicitada. Respuesta múltiple y ranking de mayor a menor son candidatos que el propietario quiere pensar mejor: POLL-001 cierra el contrato y genera tareas concretas para los que se aprueben. No se programa un motor de formatos ni se asume una fórmula de ranking.
- **D-036:** comentarios opcionales por encuesta, apagados inicialmente (supuesto sencillo y conservador). El autor puede cambiar sólo este flag tras publicar. Debate plano; lectura/escritura de abiertas exige voto previo, y en cerradas respeta visibilidad. No se añaden hilos, likes, realtime ni adjuntos a comentarios. Apagar conserva comentarios ocultos, no los borra.
- **D-037:** formato de comparación de fotos con voto único, 2–6 alternativas y alt/rótulo accesible; imágenes JPEG/PNG/WebP procesadas, permisos y límites. No abre por sí solo vídeos u otras modalidades.
- **D-038:** bloquear personas y denunciarlas son acciones independientes. Bloqueo entre cuentas autenticadas impide interacción/visibilidad en ambos sentidos y elimina seguimiento/solicitudes, sin borrar votos. Desbloquear no reconstruye relaciones. Contenido público puede seguir visible sin sesión.
- **D-039:** descripción opcional de perfil, texto plano de hasta 280 caracteres; no añadir teléfono/ubicación/otros campos no solicitados. En cuentas privadas sólo se entrega a titular/seguidores aceptados.
- **D-040/D-041/D-042:** alinear tarjetas de cada fila de escritorio; seguir directamente a una cuenta pública es correcto y las privadas deben pedir aceptación; añadir buscador de preguntas con lupa móvil.

Los límites menores (comentarios apagados, bio 280, medios 5 MiB y 40 cargas/h) son decisiones iniciales de simplicidad/seguridad, visibles en tickets y corregibles por el propietario. No rebajan la regla de resultados ni las audiencias de historial. Comentarios voluntarios no quedan ocultos por desactivar la visibilidad del historial. Las migraciones, Auth/Storage y Vercel sólo se ejecutan en tareas autorizadas; esta planificación no cambia producción.

## Áreas / labs y catálogo

Etiquetas reales creadas: `area:apariencia`, `area:feed`, `area:encuestas`, `area:busqueda`, `area:comentarios`, `area:moderacion` y `area:perfil`. Cada ticket conserva además frontend/backend/database/security/auth/testing/devops/design según corresponda y P0/P1. Los enlaces de épica y dependencias permiten navegar entre tareas.

| Ticket | Área / épica | Prioridad | Tamaño | Dependencias |
|---|---|---|---|---|
| [DESIGN-014](https://github.com/migdlp/opinion-social-media/issues/276) — Claro por defecto y cambio de tema con un único icono | apariencia · [épica #111](https://github.com/migdlp/opinion-social-media/issues/111) | P0 | M | [#245](https://github.com/migdlp/opinion-social-media/issues/245), [#248](https://github.com/migdlp/opinion-social-media/issues/248) |
| [FEED-001](https://github.com/migdlp/opinion-social-media/issues/277) — Entrar por defecto en Recientes para todas las cuentas | feed · [épica #113](https://github.com/migdlp/opinion-social-media/issues/113) | P0 | S | [#179](https://github.com/migdlp/opinion-social-media/issues/179) |
| [CREATE-001](https://github.com/migdlp/opinion-social-media/issues/278) — Opciones Sí/No como ejemplo y valores de reserva, sin botón de plantilla | encuestas · [épica #110](https://github.com/migdlp/opinion-social-media/issues/110) | P0 | M | [#116](https://github.com/migdlp/opinion-social-media/issues/116), [#117](https://github.com/migdlp/opinion-social-media/issues/117) |
| [DESIGN-015](https://github.com/migdlp/opinion-social-media/issues/279) — Alinear tarjetas y controles del feed en escritorio con alturas de contenido distintas | feed · [épica #111](https://github.com/migdlp/opinion-social-media/issues/111) | P0 | M | [#239](https://github.com/migdlp/opinion-social-media/issues/239) |
| [BUG-005](https://github.com/migdlp/opinion-social-media/issues/280) — Verificar seguir directamente cuentas públicas y solicitar acceso a las privadas | perfil · [épica #109](https://github.com/migdlp/opinion-social-media/issues/109) | P0 | M | [#126](https://github.com/migdlp/opinion-social-media/issues/126), [#138](https://github.com/migdlp/opinion-social-media/issues/138), [#129](https://github.com/migdlp/opinion-social-media/issues/129) |
| [POLL-001](https://github.com/migdlp/opinion-social-media/issues/281) — Definir el catálogo de nuevos tipos y evaluar respuesta múltiple y ranking | encuestas · [épica #110](https://github.com/migdlp/opinion-social-media/issues/110) | P1 | M | — |
| [SOCIAL-001](https://github.com/migdlp/opinion-social-media/issues/282) — Bloqueo de personas impuesto en base de datos y consultas | moderacion · [épica #109](https://github.com/migdlp/opinion-social-media/issues/109) | P1 | L | [#128](https://github.com/migdlp/opinion-social-media/issues/128), [#249](https://github.com/migdlp/opinion-social-media/issues/249) |
| [SEARCH-001](https://github.com/migdlp/opinion-social-media/issues/283) — Búsqueda de encuestas por pregunta con paginación y permisos | busqueda · [épica #113](https://github.com/migdlp/opinion-social-media/issues/113) | P1 | M | [SOCIAL-001](https://github.com/migdlp/opinion-social-media/issues/282) |
| [SEARCH-002](https://github.com/migdlp/opinion-social-media/issues/284) — Pantalla de búsqueda y lupa en la navegación móvil | busqueda · [épica #113](https://github.com/migdlp/opinion-social-media/issues/113) | P1 | M | [SEARCH-001](https://github.com/migdlp/opinion-social-media/issues/283) |
| [CMT-001](https://github.com/migdlp/opinion-social-media/issues/285) — Backend de comentarios y habilitación por encuesta | comentarios · [épica #112](https://github.com/migdlp/opinion-social-media/issues/112) | P1 | L | [SOCIAL-001](https://github.com/migdlp/opinion-social-media/issues/282) |
| [CMT-003](https://github.com/migdlp/opinion-social-media/issues/286) — Denuncia y moderación mínima de comentarios | comentarios · [épica #112](https://github.com/migdlp/opinion-social-media/issues/112) | P1 | M | [CMT-001](https://github.com/migdlp/opinion-social-media/issues/285) |
| [CMT-002](https://github.com/migdlp/opinion-social-media/issues/287) — Controles de comentarios y debate en el detalle | comentarios · [épica #112](https://github.com/migdlp/opinion-social-media/issues/112) | P1 | L | [CMT-001](https://github.com/migdlp/opinion-social-media/issues/285), [CMT-003](https://github.com/migdlp/opinion-social-media/issues/286) |
| [MEDIA-001](https://github.com/migdlp/opinion-social-media/issues/288) — Contrato y esquema de encuestas para comparar fotos | encuestas · [épica #110](https://github.com/migdlp/opinion-social-media/issues/110) | P1 | M | [POLL-001](https://github.com/migdlp/opinion-social-media/issues/281), [SOCIAL-001](https://github.com/migdlp/opinion-social-media/issues/282) |
| [MEDIA-002](https://github.com/migdlp/opinion-social-media/issues/289) — Subida y lectura segura de fotos de encuestas | encuestas · [épica #110](https://github.com/migdlp/opinion-social-media/issues/110) | P1 | L | [MEDIA-001](https://github.com/migdlp/opinion-social-media/issues/288) |
| [MEDIA-003](https://github.com/migdlp/opinion-social-media/issues/290) — Crear, comparar y votar encuestas con fotos | encuestas · [épica #110](https://github.com/migdlp/opinion-social-media/issues/110) | P1 | L | [MEDIA-001](https://github.com/migdlp/opinion-social-media/issues/288), [MEDIA-002](https://github.com/migdlp/opinion-social-media/issues/289) |
| [SOCIAL-002](https://github.com/migdlp/opinion-social-media/issues/291) — Bloquear, desbloquear y gestionar la lista propia desde la interfaz | moderacion · [épica #109](https://github.com/migdlp/opinion-social-media/issues/109) | P1 | M | [SOCIAL-001](https://github.com/migdlp/opinion-social-media/issues/282) |
| [MOD-001](https://github.com/migdlp/opinion-social-media/issues/292) — Backend para denunciar personas y revisión administrativa mínima | moderacion · [épica #112](https://github.com/migdlp/opinion-social-media/issues/112) | P1 | M | [#122](https://github.com/migdlp/opinion-social-media/issues/122) |
| [MOD-002](https://github.com/migdlp/opinion-social-media/issues/293) — Acción Denunciar persona en perfiles y menús | moderacion · [épica #112](https://github.com/migdlp/opinion-social-media/issues/112) | P1 | M | [MOD-001](https://github.com/migdlp/opinion-social-media/issues/292), [SOCIAL-002](https://github.com/migdlp/opinion-social-media/issues/291) |
| [PROFILE-001](https://github.com/migdlp/opinion-social-media/issues/294) — Descripción de perfil opcional con validación y permisos | perfil · [épica #109](https://github.com/migdlp/opinion-social-media/issues/109) | P1 | M | [#247](https://github.com/migdlp/opinion-social-media/issues/247) |
| [PROFILE-002](https://github.com/migdlp/opinion-social-media/issues/295) — Editar y mostrar descripción del perfil desde Ajustes | perfil · [épica #109](https://github.com/migdlp/opinion-social-media/issues/109) | P1 | M | [PROFILE-001](https://github.com/migdlp/opinion-social-media/issues/294), [#248](https://github.com/migdlp/opinion-social-media/issues/248) |
| [QA-001](https://github.com/migdlp/opinion-social-media/issues/296) — Regresión de privacidad y convivencia para los nuevos módulos | calidad/publicación · [épica #114](https://github.com/migdlp/opinion-social-media/issues/114) | P0 | L | [SOCIAL-001](https://github.com/migdlp/opinion-social-media/issues/282), [SEARCH-001](https://github.com/migdlp/opinion-social-media/issues/283), [CMT-001](https://github.com/migdlp/opinion-social-media/issues/285), [MEDIA-002](https://github.com/migdlp/opinion-social-media/issues/289), [PROFILE-001](https://github.com/migdlp/opinion-social-media/issues/294) |
| [REL-004](https://github.com/migdlp/opinion-social-media/issues/297) — Publicar los nuevos módulos por lotes con esquema y checklist compatibles | calidad/publicación · [épica #5](https://github.com/migdlp/opinion-social-media/issues/5) | P0 | M | [#273](https://github.com/migdlp/opinion-social-media/issues/273) |

## Orden recomendado y paralelismo

1. **P0 independientes:** DESIGN-014, FEED-001, CREATE-001, DESIGN-015 y BUG-005. Revisar los defaults nuevos antes de ampliar otras pantallas. Coordinar cambios de tema/grid/formulario con las reservas vigentes; no tocar código de PERF-001 o AUTH-001 ocupado por otra IA.
2. **Iconos ya implementados:** terminar OPS-003 #272 y REL-003 #273; incluyen 26/27 y activación de AVATAR-001 #247. No crear otro selector de avatar.
3. **Definición y fundamentos P1:** POLL-001 evalúa nuevos formatos; SOCIAL-001 incorpora acceso con bloqueos; MOD-001 y PROFILE-001 pueden avanzar de forma independiente.
4. **Módulos P1:** búsqueda, comentarios y fotos se apoyan en autorización con bloqueos; backend/UI pueden trabajar con contratos/mocks en paralelo, pero el ticket integrado no se cierra sin backend y pruebas. CMT-003 precede a la activación pública del debate.
5. **Calidad/publicación P0:** QA-001 prepara matriz mientras se construye y cierra con los módulos. REL-004 publica lotes terminados con su regresión aplicable, sin esperar todo el catálogo; no espera el cierre global de QA-001 para mejoras independientes ya verificadas.

P0 es obligatorio para el lote funcional al que pertenece; las nuevas mejoras P1 no bloquean que se publiquen antes defaults/UX ya terminados. La petición actual es planificar: no implementar ni desplegar esta tanda.

## Matriz de cobertura de la petición

| Petición | Tickets / trabajo existente |
|---|---|
| Claro por defecto y sólo icono para alternar | [DESIGN-014](https://github.com/migdlp/opinion-social-media/issues/276) |
| Iconos de perfil | AVATAR-001 #247, implementada; OPS-003 #272 → REL-003 #273, activación pendiente; DESIGN-004 #190, acabado visual |
| Entrar siempre por defecto en Recientes | [FEED-001](https://github.com/migdlp/opinion-social-media/issues/277) |
| Más tipos de encuestas: varias respuestas y ordenar de mayor a menor como candidatos | [POLL-001](https://github.com/migdlp/opinion-social-media/issues/281) |
| Activar/desactivar comentarios y debatir | [CMT-001](https://github.com/migdlp/opinion-social-media/issues/285), [CMT-002](https://github.com/migdlp/opinion-social-media/issues/287), [CMT-003](https://github.com/migdlp/opinion-social-media/issues/286) |
| Quitar botón Sí/No, ejemplos discretos y reserva si ambos vacíos | [CREATE-001](https://github.com/migdlp/opinion-social-media/issues/278) |
| Buscador de encuestas | [SEARCH-001](https://github.com/migdlp/opinion-social-media/issues/283), [SEARCH-002](https://github.com/migdlp/opinion-social-media/issues/284) |
| Lupa de búsqueda abajo en móvil | [SEARCH-002](https://github.com/migdlp/opinion-social-media/issues/284) |
| Subir fotos a encuestas y compararlas | [MEDIA-001](https://github.com/migdlp/opinion-social-media/issues/288), [MEDIA-002](https://github.com/migdlp/opinion-social-media/issues/289), [MEDIA-003](https://github.com/migdlp/opinion-social-media/issues/290) |
| Tarjetas perfectamente alineadas en ordenador con diferente número de respuestas | [DESIGN-015](https://github.com/migdlp/opinion-social-media/issues/279) |
| Solicitudes sólo si la cuenta es privada | [BUG-005](https://github.com/migdlp/opinion-social-media/issues/280); regla D-017 conservada |
| Bloquear personas | [SOCIAL-001](https://github.com/migdlp/opinion-social-media/issues/282), [SOCIAL-002](https://github.com/migdlp/opinion-social-media/issues/291) |
| Denunciar personas además de encuestas | [MOD-001](https://github.com/migdlp/opinion-social-media/issues/292), [MOD-002](https://github.com/migdlp/opinion-social-media/issues/293) |
| Más personalización de perfil: descripción | [PROFILE-001](https://github.com/migdlp/opinion-social-media/issues/294), [PROFILE-002](https://github.com/migdlp/opinion-social-media/issues/295) |
| Seguridad, pruebas y publicación gradual de todo lo anterior | [QA-001](https://github.com/migdlp/opinion-social-media/issues/296), [REL-004](https://github.com/migdlp/opinion-social-media/issues/297) y aceptación de cada ticket |

## Tareas ejecutables

### DESIGN-014 — Claro por defecto y cambio de tema con un único icono

**Issue:** [#276](https://github.com/migdlp/opinion-social-media/issues/276) · **Épica:** [#111](https://github.com/migdlp/opinion-social-media/issues/111) · **Prioridad:** P0 · **Estimación relativa:** M

**Etiquetas:** `frontend`, `design`, `testing`, `area:apariencia`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Sustituir el desplegable por un botón de icono que alterne Claro ↔ Oscuro, en cabecera y donde se reutilice en Ajustes. Sin preferencia manual, usar Claro independientemente del dispositivo. Conservar una elección Oscuro explícita; las preferencias heredadas Sistema/ausentes pasan al default Claro. No duplicar estado ni claves.

**Dependencias:** [#245](https://github.com/migdlp/opinion-social-media/issues/245), [#248](https://github.com/migdlp/opinion-social-media/issues/248)

**Criterios de aceptación:**

- [ ] Dado un navegador nuevo con sistema oscuro, al abrir cualquier ruta aparece Claro desde el primer pintado, sin errores de hidratación.
- [ ] Dado el botón, un clic o Enter/Espacio alterna Claro/Oscuro, sin desplegable; etiqueta accesible indica la acción siguiente, foco y área mínima 44×44.
- [ ] Dada elección explícita, persiste al recargar/navegar y se sincroniza entre cabecera/Ajustes/pestañas; almacenamiento bloqueado funciona durante la visita.
- [ ] Dado ambos temas a 320/390/1280, controles, resultados y menús mantienen contraste y no desbordan. TDD y E2E de defaults/herencia/persistencia.

### FEED-001 — Entrar por defecto en Recientes para todas las cuentas

**Issue:** [#277](https://github.com/migdlp/opinion-social-media/issues/277) · **Épica:** [#113](https://github.com/migdlp/opinion-social-media/issues/113) · **Prioridad:** P0 · **Estimación relativa:** S

**Etiquetas:** `frontend`, `testing`, `area:feed`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Sustituir únicamente el default de D-022: al entrar sin pestaña explícita, tanto visitantes como usuarios con seguimientos abren Recientes. Mantener Siguiendo, filtros, navegación y privacidad; no redirigir una elección explícita a Recientes.

**Dependencias:** [#179](https://github.com/migdlp/opinion-social-media/issues/179)

**Criterios de aceptación:**

- [ ] Dado visitante o usuario con/sin seguidos, al abrir / sin tab se selecciona Recientes.
- [ ] Dado tab=siguiendo elegido o enlace explícito, se respeta Siguiendo y el estado vacío/autenticación vigente.
- [ ] Dado cambiar pestaña/categoría, atrás/adelante y retorno del login, URL y pestaña activa son coherentes; no se mezclan lotes del feed.
- [ ] TDD cubre los tres tipos de usuario y E2E confirma el default sin alterar seguridad ni orden cronológico.

### CREATE-001 — Opciones Sí/No como ejemplo y valores de reserva, sin botón de plantilla

**Issue:** [#278](https://github.com/migdlp/opinion-social-media/issues/278) · **Épica:** [#110](https://github.com/migdlp/opinion-social-media/issues/110) · **Prioridad:** P0 · **Estimación relativa:** M

**Etiquetas:** `frontend`, `backend`, `testing`, `area:encuestas`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Eliminar el botón que rellena Sí/No. Los dos campos iniciales están vacíos, con placeholders Sí y No que se ocultan al enfocar y reaparecen al salir vacíos. Si los dos siguen vacíos al publicar, guardar Sí/No reales. Si se personalizan, respetar lo escrito; no sustituir silenciosamente opciones incompletas.

**Dependencias:** [#116](https://github.com/migdlp/opinion-social-media/issues/116), [#117](https://github.com/migdlp/opinion-social-media/issues/117)

**Criterios de aceptación:**

- [ ] Dado formulario inicial, se ven ejemplos con estilo de placeholder y etiquetas Opción 1/2; al enfocar desaparece el ejemplo y no hay texto real que borrar.
- [ ] Dadas exactamente dos opciones iniciales vacías/espacios, publicar genera Sí y No explícitos y válidos; no se envían strings vacíos a create_poll.
- [ ] Dada una opción escrita y otra vacía, o tres o más campos incompletos, se muestran errores y no se inventan respuestas.
- [ ] Dado texto personalizado, trim/duplicados/2–6 opciones se validan también por el camino de servidor; la RPC sigue rechazando inserciones vacías directas.
- [ ] TDD/E2E cubren foco/blur, envío sin editar, ambas personalizadas, parcial inválida y ausencia del botón anterior.

### DESIGN-015 — Alinear tarjetas y controles del feed en escritorio con alturas de contenido distintas

**Issue:** [#279](https://github.com/migdlp/opinion-social-media/issues/279) · **Épica:** [#111](https://github.com/migdlp/opinion-social-media/issues/111) · **Prioridad:** P0 · **Estimación relativa:** M

**Etiquetas:** `frontend`, `design`, `testing`, `area:feed`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Revisar la cuadrícula de escritorio para que las tarjetas de cada fila y sus zonas comunes estén alineadas aunque tengan 2, 3 o 6 respuestas, preguntas largas o resultados. Igualar la estructura de fila al contenido mayor, conservando todas las opciones y una lectura natural; no recortar contenido ni inventar votos.

**Dependencias:** [#239](https://github.com/migdlp/opinion-social-media/issues/239)

**Criterios de aceptación:**

- [ ] Dadas tarjetas mixtas en una fila, sus bordes superior/inferior y acciones/pies comunes quedan alineados; pregunta y bloque de respuestas tienen anclajes coherentes.
- [ ] Dadas opciones/preguntas largas, todas siguen visibles y votables; no hay solapamientos, alturas rígidas que corten texto ni saltos al mostrar resultados.
- [ ] Dado móvil, conserva una columna y orden semántico/teclado. Capturas reales a 320/390/1024/1280, ambos temas y antes/después de votar.
- [ ] TDD o regresión visual de las cajas/posiciones con contenido real variable; definir tolerancia de 1 px para alineaciones de una misma fila.

### BUG-005 — Verificar seguir directamente cuentas públicas y solicitar acceso a las privadas

**Issue:** [#280](https://github.com/migdlp/opinion-social-media/issues/280) · **Épica:** [#109](https://github.com/migdlp/opinion-social-media/issues/109) · **Prioridad:** P0 · **Estimación relativa:** M

**Etiquetas:** `frontend`, `backend`, `security`, `testing`, `area:perfil`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Revisar la incidencia comunicada, sin dar por bug el seguimiento inmediato de una cuenta pública. Mantener D-017: pública → accepted; privada → pending hasta aceptación. Revisar toggle persistido, bandeja de solicitudes y permisos reales mediante llamadas directas.

**Dependencias:** [#126](https://github.com/migdlp/opinion-social-media/issues/126), [#138](https://github.com/migdlp/opinion-social-media/issues/138), [#129](https://github.com/migdlp/opinion-social-media/issues/129)

**Criterios de aceptación:**

- [ ] Dada cuenta pública, seguir se acepta directamente y no crea solicitud pendiente.
- [ ] Dada cuenta privada, seguir crea una sola pending incluso con doble petición; solicitante no ve encuestas/historial protegido hasta aceptación.
- [ ] Dado el titular, la bandeja muestra sólo sus solicitudes entrantes pendientes; aceptar/rechazar actualiza UI, contadores y permisos.
- [ ] Dado cambio de privacidad, conservar contratos vigentes para seguidores ya aceptados; leer el valor persistido y probar recarga/dispositivos.
- [ ] TDD y E2E con dos cuentas, REST/RPC directos y comparación dev/prod permiten documentar si el fallo era configuración, UI o backend. No modificar SQL productivo en una simple auditoría.

### POLL-001 — Definir el catálogo de nuevos tipos y evaluar respuesta múltiple y ranking

**Issue:** [#281](https://github.com/migdlp/opinion-social-media/issues/281) · **Épica:** [#110](https://github.com/migdlp/opinion-social-media/issues/110) · **Prioridad:** P1 · **Estimación relativa:** M

**Etiquetas:** `design`, `frontend`, `backend`, `testing`, `area:encuestas`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

El propietario propone permitir varias respuestas y ordenar de mayor a menor, pero pide pensar mejor los formatos. Comparar estos candidatos con elección única y comparación de fotos (esta última ya solicitada explícitamente). Entregar flujos/prototipos y una decisión por formato, sin implantar tipos tentativos como requisitos cerrados.

**Dependencias:** Sin bloqueos técnicos previos; definición de catálogo solicitada.

**Criterios de aceptación:**

- [ ] Para respuesta múltiple, definir mínimo/máximo seleccionable, confirmación, participación única/inmutable y denominador de porcentajes (pueden sumar más de 100%).
- [ ] Para ranking, definir qué significa mayor/menor, lista completa o parcial, empates, orden accesible sin arrastre obligatorio y cálculo de resultados; no asumir puntuación Borda ni otra sin decisión.
- [ ] Para fotos, cerrar contrato de comparación 2–6 alternativas, rótulos/alt y cómo convive con el voto único actual; no bloquearla por tipos descartados.
- [ ] Cada candidato termina como aprobado/pospuesto/con preguntas concretas, con ejemplos de entrada/resultados y regla de ocultación antes de votar.
- [ ] Los tipos aprobados adicionales generan tickets pequeños de esquema/RPC, UI y seguridad/E2E con dependencias; no crear un motor genérico ni implementar ranking/multirespuesta sólo por esta exploración.

### SOCIAL-001 — Bloqueo de personas impuesto en base de datos y consultas

**Issue:** [#282](https://github.com/migdlp/opinion-social-media/issues/282) · **Épica:** [#109](https://github.com/migdlp/opinion-social-media/issues/109) · **Prioridad:** P1 · **Estimación relativa:** L

**Etiquetas:** `backend`, `database`, `security`, `testing`, `area:moderacion`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Crear relación privada de bloqueo y operaciones propias para bloquear/desbloquear. Para cuentas autenticadas, el bloqueo entre A y B impide visibilidad e interacción en ambos sentidos; cancela seguimientos/solicitudes entre ambos. Integrarlo en feed, perfil/historial, búsqueda y futuras lecturas de comentarios, conservando votos existentes y agregados.

**Dependencias:** [#128](https://github.com/migdlp/opinion-social-media/issues/128), [#249](https://github.com/migdlp/opinion-social-media/issues/249)

**Criterios de aceptación:**

- [ ] Dado A bloquea B, ninguno puede seguir/solicitar, ver contenido protegido del otro o interactuar mediante APIs directas; un bloqueo activo en cualquier sentido basta.
- [ ] Dado bloqueo, eliminar relaciones/pendientes entre ambos de forma atómica; desbloquear no restaura seguimientos automáticamente.
- [ ] No borrar ni cambiar votos previos, ni recalcular agregados excluyéndolos. No exponer listados de quién bloqueó al solicitante ni permitir gestionar bloqueos ajenos.
- [ ] RLS, permisos y RPC controladas para la lista propia; no filtrar contenido por endpoints alternativos, cursores, recomendaciones o caches compartidas.
- [ ] El contenido público puede seguir visible sin sesión: documentar este límite real, sin prometer anonimato ni protección frente a otra cuenta. SQL/HTTP y concurrencia con matrices de actores.

### SEARCH-001 — Búsqueda de encuestas por pregunta con paginación y permisos

**Issue:** [#283](https://github.com/migdlp/opinion-social-media/issues/283) · **Épica:** [#113](https://github.com/migdlp/opinion-social-media/issues/113) · **Prioridad:** P1 · **Estimación relativa:** M

**Etiquetas:** `backend`, `database`, `security`, `testing`, `area:busqueda`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Añadir búsqueda sencilla sobre preguntas con índice de PostgreSQL y consultas parametrizadas; sin servicio externo ni búsqueda semántica. Búsqueda de 2–100 caracteres normalizados, página de hasta 20 y orden/cursor estable. Encuestas cerradas accesibles pueden encontrarse aunque ya no estén en el feed de 24 h.

**Dependencias:** [SOCIAL-001](https://github.com/migdlp/opinion-social-media/issues/282)

**Criterios de aceptación:**

- [ ] Dada consulta válida, devuelve sólo encuestas publicadas que ese actor puede ver, respetando cuenta privada y bloqueos; ocultas no aparecen.
- [ ] Dado anónimo o usuario sin voto, las abiertas no incluyen recuentos, porcentajes, votos ajenos ni datos de resultados en HTML/RPC.
- [ ] Dada consulta vacía/corta/larga o caracteres especiales, devuelve validación controlada, sin SQL interno ni interpolación insegura.
- [ ] Dadas páginas sucesivas con la misma consulta, no hay duplicados ni mezcla con otra búsqueda; no se devuelven totales globales que revelen contenido privado.
- [ ] Migración/índice, contrato y tipos versionados; SQL/HTTP/TDD y plan de consulta con un volumen de prueba representativo, sin añadir Redis.

### SEARCH-002 — Pantalla de búsqueda y lupa en la navegación móvil

**Issue:** [#284](https://github.com/migdlp/opinion-social-media/issues/284) · **Épica:** [#113](https://github.com/migdlp/opinion-social-media/issues/113) · **Prioridad:** P1 · **Estimación relativa:** M

**Etiquetas:** `frontend`, `design`, `testing`, `area:busqueda`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Crear /search con query en URL, formulario accesible y estados de inicio, cargando, vacío, error y más resultados. Añadir Buscar con lupa abajo en móvil y acceso equivalente en escritorio. Reutilizar tarjetas/voto/login y navegación existente.

**Dependencias:** [SEARCH-001](https://github.com/migdlp/opinion-social-media/issues/283)

**Criterios de aceptación:**

- [ ] Dada lupa móvil, abre búsqueda real; barra Feed/Buscar/Crear/Perfil no desborda a 320 px, respeta safe-area y objetivos de 44 px.
- [ ] Dada consulta enviada, URL mantiene q y atrás/adelante/restauración conservan consulta; no hay búsqueda vacía automática del catálogo entero.
- [ ] Dado resultado, se puede abrir/votar con los mismos permisos y retorno del login; la selección no revela resultados prematuramente.
- [ ] Dado teclado/lector de pantalla, formulario, foco, estado de búsqueda y botón cargar más son utilizables; claro/oscuro consistentes.
- [ ] TDD/E2E anónimo y con sesión, permisos de búsqueda, consulta sin resultados y errores de red. No introducir analítica ni autocomplete no pedido.

### CMT-001 — Backend de comentarios y habilitación por encuesta

**Issue:** [#285](https://github.com/migdlp/opinion-social-media/issues/285) · **Épica:** [#112](https://github.com/migdlp/opinion-social-media/issues/112) · **Prioridad:** P1 · **Estimación relativa:** L

**Etiquetas:** `backend`, `database`, `security`, `testing`, `area:comentarios`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Debate plano, sin hilos ni likes. Añadir comments_enabled (false por defecto) configurable al crear y por el autor después mediante operación controlada. Comentarios de texto plano 1–1000 caracteres, paginados; publicar exige sesión, perfil y acceso. En abiertas, leer/escribir debate exige haber votado; cerradas respetan visibilidad de la encuesta.

**Dependencias:** [SOCIAL-001](https://github.com/migdlp/opinion-social-media/issues/282)

**Criterios de aceptación:**

- [ ] Dada encuesta con comentarios apagados, nadie los obtiene ni publica por API normal, tampoco el autor; no devolver recuento oculto. Apagar conserva filas para reactivación, no las borra.
- [ ] Dado autor autenticado, sólo él cambia el flag; no puede editar pregunta, opciones, cierre o votos por esta capacidad.
- [ ] Dada abierta sin voto, el debate se deniega también al creador; tras votar se habilita, y en cerradas sigue la autorización de cuenta/bloqueos.
- [ ] Comentarios de personas bloqueadas por el lector o por el autor de la encuesta no se muestran; no aceptar nuevos comentarios incompatibles con bloqueo.
- [ ] Texto normalizado sin HTML, límite backend de 10 publicaciones/minuto por cuenta aplicado concurrentemente, permisos/RLS/índices y tipos; SQL/HTTP y errores controlados.

### CMT-003 — Denuncia y moderación mínima de comentarios

**Issue:** [#286](https://github.com/migdlp/opinion-social-media/issues/286) · **Épica:** [#112](https://github.com/migdlp/opinion-social-media/issues/112) · **Prioridad:** P1 · **Estimación relativa:** M

**Etiquetas:** `backend`, `frontend`, `database`, `security`, `testing`, `area:comentarios`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Permitir denunciar comentarios visibles y ocultarlos desde operación administrativa de Supabase; sin panel de administración completo. Reutilizar motivos de denuncia y controles existentes donde encajen. El autor de una encuesta puede apagar debate, pero no obtiene permisos arbitrarios para leer comentarios inaccesibles.

**Dependencias:** [CMT-001](https://github.com/migdlp/opinion-social-media/issues/285)

**Criterios de aceptación:**

- [ ] Dado comentario autorizado, usuario con sesión puede denunciar con motivo; duplicados se controlan y no exponen denunciante ni denuncias ajenas.
- [ ] Dado comentario oculto por moderación, desaparece de todas las lecturas normales y de enlaces directos; no reaparece al reactivar comentarios.
- [ ] Dado comentarios deshabilitados, encuesta oculta, privada sin permiso o bloqueo, APIs de denuncia/listado no permiten inferir contenido ni saltar autorización.
- [ ] Procedimiento de revisión manual, permisos administrativos y tratamiento/retención de denuncias documentados para revisión legal.
- [ ] Tests SQL/HTTP de acceso/abuso y E2E de envío, error/duplicado y contenido moderado; incluir antes de activar públicamente comentarios.

### CMT-002 — Controles de comentarios y debate en el detalle

**Issue:** [#287](https://github.com/migdlp/opinion-social-media/issues/287) · **Épica:** [#112](https://github.com/migdlp/opinion-social-media/issues/112) · **Prioridad:** P1 · **Estimación relativa:** L

**Etiquetas:** `frontend`, `design`, `testing`, `area:comentarios`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Añadir interruptor Comentarios en creación y control del autor en el detalle. Mostrar debate paginado bajo la encuesta cuando esté autorizado, con formulario de texto, autor y fecha. Mantener los resultados de la encuesta como elemento principal y explicar acceso tras votar.

**Dependencias:** [CMT-001](https://github.com/migdlp/opinion-social-media/issues/285), [CMT-003](https://github.com/migdlp/opinion-social-media/issues/286)

**Criterios de aceptación:**

- [ ] Dado crear, Comentarios viene apagado; el autor puede activarlo/desactivarlo en el detalle sin editar el resto de la encuesta.
- [ ] Dado sin voto en abierta, mostrar explicación sin textos/recuentos de comentarios en payload; tras votar aparece el debate habilitado.
- [ ] Dado escribir, hay validación/carga/error y recuperación sin duplicar publicaciones; la identidad pública del comentario se muestra de forma consciente.
- [ ] Indicar que ocultar historial de votos no oculta comentarios que se publiquen voluntariamente; no revelar la opción elegida automáticamente.
- [ ] TDD/E2E de activar/apagar/reactivar, sesión, voto previo, cerrado, bloqueo y denuncia; móvil/teclado/ambos temas, sin añadir hilos o likes.

### MEDIA-001 — Contrato y esquema de encuestas para comparar fotos

**Issue:** [#288](https://github.com/migdlp/opinion-social-media/issues/288) · **Épica:** [#110](https://github.com/migdlp/opinion-social-media/issues/110) · **Prioridad:** P1 · **Estimación relativa:** M

**Etiquetas:** `backend`, `database`, `security`, `testing`, `area:encuestas`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Añadir un formato imagen de elección única con 2–6 alternativas, cada una con foto y descripción alternativa. Conservar encuestas de texto existentes y un único voto inmutable por cuenta. Versionar modelo/contrato sin introducir un motor extensible de tipos no decididos.

**Dependencias:** [POLL-001](https://github.com/migdlp/opinion-social-media/issues/281), [SOCIAL-001](https://github.com/migdlp/opinion-social-media/issues/282)

**Criterios de aceptación:**

- [ ] Dadas encuestas antiguas, conservan tipo texto y comportamiento; migración no borra preguntas, opciones ni votos.
- [ ] Dada encuesta de imágenes, publicación valida 2–6 opciones completas y ordenadas, cada archivo pertenece al autor y al borrador de carga autorizado; no se puede enlazar un objeto ajeno.
- [ ] Publicación atómica: no aparecen encuestas incompletas; el contrato de upload/publicación y de limpieza de fallos queda fijado.
- [ ] Resultados siguen protegidos en abiertas, con la excepción de cierre vigente; firmar opciones/archivos no filtra votos ni agregados.
- [ ] SQL/tipos/RPC, FK/restricciones y pruebas de compatibilidad/propiedad/privacidad. Sólo el contrato de fotos necesita POLL-001; no esperar a aprobar ranking o respuesta múltiple.

### MEDIA-002 — Subida y lectura segura de fotos de encuestas

**Issue:** [#289](https://github.com/migdlp/opinion-social-media/issues/289) · **Épica:** [#110](https://github.com/migdlp/opinion-social-media/issues/110) · **Prioridad:** P1 · **Estimación relativa:** L

**Etiquetas:** `backend`, `database`, `security`, `testing`, `area:encuestas`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Configurar almacenamiento de adjuntos de encuestas con políticas de propietario, visibilidad y bloqueo, separado del avatar. Admitir JPEG/PNG/WebP, máximo 5 MiB por archivo, verificar contenido real y eliminar metadatos sensibles (incluida geolocalización) al procesar; no SVG/HTML ni URLs externas arbitrarias.

**Dependencias:** [MEDIA-001](https://github.com/migdlp/opinion-social-media/issues/288)

**Criterios de aceptación:**

- [ ] Dado archivo inválido, sobredimensionado o MIME falso, backend lo rechaza; sólo se sirve una imagen procesada segura, sin EXIF/ubicación ni el original sin revisar.
- [ ] Dada encuesta privada/oculta o bloqueo, conocer el object path no permite leer por API sin permiso; bucket privado y entrega autenticada/RLS o ruta autorizada, sin caché pública de medios privados.
- [ ] Dada carga temporal, sólo el propietario puede usarla; URLs/objetos de otra cuenta no se pueden asociar. Documentar cuota inicial de 40 cargas/hora por cuenta y probar concurrencia.
- [ ] Dado fallo o abandono, objetos temporales sin asociación se limpian a las 24 h mediante mecanismo de Supabase; no borrar adjuntos publicados por error ni añadir colas/servicios externos.
- [ ] Pruebas de archivos reales, RLS/HTTP, recuperación de errores y limpieza; costes/límites y conservación de imágenes documentados para revisión legal.

### MEDIA-003 — Crear, comparar y votar encuestas con fotos

**Issue:** [#290](https://github.com/migdlp/opinion-social-media/issues/290) · **Épica:** [#110](https://github.com/migdlp/opinion-social-media/issues/110) · **Prioridad:** P1 · **Estimación relativa:** L

**Etiquetas:** `frontend`, `design`, `testing`, `area:encuestas`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Selector de formato Texto/Fotos, previsualización y reemplazo de imágenes antes de publicar; detalle y tarjetas muestran comparaciones utilizables en móvil/escritorio. Reutilizar voto/resultados, sin publicar automáticamente al terminar una carga.

**Dependencias:** [MEDIA-001](https://github.com/migdlp/opinion-social-media/issues/288), [MEDIA-002](https://github.com/migdlp/opinion-social-media/issues/289)

**Criterios de aceptación:**

- [ ] Dado formato Fotos, se pueden preparar 2–6 alternativas con descripción accesible, progreso y errores; no se ofrece el fallback Sí/No de texto para imágenes vacías.
- [ ] Dado fallo en una carga o publicación, se puede corregir/reintentar sin publicar encuestas incompletas ni perder el resto del formulario.
- [ ] Dado antes de votar, sólo muestra pregunta/alternativas; después y al cierre muestra resultados autorizados sin alterar reglas de voto.
- [ ] Imágenes con relación de aspecto/espacio reservados no descuadran la cuadrícula; no recortar la comparación esencial, texto alternativo y navegación por teclado correctos.
- [ ] TDD/E2E de crear/votar/recargar, privado/bloqueado/oculto y archivos fallidos, capturas reales de 320/390/1280; no descargas privilegiadas ni URLs públicas para adjuntos privados.

### SOCIAL-002 — Bloquear, desbloquear y gestionar la lista propia desde la interfaz

**Issue:** [#291](https://github.com/migdlp/opinion-social-media/issues/291) · **Épica:** [#109](https://github.com/migdlp/opinion-social-media/issues/109) · **Prioridad:** P1 · **Estimación relativa:** M

**Etiquetas:** `frontend`, `design`, `testing`, `area:moderacion`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Acción Bloquear persona en perfil y menú contextual de autor; confirmación comprensible, opción de desbloquear y lista propia en Ajustes. No ofrecer la acción sobre uno mismo ni mostrar quién ha bloqueado al usuario.

**Dependencias:** [SOCIAL-001](https://github.com/migdlp/opinion-social-media/issues/282)

**Criterios de aceptación:**

- [ ] Dado bloquear, la confirmación explica pérdida de seguimiento/interacciones; al completarse desaparece contenido y se refleja estado sin necesitar otra sesión.
- [ ] Dado Ajustes, sólo muestra bloqueos propios y permite desbloquear; no recupera relaciones antiguas automáticamente.
- [ ] Dado fallo de red/operación concurrente, feedback recuperable sin estado optimista definitivo incorrecto.
- [ ] Las rutas directas siguen protegidas por backend; explicar que contenido público puede ser accesible sin sesión sin prometer protección absoluta.
- [ ] TDD/E2E con dos cuentas, menús/foco/cierre exterior, móvil/escritorio, y casos seguir/solicitud/bloqueo/desbloqueo.

### MOD-001 — Backend para denunciar personas y revisión administrativa mínima

**Issue:** [#292](https://github.com/migdlp/opinion-social-media/issues/292) · **Épica:** [#112](https://github.com/migdlp/opinion-social-media/issues/112) · **Prioridad:** P1 · **Estimación relativa:** M

**Etiquetas:** `backend`, `database`, `security`, `testing`, `area:moderacion`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Ampliar denuncias a cuentas sin mezclar su target con poll_reports. Registrar denunciante autenticado, cuenta denunciada, motivo y texto opcional; evitar abuso/duplicados y permitir revisión por operador autorizado, sin panel completo.

**Dependencias:** [#122](https://github.com/migdlp/opinion-social-media/issues/122)

**Criterios de aceptación:**

- [ ] Dado perfil visible/autorizado, una cuenta con sesión denuncia con motivo y detalle opcional acotado; rechazar auto-denuncia y target inválido con errores controlados.
- [ ] Dado denunciante, sólo puede enviar su propia denuncia; nadie consulta denuncias/identidades ajenas mediante API ni deduce quién le denunció.
- [ ] Dado repetición/concurrencia, existe control de duplicados y cuota backend; no se publican detalles de moderación ni datos personales.
- [ ] Denunciar no oculta ni bloquea automáticamente la cuenta ni altera votos; moderación manual y bloqueo son capacidades independientes.
- [ ] RLS/GRANT/migraciones/tipos y SQL/HTTP con roles anónimo/autenticado/admin, procedimiento de revisión y retención para revisión legal.

### MOD-002 — Acción Denunciar persona en perfiles y menús

**Issue:** [#293](https://github.com/migdlp/opinion-social-media/issues/293) · **Épica:** [#112](https://github.com/migdlp/opinion-social-media/issues/112) · **Prioridad:** P1 · **Estimación relativa:** M

**Etiquetas:** `frontend`, `design`, `testing`, `area:moderacion`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Añadir Denunciar persona junto a Bloquear en las superficies adecuadas, reutilizando el patrón de diálogo de denuncia corregido. Distinguir claramente persona y encuesta para que el usuario sepa qué se reporta.

**Dependencias:** [MOD-001](https://github.com/migdlp/opinion-social-media/issues/292), [SOCIAL-002](https://github.com/migdlp/opinion-social-media/issues/291)

**Criterios de aceptación:**

- [ ] Dado perfil/autor, se identifica la cuenta denunciada y se elige motivo; no enviar sin confirmación explícita.
- [ ] Dado éxito, error, límite o denuncia repetida, se muestran mensajes comprensibles sin datos SQL/privados.
- [ ] Denunciar persona y denunciar encuesta son acciones distintas y accesibles; no bloquea por defecto ni cambia perfil/votos.
- [ ] Diálogo permite cerrar fuera/Escape, gestiona foco y queda por encima de tarjetas/barra móvil sin superposición; 44 px y contraste.
- [ ] TDD/E2E anónimo/login/retorno, éxito/error/duplicado y pruebas con cuentas privadas o no disponibles. Coordinar integración del mismo menú con SOCIAL-002.

### PROFILE-001 — Descripción de perfil opcional con validación y permisos

**Issue:** [#294](https://github.com/migdlp/opinion-social-media/issues/294) · **Épica:** [#109](https://github.com/migdlp/opinion-social-media/issues/109) · **Prioridad:** P1 · **Estimación relativa:** M

**Etiquetas:** `backend`, `database`, `security`, `testing`, `area:perfil`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Añadir biografía/descripción opcional de 0–280 caracteres Unicode como texto plano. Integrar RPC propia de edición y contratos de perfil manteniendo avatar/@usuario/nombre; no añadir ubicación, teléfono, enlaces o datos personales no pedidos.

**Dependencias:** [#247](https://github.com/migdlp/opinion-social-media/issues/247)

**Criterios de aceptación:**

- [ ] Dado titular autenticado, puede establecer, cambiar o vaciar su bio; otro actor no puede modificarla por tabla/RPC.
- [ ] Texto recortado y validado en backend, sin HTML ejecutable; rechazar sobrelongitud y errores controlados.
- [ ] En cuenta privada, sólo titular y seguidores aceptados ven la bio; no incluirla en cabecera pública, metadatos OG o respuestas alternativas no autorizadas; bloqueos respetados.
- [ ] Las funciones de perfil mantienen campos previos incluido avatar_icon; evitar que la migración reemplace y pierda cambios de AVATAR-001.
- [ ] SQL/HTTP/TDD y tipos reproducibles para bio vacía/larga, privacidad, bloqueo y compatibilidad; no publicar email/datos de Google.

### PROFILE-002 — Editar y mostrar descripción del perfil desde Ajustes

**Issue:** [#295](https://github.com/migdlp/opinion-social-media/issues/295) · **Épica:** [#109](https://github.com/migdlp/opinion-social-media/issues/109) · **Prioridad:** P1 · **Estimación relativa:** M

**Etiquetas:** `frontend`, `design`, `testing`, `area:perfil`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Añadir campo Descripción en Ajustes → Perfil, contador accesible y vista del texto autorizado en el perfil. Conservar cambios introducidos ante error y no obligar a rellenarlo para crear/votar.

**Dependencias:** [PROFILE-001](https://github.com/migdlp/opinion-social-media/issues/294), [#248](https://github.com/migdlp/opinion-social-media/issues/248)

**Criterios de aceptación:**

- [ ] Dada bio opcional, se puede añadir, guardar, modificar y quitar; vista de perfil refleja el cambio tras recargar.
- [ ] Dado límite 280 o error, se informa junto al campo y se conserva texto para corregir; no se guarda otro perfil accidentalmente.
- [ ] Dada cuenta privada/bloqueo, el frontend no recibe la bio sin permiso; explicar su audiencia al editarla.
- [ ] Texto largo se ajusta sin romper el diseño; no hay interpretación HTML ni enlaces automáticos peligrosos.
- [ ] TDD/E2E propio/otro/privado, vacío/guardado/error, 320/390/1280, teclado y ambos temas.

### QA-001 — Regresión de privacidad y convivencia para los nuevos módulos

**Issue:** [#296](https://github.com/migdlp/opinion-social-media/issues/296) · **Épica:** [#114](https://github.com/migdlp/opinion-social-media/issues/114) · **Prioridad:** P0 · **Estimación relativa:** L

**Etiquetas:** `testing`, `security`, `backend`, `frontend`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Preparar desde sus contratos una matriz compartida y completar pruebas SQL/HTTP/E2E a medida que se integren módulos. Actor anónimo, titular, votante/no votante, seguidor aceptado/pendiente y bloqueo; encuestas abiertas/cerradas/ocultas, contenido activo/desactivado. No sustituir las pruebas exigidas en cada ticket.

**Dependencias:** [SOCIAL-001](https://github.com/migdlp/opinion-social-media/issues/282), [SEARCH-001](https://github.com/migdlp/opinion-social-media/issues/283), [CMT-001](https://github.com/migdlp/opinion-social-media/issues/285), [MEDIA-002](https://github.com/migdlp/opinion-social-media/issues/289), [PROFILE-001](https://github.com/migdlp/opinion-social-media/issues/294)

**Criterios de aceptación:**

- [ ] Para cada módulo integrado, matriz prueba accesos directos y UI, SSR/RSC y URLs de Storage: ninguna ruta revela datos antes de autorización.
- [ ] Agregar casos combinados de búsqueda + privado/bloqueo, debate + voto, fotos + privacidad y perfil + historial con audiencias independientes.
- [ ] Concurrencia y fallos de red no duplican votos/comentarios/reportes/cargas ni aceptan solicitudes privadas automáticamente.
- [ ] Mantener accesibilidad/navegación, contraste y cuadrícula con tamaños mixtos, ambos temas y móviles; adjuntar capturas reales por módulo.
- [ ] Registrar runner/comandos reales y CI aplicable; se puede preparar en paralelo y validar por lotes. Su cierre global espera los módulos, pero las primeras mejoras no esperan toda esta épica si su regresión aplicable ya pasa.

### REL-004 — Publicar los nuevos módulos por lotes con esquema y checklist compatibles

**Issue:** [#297](https://github.com/migdlp/opinion-social-media/issues/297) · **Épica:** [#5](https://github.com/migdlp/opinion-social-media/issues/5) · **Prioridad:** P0 · **Estimación relativa:** M

**Etiquetas:** `devops`, `testing`, `security`

**Estado inicial:** Pendiente · **Agente:** —. Consultar el estado operativo en main antes de reservar.

Preparar publicaciones incrementales de las tareas nuevas, empezando por defaults/UX. Cada corte incluye únicamente tickets terminados, migraciones validadas y regresión aplicable. Separar comentarios/fotos/bloqueo/búsqueda si no están listos; no esperar a todo el backlog ni activar funcionalidades sin backend.

**Dependencias:** [#273](https://github.com/migdlp/opinion-social-media/issues/273)

**Criterios de aceptación:**

- [ ] Dado cada lote, fijar SHA y lista de tareas, comprobar dependencias operativas y CI exacta verde con E2E de sus cambios antes de PR a release.
- [ ] Dado SQL/Storage nuevo, ensayo en dev y recuperación/conservación de datos revisados antes de prod; permisos y objetos nuevos sin acceso público indebido.
- [ ] Dado deploy, verificar READY/Production, SHA/alias, smoke con sesión y sin sesión según módulo y escaneo de errores; registrar límites reales de pruebas.
- [ ] Actualizar información legal de comentarios, reportes, bloqueos, bio e imágenes antes de activar tratamientos nuevos; no inventar responsable/consentimiento.
- [ ] Cada lote sigue la autorización de publicación del propietario y reglas de Vercel; planificación actual no autoriza desplegar. Tras cerrar o pausar, sincronizar docs/issues/#73 y liberar reservas.
