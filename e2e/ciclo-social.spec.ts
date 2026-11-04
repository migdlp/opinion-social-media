// V2-025: ciclo social completo en la app compilada contra Supabase local, en escritorio y móvil.
// Usuario nuevo → onboarding → crea una encuesta → una cuenta privada → solicita seguirla y no ve
// sus encuestas → la privada acepta → ahora las ve, vota y la encuentra en «Votadas».
import { expect, test, type Page } from "@playwright/test";
import { createPoll, createUser, signIn } from "./support/supabase";

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const stamp = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

test("ciclo social: onboarding, crear, solicitar seguir una cuenta privada, aceptar, votar y ver «Votadas»", async ({
  page,
  browser,
  baseURL,
}) => {
  const id = stamp();
  const handle = `ana${Date.now() % 100_000_000}`;
  const ownQuestion = `¿E2E propia ${id}?`;
  const privateQuestion = `¿E2E privada ${id}?`;

  const newcomer = await createUser("nuevo", { profile: false });
  const owner = await createUser("privado", { isPrivate: true });
  const privatePoll = await createPoll(owner, privateQuestion, ["Sí", "No"]);

  // 1. Usuario nuevo: sin @usuario, el onboarding se lo pide y le devuelve a crear.
  await signIn(page.context(), newcomer, baseURL!);
  await ready(page, "/onboarding?next=%2Fcreate");
  await page.getByLabel("Usuario").fill(handle);
  await page.getByRole("button", { name: "Guardar" }).click();
  await page.waitForURL("**/create");

  // 2. Crea una encuesta con su nuevo usuario.
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Pregunta").fill(ownQuestion);
  await page.getByLabel("Opción 1").fill("Rojo");
  await page.getByLabel("Opción 2").fill("Azul");
  await page.getByRole("button", { name: "Publicar" }).click();
  await page.waitForURL(/\/polls\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: ownQuestion })).toBeVisible();

  // 3. Cuenta privada sin acceso: sólo la cabecera y el aviso; su encuesta no existe para él.
  await ready(page, `/u/${owner.username}`);
  await expect(
    page.getByText("Esta cuenta es privada. Síguela para ver sus encuestas y votos."),
  ).toBeVisible();
  await expect(page.locator("main")).not.toContainText(privateQuestion);
  await ready(page, `/polls/${privatePoll}`);
  await expect(page.getByRole("heading", { name: "No disponible" })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(privateQuestion);
  await expect(page.getByRole("radio")).toHaveCount(0);
  await ready(page, "/");
  await expect(page.locator("article", { hasText: privateQuestion })).toHaveCount(0);

  // 4. Pide seguirla: queda «Solicitado» y sigue sin ver nada.
  await ready(page, `/u/${owner.username}`);
  await page.getByRole("button", { name: "Seguir", exact: true }).click();
  await expect(page.getByRole("button", { name: "Solicitado", exact: true })).toBeVisible();
  await ready(page, `/u/${owner.username}`);
  await expect(page.getByRole("button", { name: "Solicitado", exact: true })).toBeVisible();
  await expect(page.locator("main")).not.toContainText(privateQuestion);

  // 5. La cuenta privada ve la solicitud y la acepta.
  const ownerContext = await browser.newContext();
  try {
    await signIn(ownerContext, owner, baseURL!);
    const ownerPage = await ownerContext.newPage();
    await ready(ownerPage, `/u/${owner.username}`);
    await expect(
      ownerPage.getByRole("link", { name: /Solicitudes de seguimiento: 1 pendiente/ }),
    ).toBeVisible();
    await ready(ownerPage, "/solicitudes");
    await expect(ownerPage.getByText(`@${handle}`)).toBeVisible();
    await ownerPage.getByRole("button", { name: "Aceptar", exact: true }).click();
    await expect(ownerPage.getByText("No tienes solicitudes pendientes.")).toBeVisible();
  } finally {
    await ownerContext.close();
  }

  // 6. Ahora sí ve sus encuestas, abre una y vota.
  await ready(page, `/u/${owner.username}`);
  await expect(page.getByRole("button", { name: "Siguiendo", exact: true })).toBeVisible();
  const card = page.locator("article", { hasText: privateQuestion });
  await expect(card).toBeVisible();
  await card.getByRole("link", { name: privateQuestion }).click();
  await expect(page).toHaveURL(`/polls/${privatePoll}`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("radio", { name: "No", exact: true }).check();
  await page.getByRole("button", { name: "Votar y descubrir" }).click();
  await expect(page.getByText("Tu voto")).toBeVisible();

  // 7. En su propio perfil, la encuesta votada aparece en «Votadas» con la opción elegida.
  await ready(page, `/u/${handle}?tab=votadas`);
  await expect(page.getByRole("link", { name: privateQuestion })).toBeVisible();
  await expect(page.getByText("Votó: No")).toBeVisible();
  // Y la que creó aparece en «Creadas».
  await ready(page, `/u/${handle}`);
  await expect(page.locator("article", { hasText: ownQuestion })).toBeVisible();
});
