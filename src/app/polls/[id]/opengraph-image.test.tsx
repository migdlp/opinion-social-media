import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, networkThrow, type FakeResponse } from "@/lib/data/testing/fake-supabase";

let responses: Record<string, FakeResponse | FakeResponse[]> = {};
let queries: ReturnType<typeof fakeSupabase>["queries"] = [];
let rendered = "";
vi.mock("@/lib/supabase/anonymous", () => ({
  createAnonymousClient: () => {
    const fake = fakeSupabase(responses);
    queries = fake.queries;
    return fake.supabase;
  },
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => {
    throw new Error("Las imágenes no deben leer cookies de sesión");
  },
}));
vi.mock("next/og", () => ({
  ImageResponse: class extends Response {
    constructor(element: React.ReactElement, options: { width: number; height: number }) {
      rendered = renderToStaticMarkup(element);
      expect(options).toMatchObject({ width: 1200, height: 630 });
      super("", { headers: { "content-type": "image/png" } });
    }
  },
}));
const { default: PollImage } = await import("./opengraph-image");
const ID = "11111111-2222-4333-8444-555555555555";
const row = {
  id: ID,
  question: "¿Tortilla con o sin cebolla?",
  created_at: "2026-10-27T19:00:00Z",
  closes_at: "2026-10-27T20:00:00Z",
  poll_options: [
    { id: "a", text: "Con cebolla", position: 1 },
    { id: "b", text: "Sin cebolla", position: 2 },
  ],
  total_votes: 99999,
};
beforeEach(() => {
  responses = {};
  queries = [];
  rendered = "";
});
describe("imagen social anónima", () => {
  it("compone una imagen 1200×630 con pregunta, opciones y autor, sin cifras incluso cerrada", async () => {
    responses = {
      polls: { data: row, error: null },
      "rpc:get_poll_authors": {
        data: [{ poll_id: ID, username: "ana_23", display_name: "Nombre privado" }],
        error: null,
      },
    };
    const response = await PollImage({ params: Promise.resolve({ id: ID }) });
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(rendered).toContain(row.question);
    expect(rendered).toContain("Con cebolla");
    expect(rendered).toContain("Sin cebolla");
    expect(rendered).toContain("@ana_23");
    expect(rendered).not.toMatch(/99999|Nombre privado|recuento|porcentaje|votos/);
    expect(queries.map((q) => q.target)).toEqual(["polls", "rpc:get_poll_authors"]);
  });
  it.each([true, false])(
    "mantiene identidad After Sunset sin destacar ninguna opción (pública=%s)",
    async (available) => {
      responses = { polls: { data: available ? row : null, error: null } };
      await PollImage({ params: Promise.resolve({ id: ID }) });
      const design = readFileSync(new URL("../../../../DESIGN.md", import.meta.url), "utf8");
      const color = (name: string) =>
        design.match(new RegExp(`^  ${name}: "(#[0-9a-f]{6})"`, "im"))![1].toLowerCase();
      expect(rendered).toContain(`background:${color("background-dark")}`);
      expect(rendered).toContain(`color:${color("foreground-dark")}`);
      expect(rendered).toContain(color("accent-dark"));
      expect(rendered).toContain(color("accent-soft-dark"));
      expect(rendered).not.toMatch(/#f4f4f5|#0a0a0b|#5e5e66/);
      if (available)
        expect(rendered.split(`background:${color("surface-dark")}`).length - 1).toBe(
          row.poll_options.length,
        );
    },
  );

  it("abrevia tokens sin espacios para evitar que invadan las otras opciones", async () => {
    responses = {
      polls: {
        data: {
          ...row,
          question: "W".repeat(280),
          poll_options: Array.from({ length: 6 }, (_, i) => ({
            id: String(i),
            text: "W".repeat(100),
            position: i,
          })),
        },
        error: null,
      },
    };
    await PollImage({ params: Promise.resolve({ id: ID }) });
    expect(rendered).toContain("W".repeat(19) + "…");
    expect(rendered).not.toContain("W".repeat(21));
  });
  it.each(["privada", "oculta", "inexistente"])(
    "usa sólo la marca para una encuesta %s",
    async () => {
      responses = { polls: { data: null, error: null } };
      const response = await PollImage({ params: Promise.resolve({ id: ID }) });
      await response.arrayBuffer();
      expect(rendered).toContain("Opinión");
      expect(rendered).not.toContain(row.question);
      expect(queries.map((q) => q.target)).toEqual(["polls"]);
    },
  );
  it("un UUID inválido no consulta datos", async () => {
    const response = await PollImage({ params: Promise.resolve({ id: "invalido" }) });
    await response.arrayBuffer();
    expect(queries).toEqual([]);
    expect(rendered).toContain("Opinión");
  });
  it("si falla la red devuelve la imagen genérica sin errores internos", async () => {
    responses = { polls: networkThrow };
    const response = await PollImage({ params: Promise.resolve({ id: ID }) });
    await response.arrayBuffer();
    expect(rendered).toContain("Opinión");
    expect(rendered).not.toMatch(/fetch|SQL|error/i);
  });
});
