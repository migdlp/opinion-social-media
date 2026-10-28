import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, networkThrow, type FakeResponse } from "@/lib/data/testing/fake-supabase";

let responses: Record<string, FakeResponse | FakeResponse[]> = {};
let queries: ReturnType<typeof fakeSupabase>["queries"] = [];
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const fake = fakeSupabase(responses);
    queries = fake.queries;
    return {
      ...fake.supabase,
      // Aunque haya sesión, los metadatos nunca deben leer votos ni resultados.
      auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
    };
  },
}));

const { pollMetadata } = await import("./metadata");

const ID = "11111111-2222-4333-8444-555555555555";
const row = {
  id: ID,
  question: "¿Tortilla con o sin cebolla?",
  created_at: "2026-10-27T19:00:00Z",
  poll_options: [
    { id: "a", text: "Con cebolla", position: 1 },
    { id: "b", text: "Sin cebolla", position: 2 },
  ],
};

beforeEach(() => {
  responses = {};
  queries = [];
});

describe("pollMetadata (/polls/[id])", () => {
  it("una encuesta pública comparte su pregunta y opciones, sin resultados", async () => {
    responses = { polls: { data: row, error: null } };

    const metadata = await pollMetadata(ID);

    expect(metadata.title).toBe(row.question);
    expect(metadata.description).toBe("Con cebolla · Sin cebolla. Vota para ver los resultados.");
    expect(metadata.openGraph).toMatchObject({
      title: row.question,
      description: metadata.description,
      type: "website",
    });
    // Sin metadataBase, og:url saldría relativa; los rastreadores usan la URL visitada.
    expect(metadata.openGraph).not.toHaveProperty("url");
    expect(metadata.twitter).toMatchObject({ card: "summary", title: row.question });
    expect(JSON.stringify(metadata)).not.toMatch(/\d\s*%|\bvotos\b|total/i);
    // Sólo se consulta la encuesta pública: nada de votos ni del RPC de resultados.
    expect(queries.map((q) => q.target)).toEqual(["polls"]);
  });

  it("una encuesta inexistente u oculta no revela nada y no se indexa", async () => {
    responses = { polls: { data: null, error: null } };

    const metadata = await pollMetadata(ID);

    expect(metadata).toEqual({ title: "No disponible", robots: { index: false } });
  });

  it("un id mal formado ni siquiera consulta la base de datos", async () => {
    const metadata = await pollMetadata("no-es-un-uuid");

    expect(metadata).toEqual({ title: "No disponible", robots: { index: false } });
    expect(queries).toEqual([]);
  });

  it("un fallo de red deja los metadatos generales del sitio", async () => {
    responses = { polls: networkThrow };

    expect(await pollMetadata(ID)).toEqual({});
  });
});
