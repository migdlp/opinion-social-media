import { expect, test } from "@playwright/test";
import { createUser, signIn } from "./support/supabase";

test("ajustes: apartados, tema compartido y guardado del nombre visible", async ({
  page,
  baseURL,
}) => {
  const user = await createUser("ajustes");
  await signIn(page.context(), user, baseURL!);
  await page.goto("/settings");

  await expect(page.getByRole("heading", { level: 1, name: "Ajustes" })).toBeVisible();
  for (const name of ["Perfil", "Apariencia", "Privacidad", "Cuenta"]) {
    await expect(page.getByRole("region", { name })).toBeVisible();
  }

  const appearance = page.getByRole("region", { name: "Apariencia" });
  await appearance.getByRole("combobox", { name: "Tema" }).selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("textbox", { name: /Nombre visible/ }).fill("Nombre de prueba");
  await page.getByRole("button", { name: "Guardar" }).click();
  await expect(page.getByText("Cambios guardados.")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("textbox", { name: /Nombre visible/ })).toHaveValue(
    "Nombre de prueba",
  );

  await page
    .getByRole("region", { name: "Cuenta" })
    .getByRole("link", { name: "Volver a mi perfil" })
    .click();
  await expect(page).toHaveURL(`${baseURL}/u/${user.username}`);
});

test("ajustes: sin sesión vuelve a /settings tras iniciar sesión", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings/);
});
