// V2-052: la opción elegida antes de iniciar sesión sobrevive al login y al onboarding, llega marcada
// al detalle y no se vota hasta confirmar. Se prueba en escritorio y móvil.
import { expect, test, type Page } from "@playwright/test";
import { createPoll, createUser, signIn, votesOf } from "./support/supabase";

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const stamp = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

// El visitante elige y pulsa «Votar»: devuelve la ruta de retorno que llevaría el login.
async function chooseAsVisitor(page: Page, pollId: string, option: string) {
  await ready(page, `/polls/${pollId}`);
  await page.getByRole("radio", { name: option }).check();
  await page.getByRole("button", { name: "Votar y descubrir" }).click();
  const href =
    (await page
      .locator("#contenido")
      .getByRole("link", { name: "Iniciar sesión" })
      .getAttribute("href")) ?? "";
  const next = new URL(href, "http://localhost").searchParams.get("next") ?? "";
  expect(next).toMatch(new RegExp(`^/polls/${pollId}\\?elige=[0-9a-f-]{36}$`));
  expect(await votesOf(pollId)).toHaveLength(0);
  return next;
}

test("visitante: elige, inicia sesión, vuelve con la opción marcada y al confirmar ve sus resultados", async ({
  page,
  baseURL,
}) => {
  const author = await createUser("autor");
  const voter = await createUser("votante");
  const pollId = await createPoll(author, `¿E2E elige ${stamp()}?`, ["Rojo", "Azul"]);

  const next = await chooseAsVisitor(page, pollId, "Azul");

  await signIn(page.context(), voter, baseURL!);
  await ready(page, next);
  await expect(page.getByRole("radio", { name: "Azul" })).toBeChecked();
  expect(await votesOf(pollId)).toHaveLength(0);
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);

  await page.getByRole("button", { name: "Votar y descubrir" }).click();
  await expect(page.getByText("Tu voto")).toBeVisible();
  expect(await votesOf(pollId)).toEqual([expect.objectContaining({ user_id: voter.id })]);
});

test("cuenta sin @usuario: la elección sobrevive al onboarding y vuelve marcada sin voto", async ({
  page,
  baseURL,
}) => {
  const author = await createUser("autor");
  const newcomer = await createUser("nuevo", { profile: false });
  const pollId = await createPoll(author, `¿E2E elige onboarding ${stamp()}?`, ["Rojo", "Azul"]);

  const next = await chooseAsVisitor(page, pollId, "Rojo");

  await signIn(page.context(), newcomer, baseURL!);
  await ready(page, `/onboarding?next=${encodeURIComponent(next)}`);
  await page.getByLabel("Usuario").fill(`n${Date.now() % 1_000_000}`);
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.waitForURL(new RegExp(`/polls/${pollId}\\?elige=`));
  await page.waitForLoadState("networkidle");

  await expect(page.getByRole("radio", { name: "Rojo" })).toBeChecked();
  expect(await votesOf(pollId)).toHaveLength(0);
});

test("elige inválido, de otra encuesta o con voto previo se ignora sin error", async ({
  page,
  baseURL,
}) => {
  const author = await createUser("autor");
  const voter = await createUser("votante");
  const a = await createPoll(author, `¿E2E elige A ${stamp()}?`, ["Rojo", "Azul"]);
  const b = await createPoll(author, `¿E2E elige B ${stamp()}?`, ["Sí", "No"]);

  await ready(page, `/polls/${a}`);
  const other = (await votesOf(b)).length;
  expect(other).toBe(0);

  for (const bad of ["no-es-uuid", "00000000-0000-4000-8000-000000000000"]) {
    await ready(page, `/polls/${a}?elige=${bad}`);
    await expect(page.getByRole("radio", { name: "Rojo" })).not.toBeChecked();
    await expect(page.getByRole("radio", { name: "Azul" })).not.toBeChecked();
  }

  // Quien ya votó ve resultados y `elige` no cambia nada.
  await signIn(page.context(), voter, baseURL!);
  await ready(page, `/polls/${a}`);
  await page.getByRole("radio", { name: "Rojo" }).check();
  await page.getByRole("button", { name: "Votar y descubrir" }).click();
  await expect(page.getByText("Tu voto")).toBeVisible();
  await ready(page, `/polls/${a}?elige=${"0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d"}`);
  await expect(page.getByText("Tu voto")).toBeVisible();
  expect(await votesOf(a)).toHaveLength(1);
});
