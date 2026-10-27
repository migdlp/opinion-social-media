# Supabase: conexión y acceso para colaboradores y agentes

La autorización posterior [D-VERCEL-001](decisiones.md) permite a Codex configurar y operar Vercel según [su guía](vercel-operacion.md). Las comprobaciones siguientes y las referencias a la pausa son históricas; prevalecen [AGENTS.md](../AGENTS.md) y las instrucciones posteriores del propietario. Esta autorización no abre cambios SQL ni Auth por anticipado.

## Conexión verificada

Comprobación de solo lectura realizada el 26 de octubre de 2026:

- El conector Supabase de esta conversación puede listar los dos proyectos y consultar sus bases de datos.
- Ambos están `ACTIVE_HEALTHY`. `SELECT 1` devolvió `connection_ok = 1` en ambos; base `postgres`.
- Ambos tienen el esquema `public` vacío: todavía no hay tablas ni RPC de la aplicación.
- El endpoint público `/auth/v1/settings` respondió HTTP 200 con la clave publicable de cada proyecto. Google figura deshabilitado en ambos.
- El acceso a la raíz `/rest/v1/` respondió HTTP 401, indicando que ese endpoint exige clave privilegiada. No se usó una clave privilegiada para esa prueba. Esto no invalida la comprobación de Auth ni demuestra un fallo de la clave publicable.
- La conexión Postgres directa por TCP, el login Google y un flujo de datos de la aplicación no están verificados. No hay tablas de aplicación para probar ese flujo todavía.

No se aplicó SQL de escritura, se habilitaron proveedores, se invitaron miembros ni se reanudó la implementación.

## Inventario

Organización: **Los tres cerditos**, identificador `drifadkhohwebqljdlvw`. Región: **Irlanda**, `eu-west-1`. PostgreSQL reportado: versión principal 17.

