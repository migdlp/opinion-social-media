// Fecha aproximada de una encuesta en español: relativa la primera semana y fecha
// corta después. Recibe «ahora» para que el resultado sea predecible y comprobable.

const relative = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const shortDate = new Intl.DateTimeFormat("es-ES", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Madrid",
});

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatApproximateDate(iso: string, now: Date): string {
  const date = new Date(iso);
  const elapsed = now.getTime() - date.getTime();

  if (elapsed < MINUTE) return "hace un momento";
  if (elapsed < HOUR) return relative.format(-Math.floor(elapsed / MINUTE), "minute");
  if (elapsed < DAY) return relative.format(-Math.floor(elapsed / HOUR), "hour");
  if (elapsed < 7 * DAY) return relative.format(-Math.floor(elapsed / DAY), "day");
  return shortDate.format(date);
}

// Una encuesta se cierra exactamente en closes_at (el servidor rechaza votos con now() >= closes_at).
export function isClosed(closesAt: string | null | undefined, now: Date): boolean {
  return Boolean(closesAt) && new Date(closesAt as string).getTime() <= now.getTime();
}

function duration(ms: number): string {
  if (ms < HOUR) return `${Math.floor(ms / MINUTE)} min`;
  if (ms < DAY) return `${Math.floor(ms / HOUR)} h`;
  const days = Math.floor(ms / DAY);
  return days === 1 ? "1 día" : `${days} días`;
}

// «Cierra en 3 h» mientras está abierta; «Cerrada hace 2 días» después.
export function formatCloseStatus(closesAt: string, now: Date): string {
  const remaining = new Date(closesAt).getTime() - now.getTime();
  if (remaining > 0)
    return remaining < MINUTE ? "Cierra en menos de 1 min" : `Cierra en ${duration(remaining)}`;
  const elapsed = -remaining;
  return elapsed < MINUTE ? "Cerrada hace un momento" : `Cerrada hace ${duration(elapsed)}`;
}
