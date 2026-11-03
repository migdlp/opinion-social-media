import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AVATAR_ICONS, isAvatarIcon, parseAvatarIcon } from "./avatar-icons";

describe("catálogo de iconos de perfil (AVATAR-001)", () => {
  it("tiene identificadores únicos, etiqueta y dibujo para cada icono", () => {
    expect(new Set(AVATAR_ICONS.map((i) => i.id)).size).toBe(AVATAR_ICONS.length);
    for (const icon of AVATAR_ICONS) {
      expect(icon.id).toMatch(/^[a-z]+$/);
      expect(icon.label.length).toBeGreaterThan(2);
      expect(icon.paths.length).toBeGreaterThan(0);
    }
  });

  it("coincide con el catálogo cerrado de la base de datos", () => {
    const sql = readFileSync("supabase/migrations/20261029190000_profile_avatar.sql", "utf8");
    const check = sql.match(/avatar_icon in\s*\(([^)]*)\)/)?.[1] ?? "";
    const inDb = [...check.matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    expect([...inDb].sort()).toEqual(AVATAR_ICONS.map((i) => i.id).sort());
  });

  it("parseAvatarIcon sólo acepta identificadores del catálogo", () => {
    expect(parseAvatarIcon("sol")).toBe("sol");
    for (const bad of [null, undefined, "", "SOL", "desconocido", 3, {}, "https://x.test/a.png"]) {
      expect(parseAvatarIcon(bad)).toBeNull();
    }
    expect(isAvatarIcon("luna")).toBe(true);
    expect(isAvatarIcon("nada")).toBe(false);
  });
});