| Dato | Desarrollo | Producción |
|---|---|---|
| Nombre | `opinion-social-media-dev` | `opinion-social-media-prod` |
| Project ref | `ltlrujmqenhktiilsnis` | `qchpdrolulcgmiliysvr` |
| API URL | `https://ltlrujmqenhktiilsnis.supabase.co` | `https://qchpdrolulcgmiliysvr.supabase.co` |
| Dashboard | [Abrir desarrollo](https://supabase.com/dashboard/project/ltlrujmqenhktiilsnis) | [Abrir producción](https://supabase.com/dashboard/project/qchpdrolulcgmiliysvr) |
| Host Postgres directo | `db.ltlrujmqenhktiilsnis.supabase.co` | `db.qchpdrolulcgmiliysvr.supabase.co` |

Desarrollo local y previews usan desarrollo. No conectar previews a producción. La información del inventario identifica los destinos; no concede permisos por sí sola.

## 1. Otra persona que necesita usar el Dashboard

1. Pedirle que tenga su propia cuenta de Supabase.
2. Desde [Los tres cerditos → Team](https://supabase.com/dashboard/org/drifadkhohwebqljdlvw/team), enviar una invitación a su email y elegir el rol necesario.
3. Para trabajo habitual sobre datos, usar **Developer** cuando sus capacidades sean las necesarias. No permite cambiar ajustes del proyecto; configuración como OAuth puede requerir al propietario o un administrador.
4. La persona acepta la invitación y entra con su cuenta. Las invitaciones tienen una validez de 24 horas según la documentación actual.
5. Si el plan ofrece roles por proyecto, limitar el trabajo al proyecto de desarrollo.

**Alcance de los permisos:** los roles de organización alcanzan todos sus proyectos, incluidos producción y futuros proyectos. Los roles por proyecto, Read-Only y No-access dependen actualmente de planes Team/Enterprise. No se ha comprobado el plan contratado. Si no hay limitación por proyecto disponible, no asumir que una invitación Developer está limitada a desarrollo.

No compartir la cuenta del propietario ni su token personal para invitar colaboradores. Un rol Read-Only del Dashboard puede permitir ver secretos; no equivale simplemente a dar acceso a los datos públicos de la app.

## 2. Otro agente que necesita consultar Supabase

Clonar el repositorio no transmite la autorización del conector de esta conversación.

- En un cliente que tenga integración Supabase, conectar Supabase y completar OAuth con una cuenta autorizada en la organización.
- En un cliente compatible con MCP remoto, añadir el servidor oficial y completar su autorización OAuth.
- Si el cliente pertenece al mismo propietario, puede autenticar con su cuenta autorizada. Si pertenece a otra persona, esa persona necesita primero la invitación y permisos del apartado anterior.

Mientras el desarrollo siga pausado, utilizar este endpoint de **desarrollo y solo lectura**:

```text
https://mcp.supabase.com/mcp?project_ref=ltlrujmqenhktiilsnis&read_only=true
```

La forma del archivo de configuración depende del cliente. Por ejemplo, en clientes que aceptan `.mcp.json` con este formato:

```json
{
  "mcpServers": {
    "supabase-dev": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=ltlrujmqenhktiilsnis&read_only=true"
    }
  }
}
```

No se ha creado ese archivo en este repositorio: el usuario debe incorporar la configuración en su cliente concreto y autorizarla. Para otros clientes, seguir el formato específico en la [guía oficial de MCP](https://supabase.com/docs/guides/ai-tools/mcp).

Verificar después del login listando tablas o ejecutando `SELECT 1`; con alcance por proyecto pueden no estar disponibles las herramientas de listado de cuenta. Debe verse el proyecto de desarrollo. La ausencia de tablas en `public` es correcta en este momento.

La opción `project_ref` limita esa conexión MCP, pero no cambia los permisos de la cuenta en el Dashboard ni de otros tokens. `read_only=true` limita consultas de ese servidor; no sustituye la gestión de permisos del usuario.

El servidor alojado normalmente usa OAuth y no requiere copiar manualmente un token personal. Para automatización sin navegador, consultar [PAT de Supabase](https://supabase.com/docs/guides/platform/personal-access-tokens) y usar un token con alcance limitado si la cuenta dispone de esa funcionalidad. Guardarlo en el gestor de secretos del entorno; nunca en Git ni en el cuerpo de un issue.

## 3. Conectar la aplicación cuando se reanude el desarrollo

La aplicación necesita URL y **Publishable key** del mismo proyecto. Se pueden obtener desde el Dashboard, en la sección de claves API o el diálogo Connect. La clave moderna empieza por `sb_publishable_`.

Ejemplo para un fichero local `.env.local`, que no se versionará:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://ltlrujmqenhktiilsnis.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable-key-del-proyecto-de-desarrollo>
```

La clave publicable identifica el proyecto para clientes públicos; no es una contraseña administrativa y no permite saltarse RLS. La autorización de cada usuario depende de su sesión y de las políticas. No hace falta invitar como miembro de Supabase a cada persona que simplemente use la app.

Nunca poner `service_role`, claves `sb_secret_`, tokens personales o la contraseña Postgres en variables `NEXT_PUBLIC_*`. Las claves publicables existen y se han comprobado mediante Auth, pero no se fijan sus valores en Git para evitar copias desactualizadas; cada entorno debe obtenerlas del Dashboard del proyecto correspondiente.

Vercel tiene configuradas las variables públicas: desarrollo y preview usan el proyecto dev; producción usa el proyecto prod. Ver [configuración y evidencia](vercel-operacion.md). Esto no acredita clientes, políticas ni flujos de aplicación completos.

## 4. CLI de Supabase

Con la CLI instalada y revisada para su versión:

```bash
supabase --help
supabase login --help
supabase login
supabase projects list
```

Autenticar desde el entorno de la persona o agente; no copiar la sesión de este entorno. Los comandos de autenticación y listado se incluyen como instrucciones, no se han ejecutado para autenticar otra cuenta.

Cuando se reanude y se prepare la configuración local, la referencia para enlazar desarrollo será:

```bash
supabase link --help
supabase link --project-ref ltlrujmqenhktiilsnis
```

El enlace puede requerir configuración local y credenciales adicionales; no se ha ejecutado ahora. No ejecutar `db push`, migraciones o cambios de esquema durante la pausa.

## 5. Conexión directa a PostgreSQL

Para un cliente SQL o herramienta de migración, abrir **Connect** en el Dashboard del proyecto y copiar la cadena adecuada para esa red: conexión directa o pooler. Allí aparecen host, puerto, usuario y base exactos. Usar TLS según la cadena oficial.

La conexión directa habitual utiliza el host del inventario, puerto 5432, base `postgres` y usuario administrativo `postgres`. Las conexiones del pooler cambian host, puerto o usuario; no deducirlas a partir de esta tabla. Algunas redes requieren pooler por compatibilidad IPv4/IPv6.

La contraseña de PostgreSQL es distinta de la clave publicable y no se ha recuperado ni compartido. Si se necesita, facilitarla mediante un gestor de secretos autorizado o crear el acceso SQL adecuado cuando se autorice. No es necesaria para el MCP OAuth ni para el SDK público. Una conexión administrativa directa no representa los permisos RLS de un usuario de la aplicación.

## Qué debe hacer ahora el propietario

1. Para otro desarrollador: invitar su email desde Team con el alcance y rol apropiados.
2. Para otro agente: conectar Supabase en su cliente mediante OAuth y apuntar al MCP de desarrollo anterior, inicialmente de solo lectura.
3. Para conectar la app en su momento: proporcionar por configuración local/entorno la URL dev y su Publishable key.
4. Respetar el alcance vigente y las reservas publicadas en `main`: Vercel está autorizado; Google OAuth sigue pendiente de su tarea y credenciales. No inferir autorización SQL/Auth de la configuración de Vercel.

## Referencias verificadas

- [MCP oficial](https://supabase.com/docs/guides/ai-tools/mcp)
- [Roles e invitaciones](https://supabase.com/docs/guides/platform/access-control)
- [Claves API](https://supabase.com/docs/guides/api/api-keys)
- [Tokens personales](https://supabase.com/docs/guides/platform/personal-access-tokens)
