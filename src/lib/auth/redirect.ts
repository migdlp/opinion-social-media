const CALLBACK_PATH = "/auth/callback";

// Destino de retorno tras autenticarse. Sólo se aceptan rutas locales: empiezan por una
// sola «/», sin barras invertidas ni caracteres de control (los navegadores los
// normalizan y convertirían «/\ajeno.example» en un salto a otro sitio) y no apuntan al
// propio callback. Cualquier otra cosa vuelve al destino por defecto.
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(next)) return fallback;
  if (next === CALLBACK_PATH || next.startsWith(`${CALLBACK_PATH}?`)) return fallback;
  return next;
}

// Enlace a /login que, tras autenticarse, devuelve a una ruta local (MVP-027).
export function loginPath(next: string): string {
  return `/login?next=${encodeURIComponent(safeNextPath(next))}`;
}
