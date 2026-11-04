// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Result } from "@/lib/data/types";
import { BlockButton } from "./block-button";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, refresh: vi.fn() }) }));

afterEach(() => {
  cleanup();
  push.mockReset();
});

type Act = (username: string) => Promise<Result<void>>;
const ok = async (): Promise<Result<void>> => ({ ok: true, data: undefined });

describe("BlockButton (SOCIAL-002)", () => {
  it("abre una confirmación que explica qué pasa y no bloquea todavía", async () => {
    const onBlock = vi.fn<Act>(ok);
    render(<BlockButton username="ana" onBlock={onBlock} />);
    await userEvent.click(screen.getByRole("button", { name: "Bloquear" }));
    const group = screen.getByRole("group", { name: /bloquear a @ana/i });
    expect(group.textContent).toMatch(/dejaréis de seguiros/i);
    expect(group.textContent).toMatch(/no se lo notificamos/i);
    expect(group.textContent).toMatch(/sin iniciar sesión/i);
    expect(onBlock).not.toHaveBeenCalled();
  });

  it("Cancelar y Escape cierran sin bloquear y devuelven el foco al botón", async () => {
    const onBlock = vi.fn<Act>(ok);
    render(<BlockButton username="ana" onBlock={onBlock} />);
    const trigger = screen.getByRole("button", { name: "Bloquear" });
    await userEvent.click(trigger);
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(screen.queryByRole("group")).toBeNull();
    expect(document.activeElement).toBe(trigger);

    await userEvent.click(trigger);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("group")).toBeNull();
    expect(onBlock).not.toHaveBeenCalled();
  });

  it("confirmar bloquea una sola vez (aunque se pulse dos veces) y lleva a la lista de Ajustes", async () => {
    let release!: (r: Result<void>) => void;
    const onBlock = vi.fn<Act>(() => new Promise((resolve) => (release = resolve)));
    render(<BlockButton username="ana" onBlock={onBlock} />);
    await userEvent.click(screen.getByRole("button", { name: "Bloquear" }));
    const confirm = screen.getByRole("button", { name: "Sí, bloquear" });
    await userEvent.click(confirm);
    await userEvent.click(confirm);
    expect(onBlock).toHaveBeenCalledOnce();
    expect(onBlock).toHaveBeenCalledWith("ana");
    release({ ok: true, data: undefined });
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith("/settings#bloqueados"));
  });

  it("si falla, no navega, explica el motivo y deja reintentar", async () => {
    const onBlock = vi.fn<Act>(async () => ({ ok: false, error: "NETWORK_ERROR" }));
    render(<BlockButton username="ana" onBlock={onBlock} />);
    await userEvent.click(screen.getByRole("button", { name: "Bloquear" }));
    await userEvent.click(screen.getByRole("button", { name: "Sí, bloquear" }));
    expect((await screen.findByRole("alert")).textContent).toMatch(/conexión/i);
    expect(push).not.toHaveBeenCalled();
    expect(
      (screen.getByRole("button", { name: "Sí, bloquear" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });
});
