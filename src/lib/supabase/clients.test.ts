import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Sin red: se captura la petición HTTP que generaría cada cliente.
const DEV_URL = "https://ltlrujmqenhktiilsnis.supabase.co";
const KEY = "sb_publishable_test";

const cookieStore = { getAll: vi.fn(() => []), set: vi.fn() };
vi.mock("next/headers", () => ({ cookies: async () => cookieStore }));

let requests: Request[];

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", DEV_URL);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", KEY);
  requests = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      requests.push(new Request(input, init));
      return new Response("[]", { status: 200, headers: { "content-type": "application/json" } });
    }),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

// Una consulta pública hecha sin sesión sólo debe llevar la clave publicable.
function expectAnonymousRequest(req: Request) {
  expect(req.url).toBe(`${DEV_URL}/rest/v1/polls?select=id`);
  expect(req.headers.get("apikey")).toBe(KEY);
  const auth = req.headers.get("authorization");
  expect(auth === null || auth === `Bearer ${KEY}`).toBe(true);
}

describe("cliente de servidor", () => {
  it("hace consultas públicas sin cookies de sesión", async () => {
    const { createClient } = await import("./server");
    const supabase = await createClient();

    const { data, error } = await supabase.from("polls").select("id");

    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(cookieStore.getAll).toHaveBeenCalled();
    expect(requests).toHaveLength(1);
    expectAnonymousRequest(requests[0]);
  });
});

describe("cliente de navegador", () => {
  it("usa la misma configuración y hace consultas públicas sin sesión", async () => {
    vi.stubGlobal("window", globalThis);
    vi.stubGlobal("document", { cookie: "" });
    const { createClient } = await import("./client");
    const supabase = createClient();

    const { error } = await supabase.from("polls").select("id");

    expect(error).toBeNull();
    expect(requests).toHaveLength(1);
    expectAnonymousRequest(requests[0]);
  });
});
