// V2-033: voto desde la tarjeta del feed en la app compilada contra Supabase local. Ninguna tarjeta
// sin voto muestra cifras; el voto se emite sólo al confirmar; un visitante pasa por el login.
import { expect, test, type Page } from "@playwright/test";
import { createPoll, createUser, signIn, votesOf } from "./support/supabase";

const AGGREGATES = /\d\s?%|\d\s+votos?|en total/i;

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const stamp = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

test("con sesión: elige y confirma en la tarjeta, ve los resultados ahí y persisten al recargar", async ({
  page,
  baseURL,
}) => {
  const author = await createUser("autor");
  const voter = await createUser("votante");
  const question = `¿E2E tarjeta ${stamp()}?`;
  const pollId = await createPoll(author, question, ["Rojo", "Azul"]);

  await signIn(page.context(), voter, baseURL!);
  await ready(page, "/");
  const card = page.locator("article", { hasText: question });
  await expect(card).toBeVisible();
  await expect(card).not.toContainText(AGGREGATES);
  expect(await page.content()).not.toMatch(/"totalVotes"|"percentage"/);

  // Elegir no vota: hay que confirmar.
  await card.getByRole("radio", { name: "Azul" }).check();
  expect(await votesOf(pollId)).toHaveLength(0);
  await card.getByRole("button", { name: "Votar" }).click();

  await expect(card.getByText("Tu voto")).toBeVisible();
  await expect(card.getByText("1 voto en total")).toBeVisible();
  await expect(card.getByRole("button", { name: "Votar" })).toHaveCount(0);
  expect(await votesOf(pollId)).toEqual([expect.objectContaining({ user_id: voter.id })]);

  // Tras recargar, la tarjeta ya muestra los resultados y no ofrece votar de nuevo.
  await ready(page, "/");
  const again = page.locator("article", { hasText: question });
  await expect(again.getByText("Tu voto")).toBeVisible();
  await expect(again.getByRole("radio")).toHaveCount(0);
  expect(await votesOf(pollId)).toHaveLength(1);
});

test("el doble clic en «Votar» emite un único voto", async ({ page, baseURL }) => {
  const author = await createUser("autor");
  const voter = await createUser("votante");
  const question = `¿E2E doble clic ${stamp()}?`;
  const pollId = await createPoll(author, question, ["Sí", "No"]);

  await signIn(page.context(), voter, baseURL!);
  await ready(page, "/");
  const card = page.locator("article", { hasText: question });
  await card.getByRole("radio", { name: "No", exact: true }).check();
  await card.getByRole("button", { name: "Votar" }).dblclick();

  await expect(card.getByText("Tu voto")).toBeVisible();
  expect(await votesOf(pollId)).toHaveLength(1);
});

test("visitante: al confirmar va al login con la encuesta y la opción, y no se emite ningún voto", async ({
  page,
}) => {
  const author = await createUser("autor");
  const question = `¿E2E visitante tarjeta ${stamp()}?`;
  const pollId = await createPoll(author, question, ["Rojo", "Azul"]);

  await ready(page, "/");
  const card = page.locator("article", { hasText: question });
  await card.getByRole("radio", { name: "Azul" }).check();
  await card.getByRole("button", { name: "Votar" }).click();

  const login = card.getByRole("link", { name: "Iniciar sesión" });
  await expect(login).toBeVisible();
  const href = (await login.getAttribute("href")) ?? "";
  const next = new URL(href, "http://localhost").searchParams.get("next") ?? "";
  expect(next).toMatch(new RegExp(`^/polls/${pollId}\\?option=[0-9a-f-]{36}$`));
  expect(await votesOf(pollId)).toHaveLength(0);

  // Al volver, la opción llega marcada pero sigue sin emitirse el voto hasta confirmar.
  await ready(page, next);
  await expect(page.getByRole("radio", { name: "Azul" })).toBeChecked();
  expect(await votesOf(pollId)).toHaveLength(0);
});
