import { describe, expect, it } from "vitest";
import { codePointLength, normalizeText } from "./text";

describe("normalizeText", () => {
  it("recorta extremos y colapsa espacios, tabuladores y saltos de línea", () => {
    expect(normalizeText("  ¿Café \t o\n\n  té?  ")).toBe("¿Café o té?");
  });

  it("conserva mayúsculas y tildes", () => {
    expect(normalizeText("Sí")).toBe("Sí");
  });

  it("deja vacía una cadena sólo de espacios", () => {
    expect(normalizeText(" \t\n ")).toBe("");
  });
});

describe("codePointLength", () => {
  it("cuenta puntos de código, no unidades UTF-16", () => {
    expect(codePointLength("😀")).toBe(1);
    expect("😀".length).toBe(2);
    expect(codePointLength("año")).toBe(3);
  });
});
