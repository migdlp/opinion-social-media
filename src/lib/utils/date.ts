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
