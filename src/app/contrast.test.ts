// V2-017: contraste de los tokens de color (WCAG 2.x). Lee globals.css para que un cambio de
// tokens no pueda romper el contraste sin que falle este test.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");

function tokens(block: string): Record<string, string> {
  return Object.fromEntries(
    [...block.matchAll(/--([a-z-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1], m[2]]),
  );
}
const light = tokens(css.match(/:root\s*\{([^}]*)\}/)![1]);
const dark = tokens(css.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/)![1]);

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const f = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// [primer plano, fondo, mínimo]: 4,5 para texto; 3 para barras y bordes con significado.
const TEXT = 4.5;
const GRAPHIC = 3;
const PAIRS: [string, string, number][] = [
  ["foreground", "background", TEXT],
  ["foreground", "surface", TEXT],
  ["foreground", "track", TEXT],
  ["muted", "background", TEXT],
  ["muted", "surface", TEXT],
  ["muted", "track", TEXT],
  ["danger", "background", TEXT],
  ["danger", "surface", TEXT],
  ["field", "surface", GRAPHIC],
  ["field", "background", GRAPHIC],
  ["bar-outline", "track", GRAPHIC],
  ["bar-outline", "surface", GRAPHIC],
  ["foreground", "track", GRAPHIC],
  ["accent-foreground", "accent", TEXT],
  ["accent-foreground", "accent-hover", TEXT],
  ["focus", "surface", GRAPHIC],
  ["focus", "background", GRAPHIC],
  ["foreground", "option-selected", TEXT],
  ["focus", "option-selected", GRAPHIC],
  ["foreground", "result-own", TEXT],
  ["foreground", "option-surface", TEXT],
  ["muted", "disabled-bg", TEXT],
  ["option-selected-border", "option-selected", GRAPHIC],
];

describe.each([
  ["claro", light],
  ["oscuro", dark],
])("contraste de los tokens (%s)", (_name, theme) => {
  it("define todos los tokens", () => {
    for (const name of [
      "background",
      "surface",
      "foreground",
      "muted",
      "border",
      "track",
      "bar-muted",
      "field",
      "danger",
      "accent",
      "accent-foreground",
      "accent-hover",
      "accent-soft",
      "focus",
      "bar-own",
      "bar-outline",
      "option-selected",
      "option-selected-border",
      "option-surface",
      "result-own",
      "disabled-bg",
    ])
      expect(theme[name], name).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it.each(PAIRS)("%s sobre %s ≥ %s:1", (fg, bg, min) => {
    expect(ratio(theme[fg], theme[bg]), `${fg}/${bg}`).toBeGreaterThanOrEqual(min);
  });
});

describe("tema oscuro", () => {
  it("permite forzar claro aunque el sistema sea oscuro y forzar oscuro en cualquier sistema", () => {
    expect(css).not.toContain("prefers-color-scheme");
    const manual = css.match(/:root\[data-theme="dark"\]\s*\{([^}]*)\}/)?.[1];
    expect(tokens(manual ?? "")).toEqual(dark);
  });
  it("invierte el claro: fondo oscuro y texto claro", () => {
    expect(luminance(dark.background)).toBeLessThan(0.05);
    expect(luminance(dark.foreground)).toBeGreaterThan(0.8);
    expect(luminance(light.background)).toBeGreaterThan(0.8);
  });
});

// La identidad aprobada es el contrato; no basta que otra paleta también tenga contraste.
const design = readFileSync(new URL("../../DESIGN.md", import.meta.url), "utf8");
const approved = Object.fromEntries(
  [...design.matchAll(/^  ([a-z-]+): "(#[0-9a-f]{6})"/gim)].map((m) => [m[1], m[2].toLowerCase()]),
);
describe.each([
  ["claro", light, ""],
  ["oscuro", dark, "-dark"],
] as const)("identidad After Sunset (%s)", (_name, theme, suffix) => {
  it("aplica la paleta aprobada y el acento cálido, sin cambiar el contraste según el tema", () => {
    for (const name of [
      "background",
      "surface",
      "foreground",
      "muted",
      "border",
      "track",
      "field",
      "bar-muted",
      "accent",
      "accent-soft",
      "danger",
    ])
      expect(theme[name]?.toLowerCase(), name).toBe(approved[name + suffix]);
    expect(theme["accent-foreground"]?.toLowerCase()).toBe("#161e2e");
  });
});
