// V2-006: HTML SSR de /u/[username]. Una cuenta privada sin acceso muestra sólo cabecera y aviso,
// y ni sus encuestas ni sus votos llegan al HTML (criterio 2); una inexistente responde 404.
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeResponse } from "@/lib/data/testing/fake-supabase";

let responses: Record<string, FakeResponse | FakeResponse[]> = {};
let queries: ReturnType<typeof fakeSupabase>["queries"] = [];
let user: { id: string } | null = null;
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const fake = fakeSupabase(responses);
    queries = fake.queries;
    return { ...fake.supabase, auth: { getUser: async () => ({ data: { user }, error: null }) } };
  },
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
}));

const { ProfileContent } = await import("./profile-content");

const ID = "11111111-2222-4333-8444-555555555555";
const header = (over: Record<string, unknown> = {}) => ({
  username: "perfil_b",
  display_name: "Beto",
  is_private: false,
  followers_count: 2,
  following_count: 1,
  polls_count: 1,
  viewer_relation: "none",
  can_view_content: true,
  ...over,
});
const pollRow = {
  id: ID,
  question: "¿Tortilla con o sin cebolla?",
  created_at: "2026-10-27T19:00:00Z",
  closes_at: null,
  category: null,
  poll_options: [
    { id: "a", text: "Con cebolla", position: 1 },
    { id: "b", text: "Sin cebolla", position: 2 },
  ],
};
const render = async (tab?: string, username = "perfil_b") =>
  renderToStaticMarkup(
    await ProfileContent({
      params: Promise.resolve({ username }),
      searchParams: Promise.resolve(tab ? { tab } : {}),
    }),
  );

beforeEach(() => {
  responses = {};
  user = null;
});

describe("/u/[username]", () => {
  it("un perfil público para un visitante: cabecera, pestañas, encuestas y «Seguir» hacia el login", async () => {
    responses = {
      "rpc:get_profile": { data: [header()], error: null },
      "rpc:get_profile_polls": {
        data: [{ poll_id: ID, created_at: "2026-10-27T19:00:00Z", cursor: "c" }],
        error: null,
      },
      polls: { data: [pollRow], error: null },
      "rpc:get_poll_authors": { data: [], error: null },
    };

    const html = await render();

    expect(html).toContain("Beto");
    expect(html).toContain("@perfil_b");
    expect(html).toContain("¿Tortilla con o sin cebolla?");
    expect(html).toMatch(/aria-current="page"[^>]*>Creadas/);
    expect(html).toContain("Votadas");
    expect(html).toContain(`href="/login?next=${encodeURIComponent("/u/perfil_b")}"`);
    expect(html).not.toMatch(/user_id/);
  });

  it("la pestaña ?tab=votadas lista los votos visibles (P-1) sin cifras", async () => {
    responses = {
      "rpc:get_profile": { data: [header()], error: null },
      "rpc:get_profile_votes": {
        data: [
          {
            poll_id: ID,
            question: "¿Tortilla con o sin cebolla?",
            poll_created_at: "2026-10-27T19:00:00Z",
            closes_at: null,
            author_username: null,
            author_display_name: null,
            voted_at: "2026-10-28T10:00:00Z",
            option_id: null,
            option_text: null,
            choice_hidden: true,
            cursor: "c",
          },
        ],
        error: null,
      },
    };

    const html = await render("votadas");

    expect(html).toMatch(/aria-current="page"[^>]*>Votadas/);
    expect(html).toContain("Votó · vota para ver su elección");
    expect(html).not.toMatch(/\d\s*%/);
    expect(queries.map((q) => q.target)).not.toContain("rpc:get_profile_polls");
  });

  it("criterio 2: una cuenta privada sin acceso sólo muestra cabecera y aviso, sin pedir encuestas ni votos", async () => {
    responses = {
      "rpc:get_profile": {
        data: [header({ is_private: true, can_view_content: false, polls_count: 7 })],
        error: null,
      },
      "rpc:get_profile_polls": {
        data: [{ poll_id: ID, created_at: "x", cursor: "c" }],
        error: null,
      },
      polls: { data: [pollRow], error: null },
      "rpc:get_profile_votes": { data: [], error: null },
    };

    for (const tab of [undefined, "votadas"]) {
      const html = await render(tab);
      expect(html).toContain("Esta cuenta es privada. Síguela para ver sus encuestas y votos.");
      expect(html).toContain("Cuenta privada");
      expect(html).toContain("7");
      expect(html).not.toContain("¿Tortilla con o sin cebolla?");
      expect(html).not.toContain("Votadas");
    }
    const targets = queries.map((q) => q.target);
    expect(targets).toEqual(["rpc:get_profile"]);
  });

  it("criterio 4: un usuario inexistente responde 404", async () => {
    responses = { "rpc:get_profile": { data: [], error: null } };
    await expect(render(undefined, "nadie")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("un fallo de lectura es un error recuperable", async () => {
    responses = { "rpc:get_profile": networkFailure };
    const html = await render();
    expect(html).toContain("No se ha podido cargar el perfil");
    expect(html).toContain("Reintentar");
  });

  it("el perfil propio ofrece «Editar perfil»", async () => {
    user = { id: "u1" };
    responses = {
      "rpc:get_profile": { data: [header({ viewer_relation: "self" })], error: null },
      "rpc:get_profile_polls": { data: [], error: null },
    };
    expect(await render()).toContain("Editar perfil");
  });

  it("con muchas encuestas sin ninguna, la pestaña Creadas explica el vacío", async () => {
    responses = {
      "rpc:get_profile": { data: [header({ polls_count: 0 })], error: null },
      "rpc:get_profile_polls": { data: [], error: null },
    };
    expect(await render()).toContain("Todavía no ha creado encuestas");
  });
});

const networkFailure = () => {
  throw new TypeError("fetch failed");
};
