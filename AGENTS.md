# Instrucciones del proyecto

## Alcance vigente

El propietario ha pedido **pausar la implementación** y organizar primero el contexto de la aplicación, los documentos y las tareas futuras. Incorporar sus próximos mensajes a `docs/` y mantener la trazabilidad de decisiones y requisitos.

- Leer `README.md`, `docs/contexto-aplicacion.md`, `docs/decisiones.md` y `docs/estado-proyecto.md` antes de trabajar.
- Hasta recibir una instrucción explícita de reanudar, limitar los cambios a documentación y comprobaciones de acceso de solo lectura cuando sean necesarias.
- No implementar código, aplicar SQL, configurar OAuth, crear más infraestructura ni desplegar mientras esté vigente esta pausa.
- Mantener las tareas futuras como pendientes; no equiparar documentación o borradores con implementación verificada.
- No guardar secretos, tokens ni claves administrativas en Git.
- Informar del avance en español y registrar cualquier bloqueo real.

## Contratos a preservar cuando se reanude

El backlog original está en `docs/backlog.md`. La regla crítica es que ningún usuario, incluido el autor, pueda obtener agregados de una encuesta antes de votar. La autorización debe imponerse en Supabase, no sólo en la interfaz. Los entornos de preview/desarrollo no usarán la base de producción.
