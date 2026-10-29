// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { signOut } from "@/app/auth/actions";
import { AccountMenu } from "./account-menu";

vi.mock("@/app/auth/actions", () => ({ signOut: vi.fn(async () => {}) }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
beforeEach(() => vi.mocked(signOut).mockClear());

function setup() {
  const outside = vi.fn();
  const view = render(
    <>
      <AccountMenu username="ana" />
      <button onClick={outside}>Otra acción</button>
    </>,
  );
  const trigger = screen.getByLabelText("Menú de cuenta");
  const root = trigger.closest("details")!;
  return { ...view, root, trigger, outside };
}
async function open() {
  const data = setup();
  await userEvent.click(data.trigger);
  expect(data.root.open).toBe(true);
  return data;
}

describe("AccountMenu", () => {
  it("cierra al pulsar fuera sin impedir el clic ni robar el foco", async () => {
    const { root, outside } = await open();
    const button = screen.getByRole("button", { name: "Otra acción" });
    await userEvent.click(button);
    expect(root.open).toBe(false);
    expect(outside).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(button);
  });
  it("cierra también con pointerdown táctil fuera", async () => {
    const { root } = await open();
    fireEvent.pointerDown(document.body, { pointerType: "touch" });
    expect(root.open).toBe(false);
  });
  it("no cierra con pointerdown dentro y deja actuar al enlace antes de cerrar al navegar", async () => {
    const { root } = await open();
    const link = screen.getByRole("link", { name: "Ajustes" });
    const action = vi.fn((event: Event) => event.preventDefault());
    link.addEventListener("click", action);
    fireEvent.pointerDown(link);
    expect(root.open).toBe(true);
    fireEvent.click(link);
    expect(action).toHaveBeenCalledOnce();
    expect(link.getAttribute("href")).toBe("/settings");
    expect(root.open).toBe(false);
  });
  it("Escape cierra y devuelve foco al disparador", async () => {
    const { root, trigger } = await open();
    screen.getByRole("link", { name: "Mi perfil" }).focus();
    await userEvent.keyboard("{Escape}");
    expect(root.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });
  it("Tab recorre el menú y cierra cuando el foco sale del conjunto", async () => {
    const { root } = await open();
    await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Mi perfil" }));
    expect(root.open).toBe(true);
    for (let i = 0; i < 4; i++) await userEvent.tab();
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Otra acción" }));
    expect(root.open).toBe(false);
  });
  it("cerrar sesión ejecuta su acción y cierra el menú", async () => {
    const { root } = await open();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await waitFor(() => expect(signOut).toHaveBeenCalledOnce());
    expect(root.open).toBe(false);
  });
  it("elimina el listener exterior al desmontarse", () => {
    const add = vi.spyOn(document, "addEventListener");
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = setup();
    const handler = add.mock.calls.find(([name]) => name === "pointerdown")?.[1];
    expect(handler).toBeDefined();
    unmount();
    expect(remove.mock.calls.some(([name, fn]) => name === "pointerdown" && fn === handler)).toBe(
      true,
    );
  });
});

describe("AccountMenu (AVATAR-001)", () => {
  it("con icono elegido lo muestra en el botón en lugar de las iniciales", () => {
    const { container } = render(<AccountMenu username="ana" avatarIcon="sol" />);
    const trigger = screen.getByLabelText("Menú de cuenta");
    expect(container.querySelector('[data-avatar-icon="sol"]')).not.toBeNull();
    expect(trigger.textContent).not.toContain("AN");
  });

  it("sin icono conserva las iniciales", () => {
    render(<AccountMenu username="ana" />);
    expect(screen.getByLabelText("Menú de cuenta").textContent).toContain("AN");
  });
});
