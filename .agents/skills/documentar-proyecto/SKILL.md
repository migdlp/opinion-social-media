---
name: documentar-proyecto
description: Genera o actualiza la documentación técnica de un proyecto de software en una carpeta dedicada (docs/tecnica/) con archivos Markdown concisos sobre arquitectura, estructura de carpetas, stack, modelos de datos, clases y módulos clave, API y configuración. Úsala siempre que el usuario pida documentar un proyecto, repo o código, explicar su arquitectura, hacer un "onboarding técnico", resumir cómo está montado algo, generar docs para otro desarrollador o agente, o actualizar documentación existente tras cambios, aunque no diga "documentación" literalmente (p. ej. "explícame cómo está organizado este repo y déjalo escrito").
---

# Documentar proyecto

Objetivo: que un desarrollador (o un agente) que no conoce el proyecto entienda en 10-15 minutos **cómo está construido y dónde tocar**. No es un manual de usuario ni una copia del código.

## Principio guía: conciso pero útil

Cada línea debe responder a una pregunta que alguien nuevo se haría. Antes de escribir algo, pregúntate: *¿esto cambia cómo alguien entiende o modifica el proyecto?* Si no, fuera.

- **Sí**: decisiones de arquitectura y su porqué, responsabilidades de cada módulo, relaciones entre entidades, flujos principales, puntos de entrada, convenciones no obvias, dependencias externas críticas, trampas conocidas.
- **No**: listar cada archivo o cada método, repetir lo que dice el nombre ("`UserService` – servicio de usuarios"), copiar bloques de código largos, explicar qué es React o Postgres, getters/setters, boilerplate del framework.
- Prefiere tablas y listas cortas a párrafos. Un diagrama Mermaid vale más que tres párrafos describiendo flujos.
- Referencia rutas reales (`src/services/auth.ts`) para que se pueda saltar al código; el código es la fuente de detalle, la doc es el mapa.
- Si algo no se puede deducir con confianza del código, márcalo como `> ⚠️ Por confirmar:` en lugar de inventarlo.

## Proceso

### 1. Explorar antes de escribir

Recorre el proyecto para formarte un modelo mental completo. Orden recomendado:

1. Manifiestos y config: `package.json`, `pyproject.toml`, `requirements.txt`, `go.mod`, `pom.xml`, `Cargo.toml`, `composer.json`, `Dockerfile`, `docker-compose.yml`, CI (`.github/workflows`), `.env.example`.
2. README y docs existentes (para no contradecirlos y reutilizar lo válido).
3. Árbol de carpetas (ignora `node_modules`, `dist`, `build`, `.venv`, `vendor`, `.git`, etc.).
4. Puntos de entrada: `main`, `index`, `app`, `server`, routers, `manage.py`, etc.
5. Modelos/esquemas: ORM (Prisma, TypeORM, SQLAlchemy, Django models, Eloquent, JPA…), migraciones, esquemas Zod/Pydantic, tipos compartidos.
6. Capas de negocio: servicios, casos de uso, controladores, stores, hooks, componentes principales.
7. Integraciones externas: APIs de terceros, colas, auth, almacenamiento, pagos.

En proyectos grandes, lee en profundidad solo los archivos centrales y muestrea el resto; no hace falta leer todo para describir bien la arquitectura.

### 2. Decidir qué archivos generar

Crea la carpeta `docs/tecnica/` en la raíz del proyecto (si el proyecto ya usa otra carpeta de documentación técnica o el usuario indica otra ruta, usa esa). Genera **solo los archivos que apliquen** al proyecto; un CLI sin base de datos no necesita `modelos.md`.

| Archivo | Cuándo | Contenido |
|---|---|---|
| `README.md` | Siempre | Índice, qué es el proyecto en 2-3 frases, stack en una línea, cómo arrancarlo en local, mapa de los demás docs |
| `arquitectura.md` | Siempre | Visión de alto nivel, capas/componentes, diagrama Mermaid, flujos principales, decisiones clave y su porqué |
| `estructura.md` | Siempre | Árbol de carpetas comentado (solo niveles relevantes), convenciones de nombres y organización |
| `stack.md` | Siempre | Tabla de tecnologías: categoría, tecnología, versión, para qué se usa |
| `modelos.md` | Si hay datos persistidos o tipos de dominio | Entidades, campos importantes, relaciones, diagrama ER Mermaid |
| `modulos.md` | Si hay lógica de negocio relevante | Clases/módulos/servicios clave: responsabilidad, dependencias, métodos importantes (no todos) |
| `api.md` | Si expone API (REST, GraphQL, RPC, eventos) | Tabla de endpoints agrupados, auth, formato de errores |
| `configuracion.md` | Si hay env vars, despliegue o infra | Variables de entorno, entornos, despliegue, CI/CD, servicios externos |

Si un archivo quedaría con muy poco contenido, intégralo en otro (p. ej. una API de 3 endpoints puede ir en `arquitectura.md`).

Las plantillas de cada archivo están en `references/plantillas.md`. Léelas antes de escribir y adáptalas: son una guía de estructura, no un formulario a rellenar; elimina secciones que no aporten.

### 3. Escribir

- Idioma: el del usuario (por defecto español), salvo que la documentación existente del proyecto esté en otro idioma.
- Tamaño orientativo: cada archivo entre 40 y 200 líneas. Si uno crece mucho, probablemente estás bajando a demasiado detalle.
- Diagramas en Mermaid (`flowchart`, `sequenceDiagram`, `erDiagram`, `classDiagram`) porque GitHub/GitLab y la mayoría de editores los renderizan y viven junto al código.
- Enlaza entre documentos con rutas relativas (`[modelos](./modelos.md)`).
- Añade al final de `README.md` una línea `Última actualización: AAAA-MM-DD` para saber si la doc puede estar desfasada.

### 4. Si la documentación ya existe

No la sobrescribas a ciegas. Léela, compárala con el código actual y actualiza solo lo que haya cambiado o esté mal, conservando el contenido válido y las notas manuales del equipo. Al terminar, resume al usuario qué se actualizó.

### 5. Verificar

Antes de dar por terminado, revisa:
- Las rutas y nombres de clases citados existen realmente.
- Los diagramas Mermaid tienen sintaxis válida (sin caracteres especiales sin comillas en etiquetas, nodos bien cerrados).
- No hay secciones vacías ni texto de plantilla sin rellenar.
- Alguien nuevo podría responder: ¿qué hace?, ¿con qué está hecho?, ¿cómo se organiza?, ¿dónde está la lógica X?, ¿cómo se relacionan los datos?, ¿cómo lo arranco?

Termina con un resumen breve al usuario: archivos creados/actualizados y cualquier punto marcado como "Por confirmar".
