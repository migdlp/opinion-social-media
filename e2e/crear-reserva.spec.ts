// CREATE-001: Sí y No son ejemplos en los campos iniciales y valores de reserva al publicar.
import { expect, test, type Page } from "@playwright/test";
import { createUser, signIn } from "./support/supabase";

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const stamp = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

test("sin botón de plantilla, con ejemplos que se ocultan al enfocar", async ({
  page,
  baseURL,
}) => {
  const author = await createUser("autor");
  await signIn(page.context(), author, baseURL!);
  await ready(page, "/create");

  await expect(page.getByRole("button", { name: "Sí / No" })).toHaveCount(0);
  const first = page.getByLabel("Opción 1");
  await expect(first).toHaveValue("");
  await expect(first).toHaveAttribute("placeholder", "Sí");
  await first.focus();
  await expect(first).toHaveAttribute("placeholder", "");
  await page.getByLabel("Pregunta").focus();
  await expect(first).toHaveAttribute("placeholder", "Sí");
});

test("publicar sin tocar las opciones guarda Sí y No reales", async ({ page, baseURL }) => {
  const author = await createUser("autor");
  const question = `¿E2E reserva ${stamp()}?`;
  await signIn(page.context(), author, baseURL!);
  await ready(page, "/create");

  await page.getByLabel("Pregunta").fill(question);
  await page.getByRole("button", { name: "Publicar" }).click();
  await page.waitForURL(/\/polls\/[0-9a-f-]{36}$/);

  await expect(page.getByRole("heading", { name: question })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Sí", exact: true })).toBeVisible();
  await expect(page.getByRole("radio", { name: "No", exact: true })).toBeVisible();
});

test("una opción escrita y la otra vacía no se completa sola", async ({ page, baseURL }) => {
  const author = await createUser("autor");
  await signIn(page.context(), author, baseURL!);
  await ready(page, "/create");

  await page.getByLabel("Pregunta").fill(`¿E2E parcial ${stamp()}?`);
  await page.getByLabel("Opción 1").fill("Café");
  await page.getByRole("button", { name: "Publicar" }).click();

  await expect(page.getByLabel("Opción 2")).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/\/create/);
});
