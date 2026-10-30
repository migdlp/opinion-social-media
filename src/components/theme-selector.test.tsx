// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Header } from "./header";

vi.mock("./auth-button", () => ({ AuthButton: () => null, AuthButtonFallback: () => null }));
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  fireEvent(window, new StorageEvent("storage", { key: null }));
  cleanup();
  delete document.documentElement.dataset.theme;
});
it("parte de Claro y alterna con un botón sin desplegable; conserva la elección al remontar", async () => {
  const view = render(<Header />);
  expect(screen.queryByRole("combobox")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Activar modo oscuro" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(localStorage.getItem("opinion-theme")).toBe("dark");
  view.unmount();
  render(<Header />);
  await userEvent.click(screen.getByRole("button", { name: "Activar modo claro" }));
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(localStorage.getItem("opinion-theme")).toBe("light");
});
it("Enter y Espacio cambian tema manteniendo el foco", async () => {
  render(<Header />);
  const button = screen.getByRole("button", { name: "Activar modo oscuro" });
  button.focus();
  await userEvent.keyboard("{Enter}");
  expect(document.documentElement.dataset.theme).toBe("dark");
  await userEvent.keyboard(" ");
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(document.activeElement).toBe(button);
});
it("funciona con almacenamiento bloqueado y sincroniza dos controles", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  render(
    <>
      <Header />
      <Header />
    </>,
  );
  await userEvent.click(screen.getAllByRole("button", { name: "Activar modo oscuro" })[0]);
  expect(screen.getAllByRole("button", { name: "Activar modo claro" })).toHaveLength(2);
  await userEvent.click(screen.getAllByRole("button", { name: "Activar modo claro" })[1]);
  expect(document.documentElement.dataset.theme).toBe("light");
});
it.each([null, "system", "invalid", "dark"])(
  "hereda %s y recibe cambios de otra pestaña",
  (value) => {
    if (value) localStorage.setItem("opinion-theme", value);
    render(<Header />);
    expect(
      screen.getByRole("button", {
        name: value === "dark" ? "Activar modo claro" : "Activar modo oscuro",
      }),
    ).toBeDefined();
    localStorage.setItem("opinion-theme", "dark");
    fireEvent(window, new StorageEvent("storage", { key: "opinion-theme" }));
    expect(document.documentElement.dataset.theme).toBe("dark");
    localStorage.clear();
    fireEvent(window, new StorageEvent("storage", { key: null }));
    expect(document.documentElement.dataset.theme).toBe("light");
  },
);
