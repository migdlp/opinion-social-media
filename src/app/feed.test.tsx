// @vitest-environment jsdom
// V2-032: la página / con Recientes/Siguiendo y filtro de categoría en la URL.
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fakeSupabase, networkThrow, type FakeResponse } from "@/lib/data/testing/fake-supabase";

// El feed real se carga en el servidor con el cliente de src/lib/supabase/server.ts.
let responses: Record<string, FakeResponse | FakeResponse[]> = {};
let clients: ReturnType<typeof fakeSupabase>["queries"][] = [];
let user: { id: string } | null = null;
const targets = () => clients.flatMap((c) => c.map((q) => q.target));
const callsOf = (target: string) => clients.flatMap((c) => c).filter((q) => q.target === target);
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => {
    const fake = fakeSupabase(responses);
    clients.push(fake.queries);
    return { ...fake.supabase, auth: { getUser: async () => ({ data: { user }, error: null }) } };
  },
}));

const { Feed } = await import("./feed");

const ID1 = "00000000-0000-4000-8000-000000000001";
const ID2 = "00000000-0000-4000-8000-000000000002";
const row = (id: string, question: string, created_at: string) => ({
  id,
  question,
  created_at,
  poll_options: [
    { id: `${id}a`, text: "Sí", position: 1 },
    { id: `${id}b`, text: "No", position: 2 },
  ],
});
const feedRow = (id: string) => ({
  poll_id: id,
  created_at: "2026-10-27T10:00:00+00:00",
  cursor: `2026-10-27T10:00:00.000000Z|${id}`,
});
const CATEGORIES = [
  { slug: "deportes", name: "Deportes" },
  { slug: "ciencia", name: "Ciencia" },
];
const base = () => ({
  categories: { data: CATEGORIES, error: null },
  "rpc:get_feed": { data: [feedRow(ID2), feedRow(ID1)], error: null },
  polls: {
    data: [
      row(ID1, "¿Más antigua?", "2026-10-27T10:00:00Z"),
      row(ID2, "¿Recién publicada?", "2026-10-27T19:59:00Z"),
    ],
    error: null,
  },
  votes: { data: [], error: null },
  saved_polls: { data: [], error: null },
});
const render_ = async (params: Record<string, string | string[] | undefined> = {}) =>
  render(await Feed({ searchParams: Promise.resolve(params) }));
const feedCall = () => callsOf("rpc:get_feed")[0].calls[0][2];

beforeEach(() => {
  responses = {};
  clients = [];
  user = null;
});
afterEach(cleanup);

