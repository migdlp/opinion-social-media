// MVP-046: concurrencia, cortes de red y regresión de navegación/accesibilidad en móvil y
// escritorio (proyectos de playwright.config.ts). La base local es la fuente de verdad: se
// comprueba que quede un único voto o una única encuesta, no sólo lo que muestra la UI.
import { expect, test, type Page, type Route } from "@playwright/test";
import {
  admin,
  createPoll,
  createUser,
  hidePoll,
  signIn,
  votesOf,
  type TestUser,
} from "./support/supabase";

const NETWORK_ERROR = "No hay conexión. Comprueba tu red y vuelve a intentarlo.";

const stamp = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

// Intercepta las acciones de servidor (POST con cabecera Next-Action) de la página. La
// primera llega al servidor y se completa, pero su respuesta se pierde, como un timeout
// justo después de escribir. Devuelve los ids de acción en el orden en que se enviaron.
async function cutFirstActionResponse(page: Page, path: string) {
  const actions: string[] = [];
  let cut = true;
  await page.route(`**${path}`, async (route: Route) => {
    const action = route.request().headers()["next-action"];
    if (route.request().method() !== "POST" || !action) return route.continue();
    actions.push(action);
    if (!cut) return route.continue();
    cut = false;
    await route.fetch();
    return route.abort("timedout");
  });
  return actions;
}

async function pollSetup(prefix: string, options = ["Norte", "Sur"]) {
  const author = await createUser("autor");
  const voter = await createUser("votante");
  const question = `¿${prefix} ${stamp()}?`;
  const pollId = await createPoll(author, question, options);
  return { author, voter, question, pollId };
}

async function optionTextOf(optionId: string) {
  const { data, error } = await admin.from("poll_options").select("text").eq("id", optionId);
  if (error) throw error;
  return data[0].text as string;
}

test.describe("criterio 1: corte de red justo después de escribir", () => {
  test("voto: al reintentar consulta el voto propio y no lo reenvía", async ({ page, baseURL }) => {
    const { voter, pollId } = await pollSetup("E2E corte voto");
    await signIn(page.context(), voter, baseURL!);
    await ready(page, `/polls/${pollId}`);
    const actions = await cutFirstActionResponse(page, `/polls/${pollId}`);

    await page.getByRole("radio", { name: "Sur" }).check();
    await page.getByRole("button", { name: "Votar y descubrir" }).click();
    await expect(page.getByRole("alert").filter({ hasText: NETWORK_ERROR })).toBeVisible();
    expect(await votesOf(pollId)).toHaveLength(1); // el voto sí entró

    await page.getByRole("button", { name: "Votar y descubrir" }).click();
    await expect(page.getByText("Tu voto")).toBeVisible();
    await expect(page.locator("li", { hasText: "Tu voto" })).toContainText("Sur");
    // Segunda acción: la consulta del voto propio, no otra emisión del voto.
    expect(actions).toHaveLength(2);
    expect(actions[1]).not.toBe(actions[0]);
    expect(await votesOf(pollId)).toHaveLength(1);
  });

  test("publicación: al reintentar recupera la encuesta creada y no la duplica", async ({
    page,
    baseURL,
  }) => {
    const author = await createUser("autor");
    const question = `¿E2E corte publicar ${stamp()}?`;
    await signIn(page.context(), author, baseURL!);
    await ready(page, "/create");
    const actions = await cutFirstActionResponse(page, "/create");

    await page.getByLabel("Pregunta").fill(question);
    await page.getByLabel("Opción 1").fill("Uno");
    await page.getByLabel("Opción 2").fill("Dos");
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByRole("alert").filter({ hasText: NETWORK_ERROR })).toBeVisible();

    await page.getByRole("button", { name: "Publicar" }).click();
    await page.waitForURL(/\/polls\/[0-9a-f-]{36}$/);
    const { data } = await admin.from("polls").select("id").eq("question", question);
    expect(data).toHaveLength(1);
    expect(page.url()).toContain(data![0].id);
    expect(actions).toHaveLength(2);
    expect(actions[1]).not.toBe(actions[0]);
  });
});

