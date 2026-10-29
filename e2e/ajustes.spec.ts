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
    await expect(page.getByRole("region", { name, exact: true })).toBeVisible();
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
    .getByRole("region", { name: "Cuenta", exact: true })
    .getByRole("link", { name: "Volver a mi perfil" })
    .click();
  await expect(page).toHaveURL(`${baseURL}/u/${user.username}`);
});

test("ajustes: sin sesión vuelve a /settings tras iniciar sesión", async ({ page }) => {
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings/);
});

test("ajustes: la audiencia del historial persiste y es independiente de Cuenta privada", async ({
  page,
  baseURL,
}) => {
  const user = await createUser("audiencia");
  await signIn(page.context(), user, baseURL!);
  await page.goto("/settings");

  const privacy = page.getByRole("region", { name: "Privacidad", exact: true });
  const group = privacy.getByRole("radiogroup", {
    name: "Quién puede ver las encuestas que votas",
  });
  await expect(group.getByRole("radio", { name: "Solo yo" })).toBeChecked();

  await group.getByRole("radio", { name: "Seguidores aceptados" }).check();
  await expect(privacy.getByText("Audiencia guardada.")).toBeVisible();

  await page.reload();
  await expect(group.getByRole("radio", { name: "Seguidores aceptados" })).toBeChecked();

  await privacy.getByRole("switch", { name: "Cuenta privada" }).click();
  await privacy.getByRole("button", { name: "Hacer privada" }).click();
  await expect(privacy.getByRole("switch", { name: "Cuenta privada" })).toBeChecked();
  await page.reload();
  await expect(privacy.getByRole("switch", { name: "Cuenta privada" })).toBeChecked();
  await expect(group.getByRole("radio", { name: "Seguidores aceptados" })).toBeChecked();
});
