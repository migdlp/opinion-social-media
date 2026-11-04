// SEC-002: las cabeceras de seguridad llegan en las respuestas reales, también en el 404.
import { expect, test } from "@playwright/test";
import { securityHeaders } from "../next.config";

const ROUTES = ["/", "/login", "/ruta-que-no-existe"];

for (const path of ROUTES) {
  test(`cabeceras de seguridad en ${path}`, async ({ page }) => {
    const response = await page.goto(path);
    expect(response, path).not.toBeNull();
    const headers = response!.headers();
    for (const { key, value } of securityHeaders) {
      expect(headers[key.toLowerCase()], `${path} · ${key}`).toBe(value);
    }
  });
}

test("el script del tema sigue ejecutándose con la CSP en modo informe", async ({ page }) => {
  await page.goto("/");
  // THEME_BOOTSTRAP fija el atributo antes de la hidratación; si la CSP lo bloqueara, faltaría.
  await expect(page.locator("html")).toHaveAttribute("data-theme", /^(light|dark)$/);
});
