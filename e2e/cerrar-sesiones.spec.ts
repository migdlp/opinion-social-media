// AUTH-002: cerrar la sesión en todos los dispositivos, contra Supabase local, en escritorio y móvil.
// Dos contextos de navegador con la misma cuenta; la cuenta es desechable.
import { expect, test } from "@playwright/test";
import { createUser, newSessionRefreshToken, refreshWith, signIn } from "./support/supabase";

test("cerrar todas: la primera sesión se cierra y la otra ya no puede renovarse", async ({
  page,
  browser,
  baseURL,
}) => {
  const me = await createUser("sesiones");
  await signIn(page.context(), me, baseURL!);
  // Segundo dispositivo: otro contexto con su propia sesión y su propio refresh token.
  const other = await browser.newContext();
  await signIn(other, me, baseURL!);
  let secondDevice = await newSessionRefreshToken(me);

  await page.goto("/settings#sesiones");
  await page.waitForLoadState("networkidle");
  const section = page.getByRole("region", { name: "Sesiones" });
  await expect(section).toContainText(
    "Cierra tu sesión aquí y en cualquier otro dispositivo donde hayas entrado.",
  );

  await section.getByRole("button", { name: "Cerrar sesión en todos los dispositivos" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Cerrar sesión en todos los dispositivos" });
  await expect(dialog).toContainText(
    "Se cerrará tu sesión en todos tus dispositivos. En los demás puede tardar hasta una hora en hacerse efectivo.",
  );

  // A 320 px el diálogo cabe en pantalla.
  await page.setViewportSize({ width: 320, height: 640 });
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);

  // «Cancelar» (y Escape) no hacen nada: la otra sesión todavía puede renovarse.
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();
  const stillValid = await refreshWith(secondDevice);
  expect(stillValid.ok).toBe(true);
  secondDevice = stillValid.ok ? stillValid.refreshToken : secondDevice;
  await section.getByRole("button", { name: "Cerrar sesión en todos los dispositivos" }).click();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await page.goto("/settings");
  await expect(page).toHaveURL(`${baseURL}/settings`);

  // Confirmar: sesión cerrada aquí, aviso en el feed y vuelta a /login al pedir Ajustes.
  await section.getByRole("button", { name: "Cerrar sesión en todos los dispositivos" }).click();
  await dialog.getByRole("button", { name: "Cerrar todas" }).click();
  await expect(page).toHaveURL(`${baseURL}/`);
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Has cerrado la sesión en todos tus dispositivos." }),
  ).toBeVisible();
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings/);

  // El otro dispositivo ya no puede renovar su sesión: sus refresh tokens están revocados.
  const renewed = await refreshWith(secondDevice);
  expect(renewed.ok).toBe(false);
  await other.close();
});
