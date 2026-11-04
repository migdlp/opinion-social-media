// MVP-045: navegación, sesión de prueba, creación y voto en la app compilada contra
// Supabase local. Ninguna pantalla debe mostrar agregados antes de votar.
import { expect, test, type Page } from "@playwright/test";
import { createPoll, createUser, signIn, vote, votesOf } from "./support/supabase";

// Cualquier cifra de resultados: porcentajes reales («50 %»), recuentos o el total.
const AGGREGATES = /\d\s?%|\d\s+votos?|en total/i;

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const stamp = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

test("visitante: navega por feed y detalle y sólo ve opciones, sin resultados", async ({
  page,
}) => {
  const author = await createUser("autor");
  const voter = await createUser("votante");
  const question = `¿E2E visitante ${stamp()}?`;
  const pollId = await createPoll(author, question, ["Rojo", "Azul"]);
  await vote(voter, pollId, 0); // hay un voto real que no debe filtrarse

  await ready(page, "/");
  const card = page.locator("article", { hasText: question });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Rojo");
  await expect(card).not.toContainText(AGGREGATES);
  // Se vota desde la propia tarjeta (V2-033): opciones para elegir y confirmar, sin cifras.
  await expect(card.getByRole("button", { name: "Votar y descubrir" })).toBeVisible();

  await card.getByRole("link", { name: question }).click();
  await expect(page).toHaveURL(`/polls/${pollId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("radio", { name: "Rojo" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Azul" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(AGGREGATES);
  expect(await page.content()).not.toMatch(/"totalVotes"|"percentage"/);

  // Votar sin sesión pide iniciar sesión y no registra nada.
  await page.getByRole("radio", { name: "Azul" }).check();
  await page.getByRole("button", { name: "Votar y descubrir" }).click();
  await expect(page.getByText("Inicia sesión para votar")).toBeVisible();
  expect(await votesOf(pollId)).toHaveLength(1);
});

test("usuario de prueba crea una encuesta, aparece en el feed y otro usuario vota y ve resultados", async ({
  page,
  browser,
  baseURL,
}) => {
  const author = await createUser("autor");
  const voter = await createUser("votante");
  const question = `¿E2E crear y votar ${stamp()}?`;

  await signIn(page.context(), author, baseURL!);
  await ready(page, "/create");
  await page.getByLabel("Pregunta").fill(question);
  await page.getByLabel("Opción 1").fill("Sí");
  await page.getByLabel("Opción 2").fill("No");
  await page.getByRole("button", { name: "Publicar" }).click();
  await page.waitForURL(/\/polls\/[0-9a-f-]{36}$/);
  const pollId = new URL(page.url()).pathname.split("/").pop()!;
  await expect(page.getByRole("heading", { name: question })).toBeVisible();
  // El autor tampoco ve resultados antes de votar.
  await expect(page.locator("main")).not.toContainText(AGGREGATES);

  await ready(page, "/");
  await expect(page.locator("article", { hasText: question })).toBeVisible();

  const voterContext = await browser.newContext();
  try {
    await signIn(voterContext, voter, baseURL!);
    const voterPage = await voterContext.newPage();
    await ready(voterPage, `/polls/${pollId}`);
    await voterPage.getByRole("radio", { name: "No" }).check();
    await voterPage.getByRole("button", { name: "Votar y descubrir" }).click();
    await expect(voterPage.getByText("Tu voto")).toBeVisible();
    await expect(voterPage.getByText("1 voto en total")).toBeVisible();
    await expect(voterPage.getByText(/^100,0\s%$/)).toBeVisible();
  } finally {
    await voterContext.close();
  }
  expect(await votesOf(pollId)).toEqual([expect.objectContaining({ user_id: voter.id })]);
});

test("sesión persistente: tras recargar, la encuesta votada sigue con resultados y sin opción de votar", async ({
  page,
  baseURL,
}) => {
  const author = await createUser("autor");
  const voter = await createUser("votante");
  const question = `¿E2E recarga ${stamp()}?`;
  const pollId = await createPoll(author, question, ["Mar", "Montaña"]);

  await signIn(page.context(), voter, baseURL!);
  await ready(page, `/polls/${pollId}`);
  await page.getByRole("radio", { name: "Montaña" }).check();
  await page.getByRole("button", { name: "Votar y descubrir" }).click();
  await expect(page.getByText("Tu voto")).toBeVisible();

  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Tu voto")).toBeVisible();
  await expect(page.getByText("1 voto en total")).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Votar y descubrir" })).toHaveCount(0);

  // En el feed, su tarjeta también muestra el resultado.
  await ready(page, "/");
  const card = page.locator("article", { hasText: question });
  await expect(card.getByText("Tu voto")).toBeVisible();
  await expect(card.getByRole("button", { name: "Votar y descubrir" })).toHaveCount(0);
});
