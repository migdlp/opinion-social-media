import { describe, expect, it } from "vitest";
import { pageTitle, profileTitle } from "./page-titles";

describe("pageTitle", () => {
  it("añade el nombre de la app al final", () => {
    expect(pageTitle("Iniciar sesión")).toBe("Iniciar sesión · Opinión");
  });
});

describe("profileTitle (DESIGN-011)", () => {
  it("usa sólo el @usuario de la URL, normalizado a minúsculas", () => {
    expect(profileTitle("Ana_23")).toBe("@ana_23 · Opinión");
  });

  it("admite un prefijo para las listas de seguidores", () => {
    expect(profileTitle("ana_23", "Seguidores de ")).toBe("Seguidores de @ana_23 · Opinión");
    expect(profileTitle("ana_23", "Siguiendo de ")).toBe("Siguiendo de @ana_23 · Opinión");
  });

  it.each(["", "1ana", "an", "ana-23", "ana 23", "<script>", "a".repeat(21), "ñandú_1"])(
    "un nombre que no puede existir (%j) recibe el título genérico, sin repetir la URL",
    (bad) => {
      expect(profileTitle(bad)).toBe("No disponible · Opinión");
      expect(profileTitle(bad, "Seguidores de ")).toBe("No disponible · Opinión");
    },
  );
});
