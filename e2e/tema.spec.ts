import { expect, test } from "@playwright/test";

const LIGHT = "rgb(249, 249, 255)";
const DARK = "rgb(22, 30, 46)";

test("tema manual prevalece sobre sistema, persiste y vuelve a Sistema", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  const select = page.getByRole("combobox", { name: "Tema", exact: true });
  await expect(page.locator("body")).toHaveCSS("background-color", DARK);
  await select.selectOption("light");
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT);
  await page.reload();
  await expect(select).toHaveValue("light");
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT);
  await page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("link", { name: "Opinión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "Encuestas", exact: true })).toBeAttached();
  await expect(select).toHaveValue("light");
  // PERF-001 #262 investiga la actualización tardía de la barra tras transición cliente.
  // Una carga completa permite verificar aquí dark: sin mezclar esa incidencia.
  await page.reload();
  if (page.viewportSize()!.width < 640) {
    await expect(
      page
        .getByRole("navigation", { name: "Navegación móvil" })
        .getByRole("link", { name: "Feed" }),
    ).toHaveCSS("color", DARK);
  }
  await select.selectOption("dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("body")).toHaveCSS("background-color", DARK);
  await select.selectOption("system");
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT);
  expect(await page.evaluate(() => localStorage.getItem("opinion-theme"))).toBeNull();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("body")).toHaveCSS("background-color", DARK);
});

test("tema guardado se aplica antes del body, sin errores de hidratación", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && /hydrat/i.test(message.text())) errors.push(message.text());
  });
  await page.emulateMedia({ colorScheme: "dark" });
  await page.addInitScript(() => {
    localStorage.setItem("opinion-theme", "light");
    new MutationObserver((_, observer) => {
      if (document.documentElement?.dataset.theme === "light") {
        document.documentElement.dataset.themeBeforeBody = String(!document.body);
        observer.disconnect();
      }
    }).observe(document, { subtree: true, attributes: true });
  });
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("data-theme-before-body", "true");
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT);
  await expect(page.getByRole("combobox", { name: "Tema" })).toHaveValue("light");
  expect(errors).toEqual([]);
});

test("almacenamiento bloqueado no impide cambiar de tema ni navegar", async ({ page }) => {
  await page.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"]) {
      Object.defineProperty(Storage.prototype, method, {
        value: () => {
          throw new Error("blocked");
        },
      });
    }
  });
  await page.goto("/login");
  await page.getByRole("combobox", { name: "Tema" }).selectOption("dark");
  await expect(page.locator("body")).toHaveCSS("background-color", DARK);
  await page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("link", { name: "Opinión", exact: true })
    .click();
  await expect(page.getByRole("combobox", { name: "Tema" })).toHaveValue("dark");
  await expect(page.locator("body")).toHaveCSS("background-color", DARK);
});

test("selector visible, foco y temas sin desbordamiento en móvil y escritorio", async ({
  page,
}, info) => {
  await page.emulateMedia({ colorScheme: "dark" });
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    const select = page.getByRole("combobox", { name: "Tema" });
    await expect(
      page.getByRole("link", { name: "Iniciar sesión", exact: true }).first(),
    ).toBeVisible();
    const box = await select.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await select.focus();
    await expect(select.locator("..")).toHaveCSS("outline-width", "2px");
    await page.keyboard.press("Home");
    await page.keyboard.press("ArrowDown");
    await expect(select).toHaveValue("light");
    await page.keyboard.press("Escape");
    for (const [theme, background] of [
      ["light", LIGHT],
      ["dark", DARK],
    ]) {
      await select.selectOption(theme);
      await expect(page.locator("body")).toHaveCSS("background-color", background);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: info.outputPath(`visual-theme-${width}-${theme}.png`) });
    }
  }
});
