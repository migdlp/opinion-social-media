import { describe, expect, it } from "vitest";
import { safeNextPath } from "./redirect";

describe("safeNextPath", () => {
  it.each([
    ["/", "/"],
    ["/create", "/create"],
    ["/polls/abc?x=1#h", "/polls/abc?x=1#h"],
  ])("acepta la ruta local %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    ["URL absoluta", "https://sitio-ajeno.example/"],
    ["protocolo relativo", "//sitio-ajeno.example"],
    ["barra invertida", "/\\sitio-ajeno.example"],
    ["barra invertida doble", "/\\/sitio-ajeno.example"],
    ["sin barra inicial", "polls/1"],
    ["javascript:", "javascript:alert(1)"],
    ["salto de línea", "/ok\n//ajeno.example"],
    ["tabulador tras la barra", "/\t/ajeno.example"],
    ["vacío", ""],
  ])("rechaza %s y vuelve a /", (_name, input) => {
    expect(safeNextPath(input)).toBe("/");
  });

  it("usa el destino por defecto indicado cuando no hay parámetro", () => {
    expect(safeNextPath(null, "/create")).toBe("/create");
    expect(safeNextPath(undefined)).toBe("/");
  });

  it("evita el bucle del propio callback", () => {
    expect(safeNextPath("/auth/callback?code=1")).toBe("/");
  });
});
