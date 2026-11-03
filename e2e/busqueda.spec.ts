// SEARCH-002: pantalla /search en la app compilada contra Supabase local, en escritorio y móvil:
// consulta en la URL, estados, permisos de la búsqueda, voto desde un resultado y la lupa móvil.
import { expect, test, type Page } from "@playwright/test";
import { createUser, seedPoll, signIn, vote, votesOf } from "./support/supabase";

const stamp = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
const tag = () => `zanahoria${Date.now() % 1_000_000}${Math.floor(Math.random() * 1e4)}`;

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const searchBox = (page: Page) => page.getByRole("searchbox", { name: "Buscar encuestas" });
const results = (page: Page) => page.locator("[role=feed] article");

test("sin consulta invita a buscar y una consulta de un carácter no busca nada", async ({
  page,
}) => {
  await ready(page, "/search");
  await expect(page.getByText(/escribe una palabra/i)).toBeVisible();
  await expect(results(page)).toHaveCount(0);

  await ready(page, "/search?q=a");
  await expect(page.getByText(/al menos 2 caracteres/i)).toBeVisible();
  await expect(results(page)).toHaveCount(0);
});

test("visitante: busca, la consulta queda en la URL, atrás/adelante la conservan y no ve recuentos", async ({
  page,
}) => {
  const author = await createUser("autor");
  const word = tag();
  const question = `¿E2E ${word} busca ${stamp()}?`;
  await seedPoll(author, question);
  await seedPoll(author, `¿E2E otra cosa ${stamp()}?`);

  await ready(page, "/search");
  await searchBox(page).fill(word);
  await searchBox(page).press("Enter");
  await expect(page).toHaveURL(new RegExp(`/search\\?q=${word}`));
  await page.waitForLoadState("networkidle");
  await expect(results(page)).toHaveCount(1);
  await expect(page.locator("article", { hasText: question })).toBeVisible();
  await expect(searchBox(page)).toHaveValue(word);
  // Los resultados de una abierta no traen cifras antes de votar.
  await expect(page.locator("main")).not.toContainText(/\d\s?%|\d\s+votos?|en total/i);

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/search\\?q=${word}`));
  await expect(searchBox(page)).toHaveValue(word);
  await expect(page.locator("article", { hasText: question })).toBeVisible();
});

test("consulta sin resultados: lo dice y ofrece volver al feed", async ({ page }) => {
  await ready(page, `/search?q=${encodeURIComponent(`sinresultados${stamp()}`)}`);
  await expect(page.getByText(/ninguna encuesta con/i)).toBeVisible();
  await page.getByRole("link", { name: "Ver el feed" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("no se encuentran las encuestas de una cuenta privada sin permiso, pero sí las propias", async ({
  page,
  baseURL,
}) => {
  const priv = await createUser("privada", { isPrivate: true });
  const stranger = await createUser("extrano");
  const word = tag();
  await seedPoll(priv, `¿E2E ${word} privada ${stamp()}?`);

  await signIn(page.context(), stranger, baseURL!);
  await ready(page, `/search?q=${word}`);
  await expect(page.getByText(/ninguna encuesta con/i)).toBeVisible();

  await page.context().clearCookies();
  await signIn(page.context(), priv, baseURL!);
  await ready(page, `/search?q=${word}`);
  await expect(results(page)).toHaveCount(1);
});

test("con sesión: se vota desde un resultado y el voto persiste al recargar", async ({
  page,
  baseURL,
}) => {
  const author = await createUser("autor");
  const voter = await createUser("votante");
  const word = tag();
  const question = `¿E2E ${word} vota ${stamp()}?`;
  const pollId = await seedPoll(author, question);

  await signIn(page.context(), voter, baseURL!);
  await ready(page, `/search?q=${word}`);
  const card = page.locator("article", { hasText: question });
  await card.getByRole("radio", { name: "Sí", exact: true }).check();
  await card.getByRole("button", { name: "Votar y descubrir" }).click();
  await expect(card.getByText("Tu voto")).toBeVisible();

  await ready(page, `/search?q=${word}`);
  await expect(page.locator("article", { hasText: question }).getByText("Tu voto")).toBeVisible();
  expect(await votesOf(pollId)).toEqual([expect.objectContaining({ user_id: voter.id })]);
});

test("con resultados ya votados por otra persona, un visitante no ve sus cifras", async ({
  page,
}) => {
  const author = await createUser("autor");
  const other = await createUser("otro");
  const word = tag();
  const question = `¿E2E ${word} cifras ${stamp()}?`;
  const pollId = await seedPoll(author, question);
  await vote(other, pollId, 0);

  await ready(page, `/search?q=${word}`);
  await expect(page.locator("article", { hasText: question })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(/\d\s?%|\d\s+votos?|en total/i);
});

test("acceso: lupa en la barra móvil o enlace en la cabecera de escritorio", async ({
  page,
}, testInfo) => {
  await ready(page, "/");
  if (testInfo.project.name === "movil") {
    const nav = page.getByRole("navigation", { name: "Navegación móvil" });
    const box = await nav.getByRole("link", { name: "Buscar" }).boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    const viewport = page.viewportSize()!;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      viewport.width,
    );
    await nav.getByRole("link", { name: "Buscar" }).click();
  } else {
    await page
      .getByRole("navigation", { name: "Principal" })
      .getByRole("link", { name: "Buscar" })
      .click();
  }
  await expect(page).toHaveURL(/\/search$/);
  await expect(searchBox(page)).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Buscar" })).toBeVisible();
});

test("error de red al cargar más: la lista se conserva y se puede continuar", async ({ page }) => {
  const author = await createUser("autor");
  const word = tag();
  for (let i = 0; i < 22; i++) await seedPoll(author, `¿E2E ${word} número ${i} ${stamp()}?`);

  await ready(page, `/search?q=${word}`);
  await expect(results(page)).toHaveCount(20);
  await page.route("**/*", (route) =>
    route.request().method() === "POST" && route.request().headers()["next-action"]
      ? route.abort()
      : route.continue(),
  );
  await page.getByRole("button", { name: "Cargar más" }).click();
  await expect(page.getByText(/no hay conexión/i)).toBeVisible();
  await expect(results(page)).toHaveCount(20);
  await page.unroute("**/*");
  await page.getByRole("button", { name: "Cargar más" }).click();
  await expect(results(page)).toHaveCount(22);
});
