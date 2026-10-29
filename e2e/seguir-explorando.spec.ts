// DESIGN-009: el detalle de una encuesta siempre ofrece «Ver más encuestas» (antes y después de votar,
// y en una cerrada) y lleva al feed. Ni antes de votar ni el enlace insinúan resultados.
import { expect, test, type Page } from "@playwright/test";
import { closePoll, createPoll, createUser, signIn } from "./support/supabase";

const AGGREGATES = /\d\s?%|\d\s+votos?|en total/i;
const stamp = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

test("visitante: el enlace está antes de votar, sin cifras, y lleva al feed", async ({ page }) => {
  const author = await createUser("autor");
  const question = `¿E2E explorar visitante ${stamp()}?`;
  const pollId = await createPoll(author, question, ["Rojo", "Azul"]);

  await ready(page, `/polls/${pollId}`);
  await expect(page.locator("article")).not.toContainText(AGGREGATES);
  const link = page.getByRole("link", { name: "Ver más encuestas" });
  await expect(link).toBeVisible();
  const box = await link.boundingBox();
  expect(box!.height).toBeGreaterThanOrEqual(44);

  await link.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("link", { name: "Iniciar sesión" }).first()).toBeVisible();
});

test("con sesión: tras votar siguen los resultados y el enlace lleva al feed", async ({
  page,
  baseURL,
}) => {
  const author = await createUser("autor");
  const voter = await createUser("votante");
  const question = `¿E2E explorar voto ${stamp()}?`;
  const pollId = await createPoll(author, question, ["Rojo", "Azul"]);

  await signIn(page.context(), voter, baseURL!);
  await ready(page, `/polls/${pollId}`);
  await expect(page.getByRole("link", { name: "Ver más encuestas" })).toBeVisible();

  await page.getByRole("radio", { name: "Azul" }).check();
  await page.getByRole("button", { name: "Votar y descubrir" }).click();
  await expect(page.getByText("Tu voto")).toBeVisible();
  // Con un único voto la frase de V2-016 es «Eres el primero en votar».
  await expect(page.getByText("Eres el primero en votar")).toBeVisible();

  const link = page.getByRole("link", { name: "Ver más encuestas" });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("article").first()).toBeVisible();
});

test("una encuesta cerrada también ofrece el enlace", async ({ page }) => {
  const author = await createUser("autor");
  const question = `¿E2E explorar cerrada ${stamp()}?`;
  const pollId = await createPoll(author, question, ["Rojo", "Azul"]);
  await closePoll(pollId, 2);

  await ready(page, `/polls/${pollId}`);
  // Un visitante ve una cerrada con sus resultados (D-020) y sin selector de voto.
  await expect(page.getByText(/^Cerrada/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Votar y descubrir" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ver más encuestas" })).toBeVisible();
});
