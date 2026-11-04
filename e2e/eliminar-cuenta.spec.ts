// ACCOUNT-002: eliminar la cuenta desde Ajustes, contra Supabase local, en escritorio y móvil.
// La cuenta es desechable: se crea para la prueba y desaparece en ella.
import { expect, test } from "@playwright/test";
import { admin, createUser, signIn } from "./support/supabase";

test("eliminar cuenta: confirmación, borrado, cierre de sesión y aviso", async ({
  page,
  baseURL,
}) => {
  const me = await createUser("elimina");
  const created = await admin
    .from("polls")
    .insert({ user_id: me.id, question: "¿Esta encuesta se borra con mi cuenta?" })
    .select("id")
    .single();
  if (created.error) throw created.error;

  await signIn(page.context(), me, baseURL!);
  await page.goto("/settings#eliminar");
  await page.waitForLoadState("networkidle");

  const section = page.getByRole("region", { name: "Eliminar cuenta" });
  await expect(section).toContainText("No se puede deshacer.");
  await expect(
    section.getByRole("link", { name: "Antes, descarga una copia de tus datos" }),
  ).toHaveAttribute("href", "#descargar");

  await section.getByRole("button", { name: "Eliminar mi cuenta" }).click();
  const dialog = page.getByRole("alertdialog", { name: "Eliminar tu cuenta para siempre" });
  const field = dialog.getByLabel(`Escribe tu usuario (${me.username}) para confirmar`);
  await expect(field).toBeFocused();
  const confirm = dialog.getByRole("button", { name: "Eliminar definitivamente" });
  await expect(confirm).toBeDisabled();

  // A 320 px el diálogo cabe en pantalla.
  await page.setViewportSize({ width: 320, height: 640 });
  const box = (await dialog.boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width).toBeLessThanOrEqual(320);

  // Un texto distinto no activa el botón; Escape cierra sin borrar nada.
  await field.fill("otra-cosa");
  await expect(confirm).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  expect((await admin.auth.admin.getUserById(me.id)).data.user).not.toBeNull();

  await section.getByRole("button", { name: "Eliminar mi cuenta" }).click();
  await field.fill(me.username!.toUpperCase());
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect(page).toHaveURL(`${baseURL}/`);
  await expect(
    page.getByRole("status").filter({ hasText: "Tu cuenta se ha eliminado." }),
  ).toBeVisible();

  // La cuenta y todo lo suyo han desaparecido y la sesión está cerrada.
  const gone = await admin.auth.admin.getUserById(me.id);
  expect(gone.data.user).toBeNull();
  const polls = await admin.from("polls").select("id").eq("id", created.data.id);
  expect(polls.data).toEqual([]);
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login\?next=%2Fsettings/);
});
