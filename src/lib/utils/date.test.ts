import { describe, expect, it } from "vitest";
import { formatApproximateDate } from "./date";

const NOW = new Date("2026-10-27T20:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("formatApproximateDate", () => {
  it("usa expresiones relativas para fechas recientes", () => {
    expect(formatApproximateDate(ago(20_000), NOW)).toBe("hace un momento");
    expect(formatApproximateDate(ago(5 * MIN), NOW)).toBe("hace 5 minutos");
    expect(formatApproximateDate(ago(3 * HOUR), NOW)).toBe("hace 3 horas");
    expect(formatApproximateDate(ago(1 * DAY), NOW)).toBe("ayer");
    expect(formatApproximateDate(ago(4 * DAY), NOW)).toBe("hace 4 días");
  });

  it("usa la fecha corta a partir de una semana", () => {
    expect(formatApproximateDate("2026-09-02T10:00:00Z", NOW)).toBe("2 sept 2026");
  });

  it("no muestra fechas futuras por desfase de reloj", () => {
    expect(formatApproximateDate(ago(-2 * MIN), NOW)).toBe("hace un momento");
  });
});
