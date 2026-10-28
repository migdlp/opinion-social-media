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

// Enlace a /onboarding (elegir @usuario) que, al terminar, devuelve a una ruta local (V2-002).
export function onboardingPath(next: string | null | undefined): string {
  const safe = safeNextPath(next);
  return safe === "/" ? "/onboarding" : `/onboarding?next=${encodeURIComponent(safe)}`;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Opción elegida antes del login (V2-052, `?elige=<option_id>`). Sólo un UUID: cualquier otra cosa
// (ausente, repetida, texto libre) se ignora sin error. Quien la recibe aún comprueba que sea de la encuesta.
export function choiceFromParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" && UUID.test(value) ? value : undefined;
}
