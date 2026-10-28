import { describe, expect, it } from "vitest";
import { formatApproximateDate, formatCloseStatus, isClosed } from "./date";

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

const at = (ms: number) => new Date(NOW.getTime() + ms).toISOString();

describe("formatCloseStatus", () => {
  it("cuenta el tiempo restante de una encuesta abierta", () => {
    expect(formatCloseStatus(at(30 * 1000), NOW)).toBe("Cierra en menos de 1 min");
    expect(formatCloseStatus(at(25 * MIN), NOW)).toBe("Cierra en 25 min");
    expect(formatCloseStatus(at(3 * HOUR + 10 * MIN), NOW)).toBe("Cierra en 3 h");
    expect(formatCloseStatus(at(1 * DAY), NOW)).toBe("Cierra en 1 día");
    expect(formatCloseStatus(at(2 * DAY + 5 * HOUR), NOW)).toBe("Cierra en 2 días");
  });

  it("indica cuánto hace que se cerró", () => {
    expect(formatCloseStatus(at(0), NOW)).toBe("Cerrada hace un momento");
    expect(formatCloseStatus(at(-5 * MIN), NOW)).toBe("Cerrada hace 5 min");
    expect(formatCloseStatus(at(-2 * HOUR), NOW)).toBe("Cerrada hace 2 h");
    expect(formatCloseStatus(at(-2 * DAY), NOW)).toBe("Cerrada hace 2 días");
  });
});

describe("isClosed", () => {
  it("cierra exactamente en closes_at y nunca sin fecha", () => {
    expect(isClosed(at(1000), NOW)).toBe(false);
    expect(isClosed(at(0), NOW)).toBe(true);
    expect(isClosed(at(-1000), NOW)).toBe(true);
    expect(isClosed(null, NOW)).toBe(false);
    expect(isClosed(undefined, NOW)).toBe(false);
  });
});