describe("Feed (página /)", () => {
  it("un visitante sin selección ve Recientes, con las encuestas en el orden de la RPC", async () => {
    responses = base();
    await render_();

    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "¿Recién publicada?",
      "¿Más antigua?",
    ]);
    expect(feedCall()).toEqual({ p_mode: "recientes", p_category: null, p_cursor: null });
    expect(screen.getByRole("link", { name: "Recientes" }).getAttribute("aria-current")).toBe(
      "page",
    );
    // Sin sesión no se consultan seguimientos ni votos.
    expect(targets()).not.toContain("follows");
    expect(targets()).not.toContain("votes");
  });

  it("para un visitante «Siguiendo» lleva al login y vuelve a esa pestaña", async () => {
    responses = base();
    await render_();
    const link = screen.getByRole("link", { name: "Siguiendo" });
    expect(link.getAttribute("href")).toBe(`/login?next=${encodeURIComponent("/?tab=siguiendo")}`);
    expect(link.getAttribute("aria-current")).toBeNull();
  });

  it("un visitante que abre ?tab=siguiendo ve la invitación a iniciar sesión, sin pedir datos", async () => {
    responses = base();
    await render_({ tab: "siguiendo" });

    expect(screen.getByRole("link", { name: "Siguiendo" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeDefined();
    expect(targets()).not.toContain("rpc:get_feed");
  });

  it("con un seguimiento aceptado la entrada por defecto es Siguiendo", async () => {
    user = { id: "u1" };
    responses = { ...base(), follows: { data: [{ followee_id: "x" }], error: null } };
    await render_();

    expect(feedCall()).toMatchObject({ p_mode: "siguiendo" });
    expect(screen.getByRole("link", { name: "Siguiendo" }).getAttribute("aria-current")).toBe(
      "page",
    );
    // Sólo cuentan los seguimientos ACEPTADOS del propio usuario.
    const follows = callsOf("follows")[0].calls;
    expect(follows).toContainEqual(["eq", "follower_id", "u1"]);
    expect(follows).toContainEqual(["eq", "status", "accepted"]);
  });

  it("sin seguimientos aceptados (o sólo solicitudes pendientes) la entrada es Recientes", async () => {
    user = { id: "u1" };
    responses = { ...base(), follows: { data: [], error: null } };
    await render_();

    expect(feedCall()).toMatchObject({ p_mode: "recientes" });
    expect(screen.getByRole("link", { name: "Recientes" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("una selección explícita gana a la entrada por defecto y no consulta seguimientos", async () => {
    user = { id: "u1" };
    responses = base();
    await render_({ tab: "recientes" });

    expect(feedCall()).toMatchObject({ p_mode: "recientes" });
    expect(targets()).not.toContain("follows");
  });

  it("si falla la lectura de seguimientos, entra en Recientes en lugar de romper", async () => {
    user = { id: "u1" };
    responses = { ...base(), follows: networkThrow };
    await render_();
    expect(feedCall()).toMatchObject({ p_mode: "recientes" });
  });

  it("una pestaña desconocida en la URL se ignora", async () => {
    responses = base();
    await render_({ tab: "popular" });
    expect(feedCall()).toMatchObject({ p_mode: "recientes" });
    expect(screen.getByRole("link", { name: "Recientes" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("Siguiendo sin encuestas visibles sigue seleccionado y ofrece ir a Recientes", async () => {
    user = { id: "u1" };
    responses = { ...base(), "rpc:get_feed": { data: [], error: null } };
    await render_({ tab: "siguiendo" });

    expect(screen.getByRole("link", { name: "Siguiendo" }).getAttribute("aria-current")).toBe(
      "page",
    );
    expect(screen.getByText(/todavía no tienen encuestas/i)).toBeDefined();
    const link = screen.getByRole("link", { name: "Ver Recientes" });
    expect(link.getAttribute("href")).toBe("/?tab=recientes");
  });

  it("el filtro de categoría va a la RPC, se marca como seleccionado y conserva la pestaña en los enlaces", async () => {
    user = { id: "u1" };
    responses = base();
    await render_({ tab: "recientes", categoria: "deportes" });

    expect(feedCall()).toEqual({ p_mode: "recientes", p_category: "deportes", p_cursor: null });
    const filter = screen.getByRole("navigation", { name: "Categorías" });
    expect(
      within(filter).getByRole("link", { name: "Deportes" }).getAttribute("aria-current"),
    ).toBe("page");
    expect(within(filter).getByRole("link", { name: "Todas" }).getAttribute("href")).toBe(
      "/?tab=recientes",
    );
    expect(within(filter).getByRole("link", { name: "Ciencia" }).getAttribute("href")).toBe(
      "/?tab=recientes&categoria=ciencia",
    );
    // Y cambiar de pestaña conserva la categoría.
    expect(screen.getByRole("link", { name: "Siguiendo" }).getAttribute("href")).toBe(
      "/?tab=siguiendo&categoria=deportes",
    );
  });

  it("«Todas» está seleccionada por defecto; una categoría inexistente se ignora", async () => {
    responses = base();
    await render_({ categoria: "no-existe" });

    expect(feedCall()).toMatchObject({ p_category: null });
    const filter = screen.getByRole("navigation", { name: "Categorías" });
    expect(within(filter).getByRole("link", { name: "Todas" }).getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("si no se puede leer la lista de categorías, el feed funciona sin el filtro", async () => {
    responses = { ...base(), categories: networkThrow };
    await render_();
    expect(screen.queryByRole("navigation", { name: "Categorías" })).toBeNull();
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
  });

  it("las pestañas y el filtro tienen nombre accesible", async () => {
    responses = base();
    await render_();
    expect(screen.getByRole("navigation", { name: "Lista de encuestas" })).toBeDefined();
    expect(screen.getByRole("navigation", { name: "Categorías" })).toBeDefined();
  });

  it("un fallo de red muestra el estado de recuperación en lugar de romper la página", async () => {
    responses = { ...base(), "rpc:get_feed": networkThrow };
    await render_();

    expect(screen.getByRole("alert")).toBeDefined();
    expect(screen.getByRole("link", { name: "Reintentar" })).toBeDefined();
    // Las pestañas siguen disponibles para cambiar de lista.
    expect(screen.getByRole("link", { name: "Recientes" })).toBeDefined();
  });
});
