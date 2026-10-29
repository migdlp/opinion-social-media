import { expect, test } from "@playwright/test";
import { createPoll, createUser, signIn, vote } from "./support/supabase";

test("Denunciar queda por encima de porcentajes y barras en ambos temas", async ({
  page,
  baseURL,
}, info) => {
  const author = await createUser("menu_capas");
  const question = `¿Se lee el menú sin mezclar resultados ${Date.now()}?`;
  const id = await createPoll(author, question, ["Primera", "Segunda"]);
  await vote(author, id, 0);
  await signIn(page.context(), author, baseURL!);
  for (const theme of ["light", "dark"] as const) {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto("/");
    const card = page.locator("article", { hasText: question });
    const trigger = card.getByRole("button", { name: "Más acciones" });
    await trigger.click();
    const menu = card.getByRole("menu");
    await expect(menu).toBeVisible();
    await page.screenshot({ path: info.outputPath(`menu-${theme}.png`) });
    expect(
      await menu.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return [0.2, 0.5, 0.8].every((x) =>
          [0.25, 0.75].every((y) =>
            element.contains(
              document.elementFromPoint(rect.x + rect.width * x, rect.y + rect.height * y),
            ),
          ),
        );
      }),
    ).toBe(true);
    await expect(menu).toHaveCSS(
      "background-color",
      theme === "light" ? "rgb(255, 255, 255)" : "rgb(53, 72, 97)",
    );
    await page.keyboard.press("Escape");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();
  }
});

test("el menú cabe sobre la barra inferior cuando el botón está en el borde", async ({
  page,
  baseURL,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const author = await createUser("menu_borde");
  const question = `¿Menú cerca del borde ${Date.now()}?`;
  const id = await createPoll(author, question, ["Primera", "Segunda"]);
  await vote(author, id, 0);
  for (let i = 0; i < 2; i++)
    await createPoll(author, `¿Encuesta anterior al objetivo ${Date.now()} ${i}?`, ["Sí", "No"]);
  await signIn(page.context(), author, baseURL!);
  await page.goto("/");
  const trigger = page
    .locator("article", { hasText: question })
    .getByRole("button", { name: "Más acciones" });
  await trigger.evaluate((el) => {
    const nav = document
      .querySelector('nav[aria-label="Navegación móvil"]')!
      .getBoundingClientRect();
    window.scrollBy(0, el.getBoundingClientRect().bottom - (nav.top - 8));
  });
  await trigger.click();
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  const bounds = await menu.evaluate((el) => ({
    bottom: el.getBoundingClientRect().bottom,
    top: el.getBoundingClientRect().top,
    nav: document.querySelector('nav[aria-label="Navegación móvil"]')!.getBoundingClientRect().top,
  }));
  expect(bounds.top).toBeGreaterThanOrEqual(0);
  expect(bounds.bottom).toBeLessThanOrEqual(bounds.nav);
});
