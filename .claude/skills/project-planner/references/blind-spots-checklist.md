# Checklist de puntos ciegos y casos límite

Recórrelo en silencio tras la entrevista. Para cada punto que aplique: si la respuesta estándar es obvia, decídela y conviértela en requisito; si cambia el producto o tiene coste, llévala al usuario con una propuesta.

## Índice
1. Estados de UI
2. Entradas y validación
3. Datos y ciclo de vida
4. Concurrencia y consistencia
5. Identidad, permisos y seguridad
6. Privacidad y legal
7. Errores, red y terceros
8. Rendimiento y escala
9. Tiempo, idioma y localización
10. Accesibilidad y UX
11. Móvil
12. Dinero y pagos
13. Notificaciones y comunicación
14. Operación y despliegue
15. Observabilidad y soporte
16. Migración y compatibilidad
17. Abuso y casos adversos

## 1. Estados de UI
Para cada pantalla/componente que muestra datos:
- Cargando (skeleton/spinner), vacío (primera vez vs. filtro sin resultados), error (con acción de reintento), parcial (algunos datos fallan), éxito.
- Contenido largo: textos que desbordan, nombres de 200 caracteres, listas de 10.000 elementos (paginación/virtualización).
- Contenido mínimo: un solo elemento, campos opcionales vacíos, imágenes que no cargan.
- Estado tras acción: ¿qué ve el usuario después de guardar, borrar, enviar? ¿Hay confirmación? ¿Doble clic en "enviar"?

## 2. Entradas y validación
- Límites: longitud mín/máx, rangos numéricos, cero, negativos, decimales, números enormes.
- Formato: emails, teléfonos internacionales, URLs, espacios al inicio/final, mayúsculas, emojis, caracteres no latinos, HTML/script inyectado.
- Archivos: tipos permitidos, tamaño máximo, archivo corrupto, nombre con caracteres raros, subida interrumpida.
- Validación en cliente **y** servidor; mensajes de error concretos y dónde se muestran.
- Unicidad: ¿qué es único? ¿Insensible a mayúsculas? ¿Qué pasa al intentar duplicar?

## 3. Datos y ciclo de vida
- Creación: valores por defecto, quién es el propietario, datos semilla iniciales.
- Edición: ¿historial/auditoría? ¿quién editó y cuándo?
- Borrado: lógico vs. físico; cascada vs. bloqueo; ¿qué pasa con referencias (pedidos de un producto borrado)? ¿Papelera/deshacer?
- Archivado y retención: ¿cuánto se guarda? ¿Se purga?
- Exportación/importación: formatos, duplicados al importar, importaciones parciales con errores.
- Backups y restauración: ¿frecuencia? ¿se ha probado restaurar?
- Integridad: restricciones en BD (FK, NOT NULL, CHECK, UNIQUE), no solo en código.

## 4. Concurrencia y consistencia
- Dos usuarios editan el mismo registro (último gana, bloqueo optimista con versión, merge).
- Doble envío de formulario / reintentos de red → idempotencia.
- Condiciones de carrera en contadores, stock, plazas, saldos → transacciones o operaciones atómicas.
- Varias pestañas/dispositivos con la misma sesión.
- Trabajos en segundo plano que fallan a mitad: reintentos, colas muertas, reanudación.
- Orden de eventos/webhooks fuera de secuencia o duplicados.

## 5. Identidad, permisos y seguridad
- Matriz de permisos: rol × entidad × acción (crear/leer/editar/borrar). Escríbela en la arquitectura.
- Autorización en servidor/BD (p. ej. RLS), nunca solo ocultando botones.
- Acceso a recursos de otro usuario/tenant cambiando un ID en la URL (IDOR).
- Sesiones: expiración, cierre en todos los dispositivos, cambio de contraseña invalida sesiones.
- Recuperación de cuenta, verificación de email, email ya registrado, cambio de email.
- Usuario borrado/suspendido con sesión abierta.
- Secretos: nunca en el cliente ni en el repo; variables de entorno por entorno.
- OWASP básico: inyección, XSS, CSRF, subida de archivos maliciosos, SSRF en URLs dadas por el usuario.
- Rate limiting en login, registro, envío de emails, endpoints caros.

## 6. Privacidad y legal
- Datos personales: cuáles, para qué, base legal, minimización.
- Derecho de acceso, exportación y borrado de cuenta (y qué pasa con sus datos compartidos).
- Consentimiento de cookies/analítica, términos y política de privacidad.
- Menores de edad, datos sensibles (salud, financieros).
- Ubicación de los datos (UE) y proveedores terceros que los procesan.
- Logs que capturan datos personales o secretos.

