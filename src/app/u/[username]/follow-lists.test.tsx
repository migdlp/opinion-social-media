// V2-009: HTML SSR de /u/[username]/seguidores, /siguiendo y /solicitudes. Una cuenta privada sin
// acceso sólo muestra el aviso y no se piden sus listas (criterio 1).
import { Writable } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, type FakeResponse } from "@/lib/data/testing/fake-supabase";

let responses: Record<string, FakeResponse | FakeResponse[]> = {};
let clients: ReturnType<typeof fakeSupabase>["queries"][] = [];
const targets = () => clients.flatMap((c) => c.map((q) => q.target));
let user: { id: string } | null = null;
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const fake = fakeSupabase(responses);
    clients.push(fake.queries);
    return { ...fake.supabase, auth: { getUser: async () => ({ data: { user }, error: null }) } };
  },
}));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_NOT_FOUND");
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT:${to}`);
  },
}));

const { FollowListContent } = await import("./follow-list-content");
const { RequestsContent } = await import("@/app/solicitudes/requests-content");

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
const person = (n: number) => ({
  username: `usuario_${n}`,
  display_name: n % 2 ? `Nombre ${n}` : null,
  cursor: `c${n}`,
});

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
const renderList = async (kind: "seguidores" | "siguiendo", username = "perfil_b") =>
  toHtml(await FollowListContent({ params: Promise.resolve({ username }), kind }));

beforeEach(() => {
  responses = {};
  clients = [];
  user = null;
});

describe("/u/[username]/seguidores y /siguiendo", () => {
  it("lista los seguidores de un perfil público para un visitante, sin acciones de gestión", async () => {
    responses = {
      "rpc:get_profile": { data: [header()], error: null },
      "rpc:list_followers": { data: [person(1), person(2)], error: null },
    };
    const html = await renderList("seguidores");
    expect(html).toContain("Seguidores de");
    expect(html).toContain("/u/usuario_1");
    expect(html).toContain("usuario_2");
    expect(html).not.toContain("Eliminar");
    expect(html).not.toMatch(/user_id/);
  });

  it("siguiendo usa list_following", async () => {
    responses = {
      "rpc:get_profile": { data: [header()], error: null },
      "rpc:list_following": { data: [person(3)], error: null },
    };
    const html = await renderList("siguiendo");
    expect(html).toContain("usuario_3");
    expect(targets()).toEqual(["rpc:get_profile", "rpc:list_following"]);
  });

  it("criterio 1: una cuenta privada sin acceso muestra el aviso y no pide la lista", async () => {
    responses = {
      "rpc:get_profile": {
        data: [header({ is_private: true, can_view_content: false })],
        error: null,
      },
      "rpc:list_followers": { data: [person(1)], error: null },
    };
    for (const kind of ["seguidores", "siguiendo"] as const) {
      const html = await renderList(kind);
      expect(html).toContain("Esta cuenta es privada");
      expect(html).not.toContain("usuario_1");
    }
    expect(targets()).toEqual(["rpc:get_profile", "rpc:get_profile"]);
  });

  it("en la lista de seguidores propia aparece «Eliminar»", async () => {
    user = { id: "u1" };
    responses = {
      "rpc:get_profile": { data: [header({ viewer_relation: "self" })], error: null },
      "rpc:list_followers": { data: [person(1)], error: null },
    };
    expect(await renderList("seguidores")).toContain("Eliminar");
  });

  it("en «siguiendo» propio no hay «Eliminar»", async () => {
    user = { id: "u1" };
    responses = {
      "rpc:get_profile": { data: [header({ viewer_relation: "self" })], error: null },
      "rpc:list_following": { data: [person(1)], error: null },
    };
    expect(await renderList("siguiendo")).not.toContain("Eliminar");
  });

  it("un usuario inexistente responde 404", async () => {
    responses = { "rpc:get_profile": { data: [], error: null } };
    await expect(renderList("seguidores", "nadie")).rejects.toThrow("NEXT_NOT_FOUND");
  });

  it("un fallo de lectura de la lista es un error recuperable", async () => {
    responses = {
      "rpc:get_profile": { data: [header()], error: null },
      "rpc:list_followers": { data: null, error: { code: "P0001", message: "PROFILE_PRIVATE" } },
    };
    expect(await renderList("seguidores")).toContain("Esta cuenta es privada");
  });
});

describe("/solicitudes", () => {
  it("sin sesión lleva al login con retorno", async () => {
    await expect(RequestsContent()).rejects.toThrow(
      `NEXT_REDIRECT:/login?next=${encodeURIComponent("/solicitudes")}`,
    );
  });

  it("lista las solicitudes pendientes con Aceptar y Rechazar", async () => {
    user = { id: "u1" };
    responses = { "rpc:list_follow_requests": { data: [person(1), person(2)], error: null } };
    const html = await toHtml(await RequestsContent());
    expect(html).toContain("usuario_1");
    expect(html).toContain("Aceptar");
    expect(html).toContain("Rechazar");
  });

  it("sin solicitudes lo explica", async () => {
    user = { id: "u1" };
    responses = { "rpc:list_follow_requests": { data: [], error: null } };
    expect(await toHtml(await RequestsContent())).toContain("No tienes solicitudes pendientes");
  });
});
