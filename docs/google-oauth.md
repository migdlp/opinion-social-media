# Google OAuth: configuración (MVP-005)

**Estado:** pendiente de que una persona con acceso cree el cliente OAuth en Google Cloud y lo active en Supabase. Esta guía sigue la [documentación oficial de Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google) (consultada el 27-10-2026). El conector de Supabase no puede configurar Auth, así que estos pasos se hacen en los paneles.

**No pegues el Client Secret en el chat, en Git ni en issues.** Solo va en el panel de Supabase (Auth → Providers → Google). El Client ID no es secreto.

## URLs de este proyecto

| Concepto | Desarrollo (`ltlrujmqenhktiilsnis`) | Producción (`qchpdrolulcgmiliysvr`) |
|---|---|---|
| Callback de Supabase (va en Google) | `https://ltlrujmqenhktiilsnis.supabase.co/auth/v1/callback` | `https://qchpdrolulcgmiliysvr.supabase.co/auth/v1/callback` |
| Orígenes de la app (van en Google) | `http://localhost:3000` y la URL de cada preview | `https://opinion-social-media.vercel.app` |
| Site URL (Supabase) | `http://localhost:3000` | `https://opinion-social-media.vercel.app` |
| Redirect URLs permitidas (Supabase) | `http://localhost:3000/**` y `https://*-miguels-projects-b8307fdb.vercel.app/**` | `https://opinion-social-media.vercel.app/**` |

Previews y desarrollo usan el proyecto de desarrollo; producción solo el de producción ([entornos.md](entornos.md)). La ruta exacta de retorno de la app (`/auth/callback`) la implementa MVP-006; con los comodines `/**` de arriba no hace falta volver a tocar Supabase.

## 1. Google Cloud: cliente OAuth

1. En [Google Cloud Console](https://console.cloud.google.com/), crea o elige un proyecto (por ejemplo «Opinión»).
2. **Google Auth Platform → Branding:** nombre de la app («Opinión»), email de soporte y, cuando exista, el dominio. Audiencia **External**.
3. **Data Access (Scopes):** añade manualmente `openid`. `.../auth/userinfo.email` y `.../auth/userinfo.profile` vienen por defecto. No añadas más: los scopes sensibles obligan a una verificación de Google.
4. **Clients → Create client → Web application** (puede ser un cliente para dev y otro para prod, o uno con ambos):
   - **Authorized JavaScript origins:** los orígenes de la tabla.
   - **Authorized redirect URIs:** el callback de Supabase del proyecto o proyectos que use ese cliente.
5. **Create** y guarda el **Client ID** y el **Client Secret** en tu gestor de contraseñas.
6. Mientras la app esté en modo *Testing*, solo podrán entrar los usuarios de prueba que añadas en **Audience → Test users**. Para abrirla a todos, publica la app (*Publish app*).

## 2. Supabase: activar Google en desarrollo

En [Auth → Providers del proyecto de desarrollo](https://supabase.com/dashboard/project/ltlrujmqenhktiilsnis/auth/providers):

1. **Google → Enable**, pega el Client ID y el Client Secret y guarda.
2. **Email → desactivar** (o al menos «Allow new users to sign up» en off). El MVP no usa contraseñas propias (criterio 3); hoy está activado por defecto.
3. En [Auth → URL Configuration](https://supabase.com/dashboard/project/ltlrujmqenhktiilsnis/auth/url-configuration): **Site URL** y **Redirect URLs** de la columna de desarrollo.

Producción se configura igual con su columna cuando llegue MVP-049; no es necesario para cerrar MVP-005 en desarrollo.

## 3. Verificación (la hace el agente)

Cuando avises, el agente comprueba:

1. `GET /auth/v1/settings` de desarrollo devuelve `external.google: true` y `external.email: false`.
2. `GET /auth/v1/authorize?provider=google&redirect_to=http://localhost:3000/` redirige a `accounts.google.com` con el `redirect_uri` del callback de Supabase (criterio 1).
3. Con `redirect_to=https://sitio-ajeno.example/`, Supabase no usa ese destino: vuelve a la Site URL (criterio 2).
4. Con una cuenta de prueba, el inicio de sesión real termina en una URL permitida. Este paso necesita a una persona, porque Google no permite automatizarlo.
