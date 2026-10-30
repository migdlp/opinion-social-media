// PROFILE-002: editar y mostrar la descripción del perfil desde Ajustes, con dos cuentas contra
// Supabase local, en escritorio y móvil: añadir, modificar, quitar, límite, texto plano, cuenta
// privada y ajuste de texto largo.
import { expect, test, type Page } from "@playwright/test";
import { addFollow, createUser, signIn } from "./support/supabase";

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const field = (page: Page) => page.getByRole("textbox", { name: "Descripción" });
const save = (page: Page) => page.getByRole("button", { name: "Guardar descripción" });

async function writeBio(page: Page, text: string) {
  await ready(page, "/settings");
  await field(page).fill(text);
  await save(page).click();
  await expect(page.getByText("Descripción guardada.")).toBeVisible();
}

test("añadir, modificar y quitar la descripción se refleja en el perfil tras recargar", async ({
  page,
  baseURL,
}) => {
  const me = await createUser("bio");
  await signIn(page.context(), me, baseURL!);

  await writeBio(page, "Primera versión");
  await ready(page, `/u/${me.username}`);
  await expect(page.getByText("Primera versión")).toBeVisible();

  await writeBio(page, "Segunda versión");
  await page.reload();
  await expect(page.getByText("Segunda versión")).toBeVisible();
  await expect(page.getByText("Primera versión")).toHaveCount(0);

  await ready(page, "/settings");
  await field(page).fill("");
  await save(page).click();
  await expect(page.getByText("Descripción guardada.")).toBeVisible();
  await ready(page, `/u/${me.username}`);
  await expect(page.getByText("Segunda versión")).toHaveCount(0);
});

test("pasado el límite se avisa junto al campo, se conserva el texto y no se guarda", async ({
  page,
  baseURL,
}) => {
  const me = await createUser("bio");
  await signIn(page.context(), me, baseURL!);
  await ready(page, "/settings");
  const long = "a".repeat(281);
  await field(page).fill(long);
  await expect(page.getByText("281 / 280")).toBeVisible();
  await save(page).click();
  await expect(page.getByRole("alert").filter({ hasText: /280 caracteres/i })).toBeVisible();
  await expect(field(page)).toHaveValue(long);

  await ready(page, `/u/${me.username}`);
  await expect(page.getByText(long)).toHaveCount(0);
});

test("el texto es plano: HTML y enlaces no se interpretan y un texto largo no rompe el diseño", async ({
  page,
  baseURL,
}) => {
  const me = await createUser("bio");
  await signIn(page.context(), me, baseURL!);
  const text = `<b>negrita</b> https://ejemplo.test/${"x".repeat(200)}`;
  await writeBio(page, text);
  await ready(page, `/u/${me.username}`);
  const bio = page.locator("[data-bio]");
  await expect(bio).toHaveText(text);
  expect(await bio.locator("b, a").count()).toBe(0);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("otra persona ve la descripción de una cuenta pública", async ({ page, baseURL, browser }) => {
  const owner = await createUser("bio");
  const viewer = await createUser("lector");
  await signIn(page.context(), owner, baseURL!);
  await writeBio(page, "Hola, soy pública");

  const context = await browser.newContext();
  try {
    await signIn(context, viewer, baseURL!);
    const other = await context.newPage();
    await ready(other, `/u/${owner.username}`);
    await expect(other.getByText("Hola, soy pública")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("en una cuenta privada, solo la ve un seguidor aceptado", async ({
  page,
  baseURL,
  browser,
}) => {
  const owner = await createUser("bio", { isPrivate: true });
  const stranger = await createUser("extrano");
  const follower = await createUser("seguidor");
  await addFollow(follower, owner, "accepted");
  await signIn(page.context(), owner, baseURL!);
  await ready(page, "/settings");
  await expect(page.getByText(/solo tus seguidores aceptados/i)).toBeVisible();
  await writeBio(page, "Solo para seguidores");

  const seen = async (user: typeof stranger) => {
    const context = await browser.newContext();
    try {
      await signIn(context, user, baseURL!);
      const other = await context.newPage();
      await ready(other, `/u/${owner.username}`);
      return other.getByText("Solo para seguidores").count();
    } finally {
      await context.close();
    }
  };
  expect(await seen(follower)).toBe(1);
  expect(await seen(stranger)).toBe(0);
});
