import { chooseTheme } from "./support/theme";
import { expect, test } from "@playwright/test";
import { createUser, seedPoll, signIn, vote, votesOf } from "./support/supabase";

// Capturas de la app completa con datos de prueba en Supabase LOCAL, nunca cifras simuladas
// en React. Cada combinación usa un votante distinto y confirma mediante la RPC real.
test("After Sunset: explorar, elegir y descubrir en seis anchos y ambos temas", async ({
  page,
  baseURL,
}, testInfo) => {
  test.setTimeout(150_000);
  const author = await createUser("sunset");
  await seedPoll(author, "¿Cuál es tu plan perfecto para un domingo?", {
    category: "estilo-de-vida",
    options: ["Salir a descubrir sitios", "Un buen libro", "Estar con los míos"],
  });
  const id = await seedPoll(author, "¿La tortilla de patatas lleva cebolla?", {
    category: "entretenimiento",
    options: ["Sí, siempre", "No, nunca", "Depende del día"],
  });
  for (let i = 0; i < 6; i++)
    await vote(await createUser("opinion"), id, i < 3 ? 0 : i < 5 ? 1 : 2);
  let total = 6;
  for (const width of [320, 375, 390, 430, 768, 1280]) {
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "no-preference" });
      await page.setViewportSize({ width, height: width < 768 ? 960 : 1000 });
      await signIn(page.context(), await createUser("lectura"), baseURL!);
      await page.goto("/?tab=recientes");
      await chooseTheme(page, theme);
      const card = page
        .getByRole("article")
        .filter({ has: page.locator(`a[href="/polls/${id}"]`) });
      await expect(card.getByRole("heading")).toHaveText("¿La tortilla de patatas lleva cebolla?");
      await expect(card.locator("[data-bar]")).toHaveCount(0);
      await expect(card).not.toContainText(/\d[\d.,]*\s*(%|votos?\b)/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const rail = page.getByRole("navigation", { name: "Categorías" });
      const tops = await rail
        .getByRole("link")
        .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().top)));
      expect(new Set(tops).size).toBe(1);
      const headerCreate = page
        .getByRole("navigation", { name: "Principal" })
        .getByRole("link", { name: "Crear encuesta" });
      if (width < 640) await expect(headerCreate).toBeHidden();
      else await expect(headerCreate).toBeVisible();
      await page.screenshot({
        path: testInfo.outputPath(`visual-${width}-${theme}-before.png`),
        animations: "disabled",
      });
      const choice = card.getByRole("radio", { name: "Sí, siempre", exact: true });
      expect((await choice.locator("..").boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await page.emulateMedia({ reducedMotion: "reduce" });
      const area = (await choice.locator("..").boundingBox())!;
      await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
      await page.mouse.down();
      await expect(choice.locator("..")).toHaveCSS("transform", "none");
      await page.mouse.up();
      await page.emulateMedia({ reducedMotion: "no-preference" });
      await choice.check();
      await expect(card.locator("[data-bar]")).toHaveCount(0);
      expect((await votesOf(id)).length).toBe(total);
      await page.screenshot({
        path: testInfo.outputPath(`visual-${width}-${theme}-selected.png`),
        animations: "disabled",
      });
      await card.getByRole("button", { name: "Votar y descubrir", exact: true }).click();
      total++;
      await expect(card.getByText("Ya has votado", { exact: true })).toBeVisible();
      await expect(card.getByText(`${total} votos en total`, { exact: true })).toBeVisible();
      await expect(card.getByText("Tu voto", { exact: true })).toBeVisible();
      expect((await votesOf(id)).length).toBe(total);
      const firstBar = card.locator("[data-bar]").first();
      await expect(firstBar).toHaveCSS("animation-duration", "0.35s");
      const shadow = await firstBar.evaluate((el) => getComputedStyle(el).boxShadow);
      expect(shadow).toContain("inset");
      expect(shadow).toContain(theme === "light" ? "rgb(53, 72, 97)" : "rgb(249, 249, 255)");
      await page.screenshot({
        path: testInfo.outputPath(`visual-${width}-${theme}-results.png`),
        animations: "disabled",
      });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(firstBar).toHaveCSS("animation-name", "none");
      await expect(choice).toHaveCount(0);
    }
  }
});
