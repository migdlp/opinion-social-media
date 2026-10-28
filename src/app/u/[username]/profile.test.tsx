// V2-006: HTML SSR de /u/[username]. Una cuenta privada sin acceso muestra sólo cabecera y aviso,
// y ni sus encuestas ni sus votos llegan al HTML (criterio 2); una inexistente responde 404.
import { Writable } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
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
// La página contiene componentes asíncronos (pestañas): se espera a que todo esté resuelto.
function toHtml(element: React.ReactElement): Promise<string> {
  return new Promise((resolve, reject) => {
    let html = "";
    const sink = new Writable({
      write(chunk, _encoding, done) {
        html += chunk.toString();
        done();
      },
      final(done) {
        resolve(html);
        done();
      },
    });
    const stream = renderToPipeableStream(element, {
      onAllReady: () => stream.pipe(sink),
      onError: reject,
    });
  });
}
// Texto visible: sin etiquetas ni los comentarios que React intercala entre nodos de texto.
const visible = (html: string) =>
  html
    .replace(/<!--.*?-->/g, "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ");
const render = async (tab?: string, username = "perfil_b") =>
  toHtml(
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
    expect(visible(html)).toContain("@perfil_b");
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
    expect(visible(html)).not.toMatch(/\d\s*%/);
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

  it("el perfil propio muestra el número de solicitudes pendientes; el ajeno no lo pide", async () => {
    user = { id: "u1" };
    responses = {
      "rpc:get_profile": { data: [header({ viewer_relation: "self" })], error: null },
      "rpc:get_profile_polls": { data: [], error: null },
      "rpc:count_follow_requests": { data: 2, error: null },
    };
    expect(await render()).toContain("Solicitudes de seguimiento: 2 pendientes");

    user = null;
    responses = {
      "rpc:get_profile": { data: [header()], error: null },
      "rpc:get_profile_polls": { data: [], error: null },
    };
    await render();
    expect(queries.map((q) => q.target)).not.toContain("rpc:count_follow_requests");
  });

  it("V2-022: «Guardadas» sólo existe en el perfil propio y lista lo guardado", async () => {
    user = { id: "u1" };
    responses = {
      "rpc:get_profile": { data: [header({ viewer_relation: "self" })], error: null },
      saved_polls: {
        data: [{ poll_id: ID, created_at: "2026-10-27T19:00:00Z", polls: { id: ID } }],
        error: null,
      },
      polls: { data: [pollRow], error: null },
      votes: { data: [], error: null },
      "rpc:get_poll_authors": { data: [], error: null },
    };
    const own = await render("guardadas");
    expect(own).toMatch(/aria-current="page"[^>]*>Guardadas/);
    expect(own).toContain("¿Tortilla con o sin cebolla?");
    expect(own).toContain("Quitar de guardadas");
    expect(queries.map((q) => q.target)).not.toContain("rpc:get_profile_polls");

    // En el perfil de otra persona no hay pestaña ni se piden sus guardadas.
    user = { id: "u1" };
    responses = {
      "rpc:get_profile": { data: [header({ viewer_relation: "following" })], error: null },
      "rpc:get_profile_polls": { data: [], error: null },
    };
    const other = await render("guardadas");
    expect(other).not.toContain("Guardadas");
    expect(queries.map((q) => q.target)).not.toContain("saved_polls");
    expect(other).toMatch(/aria-current="page"[^>]*>Creadas/);
  });

  it("V2-022: sin guardadas lo explica", async () => {
    user = { id: "u1" };
    responses = {
      "rpc:get_profile": { data: [header({ viewer_relation: "self" })], error: null },
      saved_polls: { data: [], error: null },
    };
    expect(await render("guardadas")).toContain("Todavía no has guardado ninguna encuesta");
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
