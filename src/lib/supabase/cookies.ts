// Cookies de autenticación (AUTH-001).
// @supabase/ssr pide 400 días de vida a cada cookie de sesión y de verificador PKCE y no admite
// otro valor mediante `cookieOptions` (los pisa al escribir). Estos adaptadores reescriben las
// opciones justo antes de guardarlas, igual en navegador, servidor y proxy, y añaden `Secure`
// sólo sobre HTTPS (en desarrollo local por HTTP una cookie Secure no se guardaría).
// HttpOnly sigue en false: el cliente de navegador necesita leer la sesión (decisión de
// integración del SDK, no un descuido).

// Propuesta pendiente de la revisión legal (docs/cookies-auth.md): 30 días. Cada escritura la
// renueva, de modo que equivale a 30 días de inactividad.
export const AUTH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

// El verificador PKCE sólo hace falta durante el viaje a Google y de vuelta: 30 minutos. Si el
// login se cancela, no queda en el navegador más tiempo (el SDK lo borra al canjear el código).
export const PKCE_COOKIE_MAX_AGE = 30 * 60;

const PKCE_NAME =
  /-(?:flows?-[A-Za-z0-9_-]+-)?code-verifier(?:\.\d+)?$|-flows-code-verifier(?:\.\d+)?$/;

export type CookieOptions = {
  path?: string;
  domain?: string;
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
  expires?: Date;
};

export type CookieToSet = { name: string; value: string; options?: CookieOptions };

// El borrado (maxAge 0) se conserva; cualquier otra vida se acorta a la elegida.
export function hardenAuthCookies(cookies: CookieToSet[], secure: boolean): CookieToSet[] {
  return cookies.map(({ name, value, options }) => {
    const next: CookieOptions = { ...options };
    if (next.maxAge === undefined || next.maxAge > 0) {
      const limit = PKCE_NAME.test(name) ? PKCE_COOKIE_MAX_AGE : AUTH_COOKIE_MAX_AGE;
      next.maxAge = Math.min(next.maxAge ?? limit, limit);
    }
    if (secure) next.secure = true;
    return { name, value, options: next };
  });
}

export function isSecureRequest(headers: Headers, url?: string): boolean {
  const forwarded = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwarded) return forwarded === "https";
  return url !== undefined && url.startsWith("https:");
}

function serializeCookie({ name, value, options = {} }: CookieToSet): string {
  const parts = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`];
  if (options.maxAge !== undefined) parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  if (options.domain) parts.push(`Domain=${options.domain}`);
  parts.push(`Path=${options.path ?? "/"}`);
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.httpOnly) parts.push("HttpOnly");
  if (options.secure) parts.push("Secure");
  if (options.sameSite) {
    const site = options.sameSite === true ? "strict" : options.sameSite;
    parts.push(`SameSite=${site.charAt(0).toUpperCase()}${site.slice(1)}`);
  }
  return parts.join("; ");
}

// Adaptador para createBrowserClient: lee y escribe document.cookie con las opciones endurecidas.
export function browserCookieAdapter() {
  return {
    getAll() {
      return document.cookie
        .split(";")
        .map((pair) => pair.trim())
        .filter(Boolean)
        .map((pair) => {
          const index = pair.indexOf("=");
          const raw = index === -1 ? pair : pair.slice(0, index);
          const value = index === -1 ? "" : pair.slice(index + 1);
          const decode = (text: string) => {
            try {
              return decodeURIComponent(text);
            } catch {
              return text;
            }
          };
          return { name: decode(raw), value: decode(value) };
        });
    },
    setAll(cookies: CookieToSet[]) {
      for (const cookie of hardenAuthCookies(cookies, location.protocol === "https:")) {
        document.cookie = serializeCookie(cookie);
      }
    },
  };
}
