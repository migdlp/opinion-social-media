import { describe, expect, it } from "vitest";
import { loginPath, onboardingPath, safeNextPath } from "./redirect";

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

describe("loginPath", () => {
  it("lleva a /login con la ruta local codificada", () => {
    expect(loginPath("/polls/abc?x=1")).toBe("/login?next=%2Fpolls%2Fabc%3Fx%3D1");
  });

  it("sustituye un destino externo por /", () => {
    expect(loginPath("https://ajeno.example/")).toBe("/login?next=%2F");
  });
});

describe("onboardingPath", () => {
  it("lleva a /onboarding conservando un destino local", () => {
    expect(onboardingPath("/polls/abc")).toBe("/onboarding?next=%2Fpolls%2Fabc");
  });

  it("sin destino o con uno externo no añade next", () => {
    expect(onboardingPath("/")).toBe("/onboarding");
    expect(onboardingPath("//ajeno.example")).toBe("/onboarding");
    expect(onboardingPath(undefined)).toBe("/onboarding");
  });
});
