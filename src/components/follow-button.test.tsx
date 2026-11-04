// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Result, ViewerRelation } from "@/lib/data/types";
import { FollowButton } from "./follow-button";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Follow = (u: string) => Promise<Result<"accepted" | "pending">>;
type Unfollow = (u: string) => Promise<Result<void>>;

const setup = (
  relation: ViewerRelation,
  over: { signedIn?: boolean; follow?: Follow; unfollow?: Unfollow } = {},
) => {
  const follow = over.follow ?? vi.fn<Follow>(async () => ({ ok: true, data: "accepted" }));
  const unfollow = over.unfollow ?? vi.fn<Unfollow>(async () => ({ ok: true, data: undefined }));
  render(
    <FollowButton
      username="perfil_b"
      relation={relation}
      signedIn={over.signedIn ?? true}
      onFollow={follow}
      onUnfollow={unfollow}
    />,
  );
  return { follow, unfollow };
};

describe("FollowButton", () => {
  it("el propio perfil ofrece «Editar perfil» hacia /settings", () => {
    setup("self");
    expect(screen.getByRole("link", { name: "Editar perfil" }).getAttribute("href")).toBe(
      "/settings",
    );
  });

  it("un visitante ve «Seguir» como enlace al login con retorno al perfil", () => {
    setup("none", { signedIn: false });
    const link = screen.getByRole("link", { name: "Seguir" });
    expect(link.getAttribute("href")).toBe(`/login?next=${encodeURIComponent("/u/perfil_b")}`);
  });

  it("Seguir a una cuenta pública pasa a «Siguiendo» sin recargar", async () => {
    const { follow } = setup("none");
    await userEvent.click(screen.getByRole("button", { name: "Seguir" }));

    expect(follow).toHaveBeenCalledWith("perfil_b");
    expect(await screen.findByRole("button", { name: "Siguiendo" })).toBeDefined();
  });

  it("Seguir a una cuenta privada pasa a «Solicitado»", async () => {
    setup("none", { follow: vi.fn<Follow>(async () => ({ ok: true, data: "pending" })) });
    await userEvent.click(screen.getByRole("button", { name: "Seguir" }));

    expect(await screen.findByRole("button", { name: "Solicitado" })).toBeDefined();
  });

  it("«Solicitado» cancela la solicitud y vuelve a «Seguir»", async () => {
    const { unfollow } = setup("pending");
    await userEvent.click(screen.getByRole("button", { name: "Solicitado" }));

    expect(unfollow).toHaveBeenCalledWith("perfil_b");
    expect(await screen.findByRole("button", { name: "Seguir" })).toBeDefined();
  });

  it("«Siguiendo» pide confirmación antes de dejar de seguir", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const { unfollow } = setup("following");
    await userEvent.click(screen.getByRole("button", { name: "Siguiendo" }));
    expect(confirm).toHaveBeenCalledWith("¿Dejar de seguir a @perfil_b?");
    expect(unfollow).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    await userEvent.click(screen.getByRole("button", { name: "Siguiendo" }));
    expect(unfollow).toHaveBeenCalledOnce();
    expect(await screen.findByRole("button", { name: "Seguir" })).toBeDefined();
  });

  it("si falla conserva el estado y lo explica", async () => {
    setup("none", {
      follow: vi.fn<Follow>(async () => ({ ok: false, error: "FOLLOW_RATE_LIMITED" })),
    });
    await userEvent.click(screen.getByRole("button", { name: "Seguir" }));

    expect((await screen.findByRole("alert")).textContent).toContain("demasiadas cuentas");
    expect(screen.getByRole("button", { name: "Seguir" })).toBeDefined();
  });

  it("sin @usuario propio ofrece elegirlo y volver al perfil", async () => {
    setup("none", {
      follow: vi.fn<Follow>(async () => ({ ok: false, error: "PROFILE_REQUIRED" })),
    });
    await userEvent.click(screen.getByRole("button", { name: "Seguir" }));

    const link = await screen.findByRole("link", { name: "Elegir mi usuario" });
    expect(link.getAttribute("href")).toBe(`/onboarding?next=${encodeURIComponent("/u/perfil_b")}`);
  });

  it("si la sesión caducó ofrece iniciar sesión", async () => {
    setup("none", { follow: vi.fn<Follow>(async () => ({ ok: false, error: "AUTH_REQUIRED" })) });
    await userEvent.click(screen.getByRole("button", { name: "Seguir" }));

    expect(await screen.findByRole("link", { name: "Iniciar sesión" })).toBeDefined();
  });

  it("un solo envío a la vez", async () => {
    let resolve!: (r: Result<"accepted" | "pending">) => void;
    const follow = vi.fn<Follow>(() => new Promise((r) => (resolve = r)));
    setup("none", { follow });
    await userEvent.click(screen.getByRole("button", { name: "Seguir" }));
    await userEvent.click(screen.getByRole("button", { name: /Seguir|Enviando/ }));

    expect(follow).toHaveBeenCalledOnce();
    resolve({ ok: true, data: "accepted" });
  });
});
