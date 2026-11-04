import { chooseTheme } from "./support/theme";
import { expect, test } from "@playwright/test";

for (const theme of ["light", "dark"] as const) {
  test(`After Sunset: base y CTA accesibles en ${theme}`, async ({ page }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme });
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 850 });
      await page.goto("/login");
      await chooseTheme(page, theme);
      const google = page.getByRole("button", { name: "Continuar con Google" });
      const create = page.getByRole("link", { name: "Crear encuesta", exact: true });
      await expect(google).toBeVisible();
      await expect(page.locator("body")).toHaveCSS(
        "background-color",
        theme === "dark" ? "rgb(22, 30, 46)" : "rgb(249, 249, 255)",
      );
      if (width < 640) await expect(create).toBeHidden();
      for (const action of width < 640 ? [google] : [google, create]) {
        await expect(action).toHaveCSS("background-color", "rgb(255, 177, 107)");
        await expect(action).toHaveCSS("color", "rgb(22, 30, 46)");
      }
      await google.focus();
      await page.keyboard.press("Tab");
      await page.keyboard.press("Shift+Tab");
      await expect(google).toBeFocused();
      await expect(google).toHaveCSS("outline-width", "2px");
      await expect(google).toHaveCSS(
        "outline-color",
        theme === "dark" ? "rgb(255, 177, 107)" : "rgb(22, 30, 46)",
      );
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await testInfo.attach(`${theme}-${width}`, {
        body: await page.screenshot(),
        contentType: "image/png",
      });

      if (await page.evaluate(() => matchMedia("(hover: hover)").matches)) {
        await google.hover();
        await expect(google).toHaveCSS("background-color", "rgb(255, 194, 140)");
      }
      // Ejercita el estado desactivado sin iniciar OAuth ni salir hacia Google.
      await google.evaluate((button: HTMLButtonElement) => {
        button.disabled = true;
      });
      await expect(google).toHaveCSS(
        "background-color",
        theme === "dark" ? "rgb(36, 50, 70)" : "rgb(255, 223, 192)",
      );
      await expect(google).toHaveCSS(
        "color",
        theme === "dark" ? "rgb(180, 200, 245)" : "rgb(53, 72, 97)",
      );
      await expect(google).toHaveCSS("opacity", "1");
    }
  });
}
