# Plantillas de documentación técnica

Guía de estructura para cada archivo. Adapta, recorta y elimina secciones vacías. Los textos entre `<>` son indicaciones, no contenido.

## Índice
- [README.md](#readmemd)
- [arquitectura.md](#arquitecturamd)
- [estructura.md](#estructuramd)
- [stack.md](#stackmd)
- [modelos.md](#modelosmd)
- [modulos.md](#modulosmd)
- [api.md](#apimd)
- [configuracion.md](#configuracionmd)

---

## README.md

```markdown
# <Nombre del proyecto> — Documentación técnica

<Qué es y qué problema resuelve, en 2-3 frases.>

**Stack:** <Lenguaje> · <Framework> · <BD> · <Infra/hosting>

## Arranque rápido
​```bash
<comandos mínimos: instalar, configurar env, levantar>
​```

## Documentos
| Documento | Contenido |
|---|---|
| [Arquitectura](./arquitectura.md) | Componentes, flujos y decisiones |
| [Estructura](./estructura.md) | Organización de carpetas y convenciones |
| <…solo los que existan…> | |

Última actualización: AAAA-MM-DD
```

---

## arquitectura.md

```markdown
# Arquitectura

## Visión general
<Tipo de sistema (monolito, SPA + API, microservicios, serverless…) y patrón principal (MVC, capas, hexagonal, feature-based…). 3-5 frases.>

## Componentes
​```mermaid
flowchart LR
  Cliente[Frontend] --> API[API]
  API --> DB[(Base de datos)]
  API --> Ext[Servicio externo]
​```

| Componente | Responsabilidad | Ubicación |
|---|---|---|
| <API> | <qué hace> | `src/api/` |

## Flujos principales
<1-3 flujos que expliquen cómo funciona el sistema: p. ej. autenticación, petición típica, procesamiento en segundo plano. Usa sequenceDiagram si ayuda.>

## Decisiones clave
- **<Decisión>**: <por qué se tomó / qué implica>.

## Puntos delicados
- <Acoplamientos, deuda técnica o trampas que conviene conocer antes de tocar.>
```

---

## estructura.md

```markdown
# Estructura del proyecto

​```
<raíz>/
├── src/
│   ├── api/          # Rutas y controladores HTTP
│   ├── services/     # Lógica de negocio
│   └── models/       # Entidades y acceso a datos
├── tests/            # Tests unitarios e integración
└── scripts/          # Utilidades de mantenimiento
​```
<Solo niveles que aporten. Comenta cada carpeta en pocas palabras.>

## Convenciones
- <Nombres de archivos, dónde va cada tipo de código, cómo añadir una nueva feature/módulo.>
```

---

## stack.md

```markdown
# Stack tecnológico

| Categoría | Tecnología | Versión | Uso |
|---|---|---|---|
| Lenguaje | <TypeScript> | <5.x> | |
| Framework | | | |
| Base de datos | | | |
| ORM / acceso a datos | | | |
| Auth | | | |
| Testing | | | |
| Build / tooling | | | |
| Infra / despliegue | | | |

## Dependencias destacadas
- **<librería>**: <por qué es relevante; omite las triviales.>
```

---

## modelos.md

```markdown
# Modelos de datos

<Dónde se definen (ORM, esquema, migraciones) y tipo de BD.>

​```mermaid
erDiagram
  USER ||--o{ ORDER : realiza
  ORDER ||--|{ ORDER_ITEM : contiene
​```

## <Entidad>
<Propósito en una frase.> — `ruta/al/modelo`

| Campo | Tipo | Notas |
|---|---|---|
| <solo campos relevantes: ids, FKs, estados, campos con lógica> | | |

<Reglas de negocio o restricciones importantes (estados posibles, unicidad, borrado lógico…).>
```

---

## modulos.md

```markdown
# Módulos y clases clave

<Solo los que concentran lógica o son puntos de extensión. Agrupa por capa o dominio.>

## <Dominio / capa>

### `NombreClase` — `ruta/archivo`
<Responsabilidad en 1-2 frases.>
- **Depende de:** <otras clases/servicios>
- **Métodos clave:** `metodo()` — <qué hace, solo los no obvios>
- **Notas:** <efectos secundarios, transacciones, caché, eventos que emite…>

<Si ayuda, un classDiagram Mermaid con las relaciones principales.>
```

---

## api.md

```markdown
# API

**Base URL:** `<…>` · **Auth:** <JWT/sesión/API key, cómo se envía> · **Formato de error:** <estructura>

## <Recurso>
| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/users/:id` | <…> | Sí |

<Ejemplos de request/response solo para endpoints no triviales.>
```

---

## configuracion.md

```markdown
# Configuración y despliegue

## Variables de entorno
| Variable | Obligatoria | Descripción |
|---|---|---|
| `DATABASE_URL` | Sí | <…> |

## Entornos
<local / staging / producción y diferencias relevantes.>

## Despliegue y CI/CD
<Dónde se despliega, cómo se dispara, pasos del pipeline.>

## Servicios externos
| Servicio | Uso | Config |
|---|---|---|
```
