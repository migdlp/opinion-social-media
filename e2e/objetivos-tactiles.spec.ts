// DESIGN-010: ningún enlace o botón de las rutas públicas queda por debajo del tamaño mínimo pulsable
// (24 px, WCAG 2.5.8), y los controles primarios llegan a 44 px de alto, en móvil estrecho y en escritorio.
import { expect, test } from "@playwright/test";
import { createPoll, createUser } from "./support/supabase";
import { findSmallTargets } from "./support/tactil";

const PRIMARY = [
  "header nav a[href='/']",
  "header nav a[href='/create']",
  "header nav a[href^='/login']",
  "button[type=submit]",
];

for (const width of [320, 390, 1280]) {
  test(`rutas públicas a ${width} px: objetivos táctiles suficientes`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 500 ? 740 : 800 });
    const author = await createUser("autor");
    const pollId = await createPoll(author, `¿E2E táctil ${Date.now()}?`, ["Rojo", "Azul"]);

    const routes = [
      "/",
      "/login",
      "/create",
      `/polls/${pollId}`,
      `/u/${author.username}`,
      `/u/${author.username}/seguidores`,
      "/ruta-que-no-existe",
    ];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle");
      const small = await findSmallTargets(page, PRIMARY);
      expect(small, `${route} a ${width} px`).toEqual([]);
    }
  });
}
