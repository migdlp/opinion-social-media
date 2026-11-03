import { expect, test, type Page } from "@playwright/test";
import { closePoll, createUser, seedPoll, signIn, vote } from "./support/supabase";
import { chooseTheme } from "./support/theme";

// El perfil público aísla la colección del resto de encuestas de la suite. Usa el mismo
// FeedList y su paginación real, con sesiones/RPC de Supabase exclusivamente local.
async function expectAligned(page: Page, width: number, count: number) {
  const cards = page.locator(".feed-grid > article");
  await expect(cards).toHaveCount(count);
  await page.evaluate(() => document.fonts.ready);
  const boxes = await cards.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      const top = (selector: string) =>
        element.querySelector(selector)?.getBoundingClientRect().top ?? null;
      return {
        top: box.top,
        bottom: box.bottom,
        title: top("h2"),
        options: top("fieldset, [aria-live]"),
        footer: top(".poll-card-footer"),
        submit: top('button[type="submit"]'),
      };
    }),
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (let i = 0; i < boxes.length; i++) {
    if (width < 768) {
      if (i > 0) expect(boxes[i].top).toBeGreaterThanOrEqual(boxes[i - 1].bottom);
    } else if (i % 2 === 1) {
      for (const key of ["top", "bottom", "title", "options", "footer", "submit"] as const) {
        const first = boxes[i - 1][key];
        const second = boxes[i][key];
        if (first !== null && second !== null) {
          expect(Math.abs(first - second), `pareja ${i}, ${key}, ${width}px`).toBeLessThanOrEqual(
            1,
          );
        }
      }
    }
  }
}

test("tarjetas: anclajes alineados con 2/3/6 opciones, textos largos y resultados", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(testInfo.project.name !== "escritorio", "La matriz ya incluye ambos tamaños.");
  test.setTimeout(180_000);
  const author = await createUser("rejilla");
  const ids: string[] = [];
  for (const [index, count] of [2, 6, 3, 2, 6, 3].entries()) {
    ids.push(
      await seedPoll(
        author,
        index % 2
          ? `¿Qué alternativa prefieres cuando la pregunta tiene varias líneas y necesitas comparar todas las respuestas sin perder información? (${index})`
          : `¿Qué alternativa eliges? (${index})`,
        {
          options: Array.from({ length: count }, (_, option) =>
            option === 0 && index > 1
              ? "Una respuesta larga que ocupa varias líneas y debe seguir siendo legible sin recortarse"
              : `Alternativa ${option + 1}`,
          ),
        },
      ),
    );
  }
  await closePoll(ids[2], 1);
  for (const width of [320, 390, 1024, 1280]) {
    for (const theme of ["light", "dark"] as const) {
      const viewer = await createUser("lectorgrid");
      await vote(viewer, ids[3], 0);
      await signIn(page.context(), viewer, baseURL!);
      await page.setViewportSize({ width, height: 960 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(`/u/${author.username}`);
      await chooseTheme(page, theme);
      const card = page.locator("article", {
        has: page.locator(`h2 a[href="/polls/${ids[1]}"]`),
      });
      await expect(card.getByRole("radio")).toHaveCount(6);
      await expect(card.locator("[data-bar]")).toHaveCount(0);
      await expectAligned(page, width, 6);
      await page.screenshot({
        path: testInfo.outputPath(`visual-grid-${width}-${theme}-before.png`),
        fullPage: true,
      });
      await card.getByRole("radio").first().check();
      await card.getByRole("button", { name: "Votar y descubrir", exact: true }).click();
      await expect(card.getByText("Ya has votado", { exact: true })).toBeVisible();
      await expect(card.locator("[data-bar]")).toHaveCount(6);
      await expectAligned(page, width, 6);
      await page.screenshot({
        path: testInfo.outputPath(`visual-grid-${width}-${theme}-after.png`),
        fullPage: true,
      });
    }
  }
});

test("las tarjetas añadidas con Cargar más conservan la cuadrícula", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "escritorio", "Regresión de paginación en dos columnas.");
  test.setTimeout(90_000);
  const author = await createUser("gridpagina");
  for (let index = 0; index < 23; index++) {
    await seedPoll(author, `¿Qué alternativa prefieres en la encuesta número ${index}?`, {
      options: Array.from(
        { length: index % 2 ? 6 : 2 },
        (_, option) => `Alternativa ${option + 1}`,
      ),
    });
  }
  await page.addInitScript(() => {
    Object.defineProperty(window, "IntersectionObserver", { value: undefined, configurable: true });
  });
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.goto(`/u/${author.username}`);
  await expectAligned(page, 1280, 20);
  await page.getByRole("button", { name: "Cargar más", exact: true }).click();
  await expectAligned(page, 1280, 23);
  await expect(page.getByText("No hay más encuestas", { exact: true })).toBeVisible();
  await chooseTheme(page, "dark");
  await expectAligned(page, 1280, 23);
});
