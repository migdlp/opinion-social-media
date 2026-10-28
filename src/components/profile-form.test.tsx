// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Profile, Result } from "@/lib/data/types";
import { ProfileForm } from "./profile-form";

afterEach(cleanup);

const OK: Result<Profile> = {
  ok: true,
  data: { username: "ana_23", displayName: null, isPrivate: false },
};
const setup = (over: Partial<React.ComponentProps<typeof ProfileForm>> = {}) => {
  const props = { onSubmit: vi.fn(async () => OK), onDone: vi.fn(), ...over };
  render(<ProfileForm {...props} />);
  return props;
};
const username = () => screen.getByRole("textbox", { name: "Usuario" }) as HTMLInputElement;
const displayName = () => screen.getByRole("textbox", { name: /Nombre visible/ });
const send = () => userEvent.click(screen.getByRole("button", { name: "Guardar" }));

describe("ProfileForm (onboarding)", () => {
  it("muestra en vivo cómo se verá el @usuario", async () => {
    setup();
    expect(screen.getByText("@…")).toBeDefined();
    await userEvent.type(username(), "Ana_23");
    expect(screen.getByText("@ana_23")).toBeDefined();
  });

  it("envía usuario en minúsculas y nombre normalizado, y avisa al terminar", async () => {
    const p = setup();
    await userEvent.type(username(), "Ana_23");
    await userEvent.type(displayName(), "  Ana   María ");
    await send();

    expect(p.onSubmit).toHaveBeenCalledWith("ana_23", "Ana María");
    expect(p.onDone).toHaveBeenCalledOnce();
  });

  it("sin nombre visible envía null", async () => {
    const p = setup();
    await userEvent.type(username(), "ana_23");
    await send();

    expect(p.onSubmit).toHaveBeenCalledWith("ana_23", null);
  });

  it("no envía un usuario inválido o reservado y explica por qué", async () => {
    const p = setup();
    await userEvent.type(username(), "1ana");
    await send();
    expect(p.onSubmit).not.toHaveBeenCalled();
    expect(username().getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText(/de 3 a 20 caracteres/)).toBeDefined();

    await userEvent.clear(username());
    await userEvent.type(username(), "admin");
    await send();
    expect(p.onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Ese usuario está reservado. Prueba con otro.")).toBeDefined();
  });

  it("si el nombre está ocupado lo dice sin perder lo escrito", async () => {
    const p = setup({
      onSubmit: vi.fn(async () => ({ ok: false, error: "USERNAME_TAKEN" }) as const),
    });
    await userEvent.type(username(), "ana_23");
    await userEvent.type(displayName(), "Ana");
    await send();

    expect((await screen.findByText("Ese nombre ya está en uso.")).textContent).toBeDefined();
    expect(username().value).toBe("ana_23");
    expect((displayName() as HTMLInputElement).value).toBe("Ana");
    expect(p.onDone).not.toHaveBeenCalled();
    expect(username().getAttribute("aria-invalid")).toBe("true");
  });

  it("ante una caída de red avisa, conserva los campos y permite reintentar", async () => {
    const onSubmit = vi
      .fn<(u: string, d: string | null) => Promise<Result<Profile>>>()
      .mockResolvedValueOnce({ ok: false, error: "NETWORK_ERROR" })
      .mockResolvedValueOnce(OK);
    const p = setup({ onSubmit });
    await userEvent.type(username(), "ana_23");
    await send();

    expect((await screen.findByRole("alert")).textContent).toBe(
      "No hay conexión. Comprueba tu red y vuelve a intentarlo.",
    );
    await send();
    expect(p.onDone).toHaveBeenCalledOnce();
  });

  it("si la llamada se rechaza también avisa de la red", async () => {
    setup({ onSubmit: vi.fn(() => Promise.reject(new TypeError("fetch failed"))) });
    await userEvent.type(username(), "ana_23");
    await send();

    expect((await screen.findByRole("alert")).textContent).toContain("No hay conexión");
  });

  it("un solo envío a la vez", async () => {
    let resolve!: (r: Result<Profile>) => void;
    const onSubmit = vi.fn(() => new Promise<Result<Profile>>((r) => (resolve = r)));
    const p = setup({ onSubmit });
    await userEvent.type(username(), "ana_23");
    await send();
    await userEvent.click(screen.getByRole("button", { name: /Guardando/ }));

    expect(onSubmit).toHaveBeenCalledOnce();
    resolve(OK);
    await vi.waitFor(() => expect(p.onDone).toHaveBeenCalledOnce());
  });
});
