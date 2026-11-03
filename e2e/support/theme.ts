import { expect, type Page } from "@playwright/test";

// Desde D-032 el sistema no elige el tema: las regresiones visuales lo cambian con la UI real.
export async function chooseTheme(page: Page, theme: "light" | "dark") {
  const html = page.locator("html");
  if ((await html.getAttribute("data-theme")) !== theme) {
    await page
      .getByRole("navigation", { name: "Principal" })
      .getByRole("button", {
        name: theme === "dark" ? "Activar modo oscuro" : "Activar modo claro",
      })
      .click();
  }
  await expect(html).toHaveAttribute("data-theme", theme);
}
