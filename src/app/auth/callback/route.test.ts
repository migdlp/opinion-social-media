import { beforeEach, describe, expect, it, vi } from "vitest";

const exchange = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { exchangeCodeForSession: exchange } }),
}));

const { GET } = await import("./route");

const call = (query: string) => GET(new Request(`http://localhost:3000/auth/callback${query}`));
const location = (res: Response) => new URL(res.headers.get("location")!);

beforeEach(() => {
  exchange.mockReset();
  exchange.mockResolvedValue({ error: null });
});

describe("GET /auth/callback", () => {
  it("intercambia el código y vuelve al destino local pedido", async () => {
    const res = await call("?code=abc&next=/polls/1");

    expect(exchange).toHaveBeenCalledWith("abc");
    expect(res.status).toBe(307);
    expect(location(res).href).toBe("http://localhost:3000/polls/1");
  });

  it("sin next vuelve a /", async () => {
    const res = await call("?code=abc");

    expect(location(res).href).toBe("http://localhost:3000/");
  });

  it.each(["https://sitio-ajeno.example/", "//sitio-ajeno.example", "/\\ajeno.example"])(
    "un destino externo o malformado (%s) acaba en un destino local seguro",
    async (next) => {
      const res = await call(`?code=abc&next=${encodeURIComponent(next)}`);

      expect(location(res).origin).toBe("http://localhost:3000");
      expect(location(res).pathname).toBe("/");
    },
  );

  it("sin código lleva a /login sin error técnico y sin llamar a Supabase", async () => {
    const res = await call("?next=/create");

    expect(exchange).not.toHaveBeenCalled();
    expect(location(res).pathname).toBe("/login");
    expect(location(res).searchParams.get("error")).toBe("auth");
    expect(location(res).searchParams.get("next")).toBe("/create");
  });

  it("si el intercambio falla lleva a /login con un código genérico", async () => {
    exchange.mockResolvedValue({ error: { message: "invalid grant: secreto interno" } });

    const res = await call("?code=caducado&next=/create");

    expect(location(res).pathname).toBe("/login");
    expect(location(res).searchParams.get("error")).toBe("auth");
    expect(location(res).href).not.toContain("secreto");
  });

  it("si el intercambio lanza (red caída) también vuelve a /login", async () => {
    exchange.mockRejectedValue(new TypeError("fetch failed"));

    const res = await call("?code=abc");

    expect(location(res).pathname).toBe("/login");
  });

  it("un error devuelto por el proveedor (acceso denegado) vuelve a /login", async () => {
    const res = await call("?error=access_denied&error_description=User+denied");

    expect(exchange).not.toHaveBeenCalled();
    expect(location(res).pathname).toBe("/login");
    expect(location(res).href).not.toContain("denied");
  });
});
