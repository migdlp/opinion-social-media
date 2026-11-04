// SOCIAL-002: bloquear desde el perfil, gestionar la lista en Ajustes y desbloquear, con dos
// cuentas contra Supabase local, en escritorio y móvil.
import { expect, test, type Page } from "@playwright/test";
import { addFollow, admin, createUser, signIn } from "./support/supabase";

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const blockedSection = (page: Page) => page.getByRole("region", { name: "Cuentas bloqueadas" });

test("bloquear: confirma, cancela sin efecto, rompe el seguimiento y lista en Ajustes", async ({
  page,
  baseURL,
}) => {
  const me = await createUser("bloquea");
  const other = await createUser("bloqueado");
  await addFollow(me, other, "accepted");
  await addFollow(other, me, "accepted");
  await signIn(page.context(), me, baseURL!);

  await ready(page, `/u/${other.username}`);
  await page.getByRole("button", { name: "Bloquear", exact: true }).click();
  const confirm = page.getByRole("group", { name: new RegExp(`Bloquear a @${other.username}`) });
  await expect(confirm).toContainText(/dejaréis de seguiros/i);
  // Cancelar no tiene efecto.
  await confirm.getByRole("button", { name: "Cancelar" }).click();
  const before = await admin
    .from("user_blocks")
    .select("*", { count: "exact", head: true })
    .eq("blocker_id", me.id);
  expect(before.count).toBe(0);

  await page.getByRole("button", { name: "Bloquear", exact: true }).click();
  await page.getByRole("button", { name: "Sí, bloquear" }).click();
  await page.waitForURL(/\/settings#bloqueados$/);
  await expect(blockedSection(page).getByText(`@${other.username}`)).toBeVisible();

  const follows = await admin
    .from("follows")
    .select("*", { count: "exact", head: true })
    .or(`follower_id.eq.${me.id},follower_id.eq.${other.id}`);
  expect(follows.count).toBe(0);

  // Para quien bloqueó, el perfil ya no existe.
  await ready(page, `/u/${other.username}`);
  await expect(
    page.getByText("La página que buscas no existe o no está disponible."),
  ).toBeVisible();
});

test("la cuenta bloqueada no ve nada que revele el bloqueo y tampoco puede abrir el perfil", async ({
  page,
  baseURL,
}) => {
  const me = await createUser("bloquea");
  const other = await createUser("bloqueado");
  const { error } = await admin
    .from("user_blocks")
    .insert({ blocker_id: me.id, blocked_id: other.id });
  if (error) throw error;

  await signIn(page.context(), other, baseURL!);
  await ready(page, `/u/${me.username}`);
  await expect(
    page.getByText("La página que buscas no existe o no está disponible."),
  ).toBeVisible();
  await ready(page, "/settings");
  await expect(blockedSection(page).getByText(`@${me.username}`)).toHaveCount(0);
  await expect(blockedSection(page).getByText("No has bloqueado a nadie.")).toBeVisible();
});

test("desbloquear en Ajustes: confirma, quita la fila, no restaura el seguimiento y reabre el perfil", async ({
  page,
  baseURL,
}) => {
  const me = await createUser("bloquea");
  const other = await createUser("bloqueado");
  const { error } = await admin
    .from("user_blocks")
    .insert({ blocker_id: me.id, blocked_id: other.id });
  if (error) throw error;

  await signIn(page.context(), me, baseURL!);
  await ready(page, "/settings");
  const row = blockedSection(page)
    .getByRole("listitem")
    .filter({ hasText: `@${other.username}` });
  await row.getByRole("button", { name: "Desbloquear" }).click();
  await expect(row.getByText(/no restaura los seguimientos/i)).toBeVisible();
  await row.getByRole("button", { name: "Confirmar" }).click();
  await expect(row).toHaveCount(0);
  await expect(blockedSection(page).getByText("No has bloqueado a nadie.")).toBeVisible();

  await ready(page, `/u/${other.username}`);
  await expect(page.getByRole("button", { name: "Seguir", exact: true })).toBeVisible();
  const follows = await admin
    .from("follows")
    .select("*", { count: "exact", head: true })
    .or(`follower_id.eq.${me.id},follower_id.eq.${other.id}`);
  expect(follows.count).toBe(0);
});

test("en el perfil propio no hay botón Bloquear", async ({ page, baseURL }) => {
  const me = await createUser("bloquea");
  await signIn(page.context(), me, baseURL!);
  await ready(page, `/u/${me.username}`);
  await expect(page.getByRole("button", { name: "Bloquear", exact: true })).toHaveCount(0);
});
