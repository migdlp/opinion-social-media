// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const signInWithOAuth = vi.fn();
vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({ auth: { signInWithOAuth } }),
}));

const { GoogleSignInButton } = await import("./google-sign-in-button");

beforeEach(() => {
  signInWithOAuth.mockReset();
  signInWithOAuth.mockResolvedValue({
    data: { url: "https://accounts.google.com/x" },
    error: null,
  });
});
afterEach(cleanup);

const click = () => userEvent.click(screen.getByRole("button", { name: "Continuar con Google" }));

describe("GoogleSignInButton", () => {
  it("inicia Google OAuth y pide volver al callback con la ruta local anterior", async () => {
    render(<GoogleSignInButton next="/polls/abc" />);

    await click();

    expect(signInWithOAuth).toHaveBeenCalledOnce();
    const arg = signInWithOAuth.mock.calls[0][0];
    expect(arg.provider).toBe("google");
    expect(arg.options.redirectTo).toBe(
      `${window.location.origin}/auth/callback?next=${encodeURIComponent("/polls/abc")}`,
    );
  });

  it.each(["https://sitio-ajeno.example/", "//ajeno.example", "/\\ajeno.example"])(
    "un retorno externo o malformado (%s) se ignora y se usa /",
    async (next) => {
      render(<GoogleSignInButton next={next} />);

      await click();

      expect(signInWithOAuth.mock.calls[0][0].options.redirectTo).toBe(
        `${window.location.origin}/auth/callback?next=${encodeURIComponent("/")}`,
      );
    },
  );

  it("si Supabase devuelve error, explica el fallo y permite reintentar", async () => {
    signInWithOAuth.mockResolvedValue({ data: { url: null }, error: { message: "interno" } });
    render(<GoogleSignInButton next="/" />);

    await click();

    expect((await screen.findByRole("alert")).textContent).toMatch(/No se ha podido/);
    expect(screen.getByRole("alert").textContent).not.toContain("interno");
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Continuar con Google" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
  });

  it("si la red falla (lanza) también explica el fallo", async () => {
    signInWithOAuth.mockRejectedValue(new TypeError("fetch failed"));
    render(<GoogleSignInButton next="/" />);

    await click();

    expect((await screen.findByRole("alert")).textContent).toMatch(/No se ha podido/);
  });
});
