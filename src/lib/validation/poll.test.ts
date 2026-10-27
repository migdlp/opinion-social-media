import { describe, expect, it } from "vitest";
import { validatePollInput } from "./poll";

const QUESTION_ERROR = "La pregunta debe tener entre 10 y 280 caracteres.";
const OPTION_LENGTH_ERROR = "Cada opción debe tener entre 1 y 100 caracteres.";
const DUPLICATE_ERROR = "Hay opciones repetidas.";

describe("validatePollInput (docs/contratos-api.md §1 y §2)", () => {
  it("acepta una encuesta válida", () => {
    expect(validatePollInput("¿Qué tomas por la mañana?", ["Café", "Té"])).toEqual({
      options: [undefined, undefined],
    });
  });

  it("valida la longitud de la pregunta tras normalizar espacios", () => {
    expect(validatePollInput("  corta    ", ["A", "B"]).question).toBe(QUESTION_ERROR);
    expect(validatePollInput("x".repeat(281), ["A", "B"]).question).toBe(QUESTION_ERROR);
    expect(validatePollInput("x".repeat(280), ["A", "B"]).question).toBeUndefined();
    // «¿Sí o no?» normalizado son 9 puntos de código; «¿Sí o nos?», 10.
    expect(validatePollInput("¿Sí  o   no?", ["A", "B"]).question).toBe(QUESTION_ERROR);
    expect(validatePollInput("¿Sí  o   nos?", ["A", "B"]).question).toBeUndefined();
  });

  it("señala cada opción vacía o de más de 100 caracteres", () => {
    const errors = validatePollInput("¿Qué tomas por la mañana?", ["   ", "Té", "x".repeat(101)]);
    expect(errors.options).toEqual([OPTION_LENGTH_ERROR, undefined, OPTION_LENGTH_ERROR]);
  });

  it("señala duplicados ignorando mayúsculas y espacios, pero no tildes", () => {
    const errors = validatePollInput("¿Qué tomas por la mañana?", ["Café", " café ", "Té"]);
    expect(errors.options).toEqual([DUPLICATE_ERROR, DUPLICATE_ERROR, undefined]);
    expect(validatePollInput("¿Contestas que sí?", ["Sí", "Si"]).options).toEqual([
      undefined,
      undefined,
    ]);
  });
});
