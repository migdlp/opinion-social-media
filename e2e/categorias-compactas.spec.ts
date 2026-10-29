import { expect, test } from "@playwright/test";

test("categorías es una fila desplazable y accesible sin ensanchar la página", async ({ page }) => {
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/?tab=recientes");
      const rail = page.getByRole("navigation", { name: "Categorías" });
      const links = rail.getByRole("link");
      await expect(links).toHaveCount(8);
      expect(
        await links.evaluateAll(
          (items) => new Set(items.map((el) => Math.round(el.getBoundingClientRect().top))).size,
        ),
      ).toBe(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      if (width < 768)
        expect(await rail.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true);
      await links.first().focus();
      await page.keyboard.press("End");
      await expect(links.last()).toBeFocused();
      await expect(links.last()).toBeInViewport();
      await page.keyboard.press("Home");
      await expect(links.first()).toBeFocused();
    }
  }
});

test("recargar una categoría del final conserva selección visible y URL", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/?tab=recientes&categoria=otros");
  await page.reload();
  const rail = page.getByRole("navigation", { name: "Categorías" });
  const current = rail.getByRole("link", { name: "Otros", exact: true });
  await expect(current).toHaveAttribute("aria-current", "page");
  await expect(current).toBeInViewport();
  await expect(page).toHaveURL(/tab=recientes&categoria=otros$/);
  await rail.getByRole("link", { name: "Todas", exact: true }).click();
  await expect(page).toHaveURL(/\?tab=recientes$/);
});