test.describe("criterio 2: envíos duplicados, recarga inmediata y pestañas simultáneas", () => {
  test("doble envío del formulario de voto: un único voto", async ({ page, baseURL }) => {
    const { voter, pollId } = await pollSetup("E2E doble envío");
    await signIn(page.context(), voter, baseURL!);
    await ready(page, `/polls/${pollId}`);
    await page.getByRole("radio", { name: "Norte" }).check();
    await expect(page.getByRole("button", { name: "Votar y descubrir" })).toBeEnabled();
    // Tres envíos seguidos sin esperar a la respuesta.
    await page.locator("main form").evaluate((form: HTMLFormElement) => {
      form.requestSubmit();
      form.requestSubmit();
      form.requestSubmit();
    });
    await expect(page.getByText("1 voto en total")).toBeVisible();
    expect(await votesOf(pollId)).toHaveLength(1);
  });

  test("dos pestañas votan a la vez opciones distintas: un voto y ambas coinciden", async ({
    page,
    baseURL,
  }) => {
    const { voter, pollId } = await pollSetup("E2E dos pestañas");
    await signIn(page.context(), voter, baseURL!);
    const other = await page.context().newPage();
    await Promise.all([ready(page, `/polls/${pollId}`), ready(other, `/polls/${pollId}`)]);
    await page.getByRole("radio", { name: "Norte" }).check();
    await other.getByRole("radio", { name: "Sur" }).check();

    await Promise.all([
      page.getByRole("button", { name: "Votar y descubrir" }).click(),
      other.getByRole("button", { name: "Votar y descubrir" }).click(),
    ]);

    await expect(page.getByText("1 voto en total")).toBeVisible();
    await expect(other.getByText("1 voto en total")).toBeVisible();
    const votes = await votesOf(pollId);
    expect(votes).toHaveLength(1);
    const stored = await optionTextOf(votes[0].option_id);
    for (const tab of [page, other]) {
      await expect(tab.locator("li", { hasText: "Tu voto" })).toContainText(stored);
    }
  });

  test("recarga inmediata tras votar: la UI refleja lo que hay en la base", async ({
    page,
    baseURL,
  }) => {
    const { voter, pollId } = await pollSetup("E2E recarga inmediata");
    await signIn(page.context(), voter, baseURL!);
    await ready(page, `/polls/${pollId}`);
    await page.getByRole("radio", { name: "Norte" }).check();
    await page.getByRole("button", { name: "Votar y descubrir" }).click();
    await page.reload();
    await page.waitForLoadState("networkidle");
    // Si el voto llegó a entrar tras la recarga, una lectura nueva debe mostrarlo.
    await expect.poll(async () => (await votesOf(pollId)).length).toBeLessThanOrEqual(1);
    await ready(page, `/polls/${pollId}`);

    if ((await votesOf(pollId)).length === 1) {
      await expect(page.getByText("Tu voto")).toBeVisible();
      await expect(page.getByRole("radio")).toHaveCount(0);
    } else {
      await page.getByRole("radio", { name: "Sur" }).check();
      await page.getByRole("button", { name: "Votar y descubrir" }).click();
      await expect(page.getByText("Tu voto")).toBeVisible();
    }
    expect(await votesOf(pollId)).toHaveLength(1);
  });
});

test.describe("criterio 3: rutas y formularios en móvil y escritorio", () => {
  let author: TestUser;
  let pollId: string;
  let hiddenId: string;

  test.beforeAll(async () => {
    author = await createUser("autor");
    pollId = await createPoll(author, `¿E2E recorrido ${stamp()}?`, ["Café", "Té"]);
    hiddenId = await createPoll(author, `¿E2E oculta ${stamp()}?`, ["Secreta A", "Secreta B"]);
    await hidePoll(hiddenId);
  });

  // Regresiones básicas: idioma, título, sin desbordamiento horizontal, controles con
  // nombre accesible y foco por teclado en un elemento visible.
  async function basics(page: Page) {
    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page.locator("h1")).not.toHaveCount(0);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const tree = await page.locator("body").ariaSnapshot();
    expect(tree).not.toMatch(/^\s*- (button|link|textbox|radio|checkbox|combobox)\s*(\[.*\])?:?$/m);
    await page.keyboard.press("Tab");
    const focused = page.locator(":focus");
    await expect(focused).toBeVisible();
  }

  for (const route of ["/", "/login", "/create"]) {
    test(`visitante en ${route}`, async ({ page }) => {
      await ready(page, route);
      await basics(page);
    });
  }

  test("detalle de encuesta como visitante y como usuario", async ({ page, baseURL }) => {
    await ready(page, `/polls/${pollId}`);
    await basics(page);
    await signIn(page.context(), await createUser("lector"), baseURL!);
    await ready(page, `/polls/${pollId}`);
    await basics(page);
    // Teclado: elegir con flechas desde la primera opción y votar con Enter.
    await page.getByRole("radio", { name: "Café" }).focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowDown");
    await expect(page.getByRole("radio", { name: "Té" })).toBeChecked();
    await page.getByRole("button", { name: "Votar y descubrir" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("li", { hasText: "Tu voto" })).toContainText("Té");
  });

  test("encuestas ocultas o inexistentes: «No disponible» sin contenido", async ({ page }) => {
    for (const id of [hiddenId, "00000000-0000-4000-8000-000000000000", "no-es-un-id"]) {
      await ready(page, `/polls/${id}`);
      await expect(page.getByRole("heading", { name: "No disponible" })).toBeVisible();
      await expect(page.locator("main")).not.toContainText("Secreta");
      await expect(page.getByRole("radio")).toHaveCount(0);
      await basics(page);
    }
    await ready(page, "/");
    await expect(page.locator("main")).not.toContainText("Secreta");
  });

  test("formulario de creación: errores accesibles y petición de sesión al visitante", async ({
    page,
  }) => {
    await ready(page, "/create");
    await page.getByRole("button", { name: "Publicar" }).click();
    const question = page.getByLabel("Pregunta");
    await expect(question).toHaveAttribute("aria-invalid", "true");
    await expect(question).toHaveAccessibleDescription(/.+/);
    await question.fill("¿Es esta una pregunta válida?");
    await page.getByLabel("Opción 1").fill("Sí");
    await page.getByLabel("Opción 2").fill("No");
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Inicia sesión para publicar")).toBeVisible();
    await expect(page.getByRole("link", { name: "Iniciar sesión" }).last()).toHaveAttribute(
      "href",
      /\/login\?next=%2Fcreate|\/login\?next=\/create/,
    );
  });
});
