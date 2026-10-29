// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { parseTheme, THEME_BOOTSTRAP } from "./theme";

afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});
it.each([null, "", "invalid", "system", "<script>"])(
  "no acepta %s como preferencia manual",
  (value) => {
    expect(parseTheme(value)).toBe("system");
  },
);
it.each(["light", "dark"])("bootstrap aplica %s sin modificar almacenamiento", (value) => {
  localStorage.setItem("opinion-theme", value);
  const write = vi.spyOn(Storage.prototype, "setItem");
  // Ejecuta el mismo literal que envía el layout, sin depender del montaje de React.
  window.eval(THEME_BOOTSTRAP);
  expect(document.documentElement.dataset.theme).toBe(value);
  expect(write).not.toHaveBeenCalled();
});
it("bootstrap tolera almacenamiento bloqueado", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  expect(() => window.eval(THEME_BOOTSTRAP)).not.toThrow();
  expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
});
