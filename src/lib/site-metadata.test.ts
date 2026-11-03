// META-001: la tarjeta social por defecto de «Opinión» la heredan las páginas sin metadatos propios.
import { describe, expect, it } from "vitest";
import { siteMetadata as metadata } from "./site-metadata";

describe("metadatos del layout (META-001)", () => {
  const description = "Encuestas públicas: vota y descubre qué opinan los demás.";

  it("conserva el título y la descripción", () => {
    expect(metadata.title).toBe("Opinión");
    expect(metadata.description).toBe(description);
  });

  it("define Open Graph con el nombre de la app", () => {
    expect(metadata.openGraph).toMatchObject({
      title: "Opinión",
      description,
      type: "website",
      siteName: "Opinión",
      locale: "es_ES",
    });
  });

  it("define la tarjeta de Twitter con el mismo texto", () => {
    expect(metadata.twitter).toMatchObject({ card: "summary", title: "Opinión", description });
  });

  it("no añade imagen ni datos de ninguna cuenta: es una tarjeta estática", () => {
    expect(JSON.stringify(metadata)).not.toMatch(/images|@/);
  });
});