## 7. Errores, red y terceros
- Timeout, red lenta, sin conexión, respuesta inesperada del servidor.
- Tercero caído (pagos, email, mapas, IA): ¿degradación elegante, cola y reintento, mensaje al usuario?
- Cuotas/límites del proveedor y coste por uso.
- Mensajes de error: amigables al usuario, detallados en logs, sin filtrar internos.
- Errores no controlados: pantalla de error global, reporte automático.

## 8. Rendimiento y escala
- Consultas N+1, índices para filtros y ordenaciones reales, paginación por cursor si hay volumen.
- Tamaño de bundle, imágenes optimizadas, carga diferida.
- Caché: qué, dónde, cuánto tiempo, cómo se invalida.
- Operaciones pesadas fuera del request (colas, jobs).
- Volumen a 12 meses: ¿aguanta el diseño? ¿Qué se rompe primero?

## 9. Tiempo, idioma y localización
- Zonas horarias: guardar en UTC, mostrar en la del usuario; ¿qué zona usan los eventos programados? Cambios de horario de verano.
- "Hoy", "esta semana", fin de mes, años bisiestos, fechas límite a medianoche.
- Idiomas: textos externalizados desde el inicio si habrá i18n; pluralización; RTL.
- Formatos de número, moneda, fecha, dirección y nombre según locale.

## 10. Accesibilidad y UX
- Navegación por teclado, foco visible, orden lógico.
- Etiquetas para lectores de pantalla, textos alternativos, contraste.
- Tamaños táctiles, zoom, modo oscuro si existe.
- Confirmación en acciones destructivas; deshacer cuando sea posible.
- Feedback inmediato en acciones lentas.
- Responsive: móvil, tablet, escritorio.

## 11. Móvil
- Permisos denegados o revocados después.
- App en segundo plano, terminada por el sistema, reanudada a mitad de flujo.
- Offline: qué funciona, cola de cambios, resolución de conflictos al reconectar.
- Deep links con sesión caducada o a recursos sin permiso.
- Versiones antiguas de la app contra una API nueva (versionado, actualización forzada).
- Notificaciones push: token caducado, usuario desactivó notificaciones.
- Tamaños de pantalla, notch, teclado tapando campos.
- Requisitos de revisión de las stores (login con Apple si hay otros sociales, borrado de cuenta en la app).

## 12. Dinero y pagos
- Importes en enteros (céntimos) o decimal exacto, nunca float.
- Impuestos, moneda, redondeo.
- Webhooks del proveedor como fuente de verdad; idempotencia; firma verificada.
- Pago fallido, reembolso, disputa, cancelación, cambio de plan a mitad de ciclo (prorrateo).
- Estado de la suscripción desincronizado con el proveedor.

## 13. Notificaciones y comunicación
- Plantillas, idioma del destinatario, baja de suscripción.
- Envío duplicado, emails que rebotan, spam.
- Preferencias de notificación por usuario.
- Qué pasa si el envío falla (reintento, registro).

## 14. Operación y despliegue
- Entornos y variables de entorno por entorno (lista completa).
- Migraciones de BD: orden, compatibilidad hacia atrás durante el despliegue, rollback.
- Feature flags para lanzamientos graduales.
- Dominio, SSL, DNS, emails transaccionales (SPF/DKIM).
- CI: lint, typecheck, tests, build en cada PR.
- Costes de infraestructura estimados.

## 15. Observabilidad y soporte
- Logs estructurados con ID de correlación; sin datos sensibles.
- Captura de errores (frontend y backend) con alertas.
- Métricas de negocio y de salud; analítica de producto para medir el objetivo.
- Herramientas de soporte: ver como usuario, panel admin, reenviar email, desbloquear cuenta.

## 16. Migración y compatibilidad
- Datos existentes que no cumplen las nuevas validaciones.
- Usuarios a mitad de un flujo durante el despliegue.
- APIs/clientes antiguos que siguen llamando.
- Plan de verificación (conteos, muestreo) y de vuelta atrás.

## 17. Abuso y casos adversos
- Creación masiva de cuentas, spam, scraping.
- Contenido generado por usuarios: moderación, reportes, bloqueo.
- Usuario que intenta superar límites del plan.
- Coste descontrolado (llamadas a IA, almacenamiento, emails) disparado por un usuario.
