import { beforeEach, describe, expect, it, vi } from "vitest";

const { getUser, getMyProfile, createClient } = vi.hoisted(() => ({
  getUser: vi.fn(),
  getMyProfile: vi.fn(),
  createClient: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("@/lib/data/operations", () => ({ getMyProfile }));
const { GET } = await import("./route");

beforeEach(() => {
  vi.resetAllMocks();
  createClient.mockResolvedValue({ auth: { getUser } });
  getUser.mockResolvedValue({ data: { user: { id: "self" } } });
  getMyProfile.mockResolvedValue({ ok: true, data: { username: "ana_23" } });
});

const open = () => GET(new Request("https://opinion.example/me"));
describe("acceso al perfil propio", () => {
  it("con perfil abre su URL pública", async () => {
    expect((await open()).headers.get("location")).toBe("https://opinion.example/u/ana_23");
  });
  it("sin perfil abre onboarding con retorno a /me", async () => {
    getMyProfile.mockResolvedValue({ ok: true, data: null });
    expect((await open()).headers.get("location")).toBe(
      "https://opinion.example/onboarding?next=%2Fme",
    );
  });
  it("sin sesión pide login con retorno al perfil", async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    expect((await open()).headers.get("location")).toBe("https://opinion.example/login?next=%2Fme");
    expect(getMyProfile).not.toHaveBeenCalled();
  });
  it("un fallo de datos lleva a un estado recuperable y no simula volver al feed", async () => {
    getMyProfile.mockResolvedValue({ ok: false, error: "NETWORK_ERROR" });
    expect((await open()).headers.get("location")).toBe("https://opinion.example/me/error");
  });
  it("una excepción también permite reintentar sin exponer el error interno", async () => {
    createClient.mockRejectedValue(new Error("private SQL detail"));
    const response = await open();
    expect(response.headers.get("location")).toBe("https://opinion.example/me/error");
    expect(await response.text()).not.toContain("private SQL detail");
  });
});
