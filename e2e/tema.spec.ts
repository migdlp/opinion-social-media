import { expect, test } from "@playwright/test";
import { chooseTheme } from "./support/theme";

const LIGHT = "rgb(249, 249, 255)";
const DARK = "rgb(22, 30, 46)";

test("Claro inicial incluso con sistema oscuro; botón alterna, persiste y no sigue al sistema", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT);
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await page.getByRole("button", { name: "Activar modo oscuro" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", DARK);
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("body")).toHaveCSS("background-color", DARK);
  await page.reload();
  await expect(page.getByRole("button", { name: "Activar modo claro" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("link", { name: "Opinión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("body")).toHaveCSS("background-color", DARK);
  await page.getByRole("button", { name: "Activar modo claro" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT);
  expect(await page.evaluate(() => localStorage.getItem("opinion-theme"))).toBe("light");
});

for (const stored of [null, "system", "invalid", "dark"]) {
  test(`preferencia heredada ${stored}: bootstrap anterior al body sin errores de hidratación`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error" && /hydrat/i.test(message.text())) errors.push(message.text());
    });
    await page.emulateMedia({ colorScheme: "dark" });
    await page.addInitScript((value) => {
      if (value) localStorage.setItem("opinion-theme", value);
      new MutationObserver((_, observer) => {
        if (document.documentElement?.dataset.theme) {
          document.documentElement.dataset.themeBeforeBody = String(!document.body);
          observer.disconnect();
        }
      }).observe(document, { subtree: true, attributes: true });
    }, stored);
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("data-theme-before-body", "true");
    await expect(page.locator("body")).toHaveCSS(
      "background-color",
      stored === "dark" ? DARK : LIGHT,
    );
    await expect(
      page.getByRole("button", {
        name: stored === "dark" ? "Activar modo claro" : "Activar modo oscuro",
      }),
    ).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("almacenamiento bloqueado permite alternar y navegar durante la visita", async ({ page }) => {
  await page.addInitScript(() => {
    for (const method of ["getItem", "setItem", "removeItem"])
      Object.defineProperty(Storage.prototype, method, {
        value: () => {
          throw new Error("blocked");
        },
      });
  });
  await page.goto("/login");
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT);
  await page.getByRole("button", { name: "Activar modo oscuro" }).click();
  await page
    .getByRole("navigation", { name: "Principal" })
    .getByRole("link", { name: "Opinión", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("body")).toHaveCSS("background-color", DARK);
  await page.getByRole("button", { name: "Activar modo claro" }).click();
  await expect(page.locator("body")).toHaveCSS("background-color", LIGHT);
});

test("el tema elegido se sincroniza entre pestañas", async ({ page, context }) => {
  await page.goto("/login");
  const second = await context.newPage();
  try {
    await second.goto("/login");
    await page.getByRole("button", { name: "Activar modo oscuro" }).click();
    await expect(second.getByRole("button", { name: "Activar modo claro" })).toBeVisible();
    await second.getByRole("button", { name: "Activar modo claro" }).click();
    await expect(page.locator("body")).toHaveCSS("background-color", LIGHT);
  } finally {
    await second.close();
  }
});

test("icono, teclado, foco y temas sin desbordamiento", async ({ page }, info) => {
  await page.emulateMedia({ colorScheme: "dark" });
  for (const width of [320, 390, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await chooseTheme(page, "light");
    const button = page.getByRole("button", { name: /Activar modo/ });
    const box = await button.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await button.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("button", { name: "Activar modo claro" })).toBeFocused();
    await expect(button).toHaveCSS("outline-width", "2px");
    await page.keyboard.press("Space");
    await expect(page.locator("body")).toHaveCSS("background-color", LIGHT);
    for (const theme of ["light", "dark"] as const) {
      await chooseTheme(page, theme);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: info.outputPath(`visual-theme-${width}-${theme}.png`),
        animations: "disabled",
      });
    }
  }
});

test("el CSS inicial es claro aun sin JavaScript y con dispositivo oscuro", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    colorScheme: "dark",
    baseURL,
  });
  try {
    const page = await context.newPage();
    await page.goto("/login");
    await expect(page.locator("body")).toHaveCSS("background-color", LIGHT);
  } finally {
    await context.close();
  }
});
