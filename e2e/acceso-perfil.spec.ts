import { expect, test } from "@playwright/test";
import { createPoll, createUser, signIn } from "./support/supabase";

test("el menú de cuenta y Perfil móvil abren el usuario propio", async ({ page, baseURL }) => {
  const user = await createUser("acceso_perfil");
  const question = `¿Acceso al autor desde su encuesta ${Date.now()}?`;
  await createPoll(user, question, ["Sí", "No"]);
  await signIn(page.context(), user, baseURL!);
  await page.goto("/");
  await page
    .locator("article", { hasText: question })
    .getByRole("link", {
      name: `@${user.username}`,
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(`/u/${user.username}`);
  await page.goto("/");
  await page.getByLabel("Menú de cuenta").click();
  await page.getByRole("link", { name: "Mi perfil", exact: true }).click();
  await expect(page).toHaveURL(`/u/${user.username}`);
  await expect(page.getByRole("heading", { name: `@${user.username}`, exact: true })).toBeVisible();

  await page.goto("/");
  const mobile = page.getByRole("navigation", { name: "Navegación móvil" });
  if (await mobile.isVisible()) {
    await mobile.getByRole("link", { name: "Perfil", exact: true }).click();
    await expect(page).toHaveURL(`/u/${user.username}`);
  }
});

test("Perfil sin usuario lleva al onboarding y vuelve al perfil elegido", async ({
  page,
  baseURL,
}) => {
  const user = await createUser("sin_perfil", { profile: false });
  await signIn(page.context(), user, baseURL!);
  await page.goto("/me");
  await expect(page).toHaveURL(/\/onboarding\?next=%2Fme$/);
  await expect(page.getByRole("heading", { name: "Elige tu usuario" })).toBeVisible();
  const username = `qa_${user.id.replaceAll("-", "").slice(0, 12)}`;
  await page.getByLabel("Usuario", { exact: true }).fill(username);
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page).toHaveURL(`/u/${username}`);
});

test("el error de perfil ofrece reintento y nunca filtra errores internos", async ({ page }) => {
  await page.goto("/me/error");
  await expect(page.getByRole("alert")).toContainText("No se ha podido abrir tu perfil");
  await page.getByRole("link", { name: "Reintentar", exact: true }).click();
  await expect(page).toHaveURL(/\/login\?next=%2Fme$/);
});
