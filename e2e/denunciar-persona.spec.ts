// MOD-002: denunciar a una persona desde su perfil, con dos cuentas contra Supabase local, en
// escritorio y móvil: visitante, retorno tras login, éxito, duplicado, cancelar y cuenta bloqueada.
import { expect, test, type Page } from "@playwright/test";
import { admin, createUser, signIn } from "./support/supabase";

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const dialog = (page: Page, username: string | null) =>
  page.getByRole("dialog", { name: `Denunciar a @${username}` });

test("un visitante va al login y vuelve al perfil", async ({ page }) => {
  const other = await createUser("denunciado");
  await ready(page, `/u/${other.username}`);
  await page.getByRole("link", { name: "Denunciar persona" }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fu%2F/);
});

test("con sesión: exige motivo, no envía al cancelar, envía una vez y un duplicado se explica", async ({
  page,
  baseURL,
}) => {
  const me = await createUser("denuncia");
  const other = await createUser("denunciado");
  await signIn(page.context(), me, baseURL!);
  await ready(page, `/u/${other.username}`);

  await page.getByRole("button", { name: "Denunciar persona" }).click();
  await expect(dialog(page, other.username)).toContainText(/no a una encuesta/i);
  await dialog(page, other.username).getByRole("button", { name: "Enviar denuncia" }).click();
  await expect(dialog(page, other.username).getByText("Elige un motivo.")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog(page, other.username)).toHaveCount(0);
  const none = await admin
    .from("user_reports")
    .select("*", { count: "exact", head: true })
    .eq("reporter_id", me.id);
  expect(none.count).toBe(0);

  await page.getByRole("button", { name: "Denunciar persona" }).click();
  await dialog(page, other.username).getByRole("radio", { name: "Spam" }).check();
  await dialog(page, other.username).getByRole("button", { name: "Enviar denuncia" }).click();
  await expect(dialog(page, other.username).getByText(/gracias, lo revisaremos/i)).toBeVisible();
  await dialog(page, other.username).getByRole("button", { name: "Cerrar" }).click();

  const sent = await admin
    .from("user_reports")
    .select("*", { count: "exact", head: true })
    .eq("reporter_id", me.id);
  expect(sent.count).toBe(1);
  // Denunciar no bloquea ni cambia nada.
  const blocks = await admin
    .from("user_blocks")
    .select("*", { count: "exact", head: true })
    .eq("blocker_id", me.id);
  expect(blocks.count).toBe(0);

  await page.getByRole("button", { name: "Denunciar persona" }).click();
  await dialog(page, other.username).getByRole("radio", { name: "Spam" }).check();
  await dialog(page, other.username).getByRole("button", { name: "Enviar denuncia" }).click();
  await expect(dialog(page, other.username).getByRole("alert")).toContainText(
    /ya has denunciado a esta persona/i,
  );
});

test("en el perfil propio no se ofrece denunciar", async ({ page, baseURL }) => {
  const me = await createUser("denuncia");
  await signIn(page.context(), me, baseURL!);
  await ready(page, `/u/${me.username}`);
  await expect(page.getByText("Denunciar persona")).toHaveCount(0);
});

test("una cuenta bloqueada ya no tiene perfil desde el que denunciar", async ({
  page,
  baseURL,
}) => {
  const me = await createUser("denuncia");
  const other = await createUser("denunciado");
  const { error } = await admin
    .from("user_blocks")
    .insert({ blocker_id: me.id, blocked_id: other.id });
  if (error) throw error;
  await signIn(page.context(), me, baseURL!);
  await ready(page, `/u/${other.username}`);
  await expect(
    page.getByText("La página que buscas no existe o no está disponible."),
  ).toBeVisible();
  await expect(page.getByText("Denunciar persona")).toHaveCount(0);
});
