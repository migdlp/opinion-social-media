import { expect, test } from "@playwright/test";
import { createUser, signIn } from "./support/supabase";

test("menú de cuenta: fuera, Escape y Tab en ambos temas y anchos", async ({
  page,
  baseURL,
}, info) => {
  const user = await createUser("accountmenu");
  await signIn(page.context(), user, baseURL!);
  for (const width of [320, 1280])
    for (const theme of ["light", "dark"] as const) {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await page.goto("/polls/00000000-0000-4000-8000-000000000000");
      const trigger = page.getByLabel("Menú de cuenta");
      const menu = page.getByRole("navigation", { name: "Cuenta" });
      await trigger.click();
      await expect(menu).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Menú de cuenta", expanded: true }),
      ).toBeVisible();
      await page.screenshot({ path: info.outputPath(`visual-menu-cuenta-${width}-${theme}.png`) });
      const brand = page
        .getByRole("navigation", { name: "Principal" })
        .getByRole("link", { name: "Opinión", exact: true });
      if (info.project.name === "movil") await brand.tap();
      else await brand.click();
      await expect(page).toHaveURL(`${baseURL}/`);
      await expect(menu).toBeHidden();
      await trigger.click();
      await menu.getByRole("link", { name: "Mi perfil" }).focus();
      await page.keyboard.press("Escape");
      await expect(menu).toBeHidden();
      await expect(trigger).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(menu).toBeVisible();
      for (let i = 0; i < 5; i++) await page.keyboard.press("Tab");
      await expect(menu).toBeHidden();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
    }
});

test("navegar dentro y cerrar sesión conserva las acciones y cierra el menú", async ({
  page,
  baseURL,
}) => {
  const user = await createUser("accountactions");
  await signIn(page.context(), user, baseURL!);
  await page.goto("/");
  const trigger = page.getByLabel("Menú de cuenta");
  const menu = page.getByRole("navigation", { name: "Cuenta" });
  for (const [label, path] of [
    ["Mi perfil", `/u/${user.username}`],
    ["Ajustes", "/settings"],
    ["Solicitudes", "/solicitudes"],
  ]) {
    await trigger.click();
    await menu.getByRole("link", { name: label, exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}${path}`);
    await expect(menu).toBeHidden();
  }
  await trigger.click();
  await menu.getByRole("button", { name: "Cerrar sesión" }).click();
  await expect(page).toHaveURL(`${baseURL}/`);
  await expect(page.getByRole("link", { name: "Iniciar sesión", exact: true })).toBeVisible();
});
