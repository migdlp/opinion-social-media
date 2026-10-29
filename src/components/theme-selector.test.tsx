// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { Header } from "./header";

vi.mock("./auth-button", () => ({ AuthButton: () => null, AuthButtonFallback: () => null }));
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  window.dispatchEvent(new StorageEvent("storage", { key: null }));
});
it("ofrece un selector accesible y conserva la elección al remontar", async () => {
  const view = render(<Header />);
  const select = screen.getByRole("combobox", { name: "Tema" });
  expect((select as HTMLSelectElement).value).toBe("system");
  await userEvent.selectOptions(select, "light");
  expect(document.documentElement.dataset.theme).toBe("light");
  expect(localStorage.getItem("opinion-theme")).toBe("light");
  view.unmount();
  render(<Header />);
  expect((screen.getByRole("combobox", { name: "Tema" }) as HTMLSelectElement).value).toBe("light");
  await userEvent.selectOptions(screen.getByRole("combobox"), "dark");
  expect(document.documentElement.dataset.theme).toBe("dark");
  await userEvent.selectOptions(screen.getByRole("combobox"), "system");
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  expect(localStorage.getItem("opinion-theme")).toBeNull();
});
it("funciona con almacenamiento bloqueado y sincroniza dos selectores", async () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  render(
    <>
      <Header />
      <Header />
    </>,
  );
  const [first, second] = screen.getAllByRole("combobox", { name: "Tema" });
  await userEvent.selectOptions(first, "dark");
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect((second as HTMLSelectElement).value).toBe("dark");
  await userEvent.selectOptions(second, "system");
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
});
it("acepta cambios de otra pestaña e ignora valores inválidos", () => {
  localStorage.setItem("opinion-theme", "invalid");
  render(<Header />);
  expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("system");
  localStorage.setItem("opinion-theme", "dark");
  fireEvent(window, new StorageEvent("storage", { key: "opinion-theme" }));
  expect(document.documentElement.dataset.theme).toBe("dark");
  expect((screen.getByRole("combobox") as HTMLSelectElement).value).toBe("dark");
});
