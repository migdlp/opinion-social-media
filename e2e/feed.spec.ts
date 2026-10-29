// V2-036: recorrido completo del feed (D-022 a D-025) en la app compilada contra Supabase local, en
// escritorio y móvil: entrada por defecto, Recientes/Siguiendo, categoría, scroll infinito y botón,
// voto desde la tarjeta, retención de 24 h tras el cierre, peticiones lentas, error de red, movimiento
// reducido, teclado y 320 px.
import { expect, test, type Page, type Request } from "@playwright/test";
import {
  addFollow,
  closePoll,
  createUser,
  seedPoll,
  signIn,
  vote,
  votesOf,
} from "./support/supabase";

const stamp = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const tabs = (page: Page) => page.getByRole("navigation", { name: "Lista de encuestas" });
const categories = (page: Page) => page.getByRole("navigation", { name: "Categorías" });
const cards = (page: Page) => page.locator("[role=feed] article");
const isServerAction = (request: Request) =>
  request.method() === "POST" && request.headers()["next-action"] !== undefined;

// 24 encuestas de «ciencia» con un prefijo único: la primera página (20) y una segunda.
const BULK = 24;
let run = "";
let bulk: string[] = [];

test.beforeAll(async () => {
  run = stamp();
  const author = await createUser("masa");
  bulk = [];
  for (let i = 0; i < BULK; i++) {
    const question = `¿E2E feed ${run} número ${i}?`;
    bulk.push(question);
    await seedPoll(author, question, { category: "ciencia" });
  }
});

async function loadAll(page: Page) {
  // El botón siempre está disponible: se pulsa hasta llegar al final de la lista. No se usa
  // «networkidle» (no se reevalúa tras la carga inicial): se espera a que lleguen más tarjetas.
  const end = page.getByText("No hay más encuestas");
  for (let guard = 0; guard < 10 && !(await end.isVisible()); guard++) {
    const before = await cards(page).count();
    await page.getByRole("button", { name: "Cargar más" }).click();
    await expect
      .poll(async () => (await cards(page).count()) > before || (await end.isVisible()), {
        timeout: 15_000,
      })
      .toBe(true);
  }
  await expect(end).toBeVisible();
}

test("visitante: entra en Recientes, Siguiendo pide login y el filtro de categoría va en la URL", async ({
  page,
}) => {
  await ready(page, "/");
  await expect(tabs(page).getByRole("link", { name: "Recientes" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(tabs(page).getByRole("link", { name: "Siguiendo" })).toHaveAttribute(
    "href",
    /\/login\?next=/,
  );

  await ready(page, "/?tab=siguiendo");
  // La cabecera también tiene un «Iniciar sesión»: se acota al contenido de la página.
  await expect(
    page.locator("#contenido").getByRole("link", { name: "Iniciar sesión" }),
  ).toBeVisible();
  await expect(cards(page)).toHaveCount(0);

  await ready(page, "/");
  await categories(page).getByRole("link", { name: "Ciencia" }).click();
  await expect(page).toHaveURL(/tab=recientes&categoria=ciencia/);
  await page.waitForLoadState("networkidle");
  await expect(categories(page).getByRole("link", { name: "Ciencia" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(cards(page)).toHaveCount(20);

  // La selección sobrevive a recargar la página.
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(categories(page).getByRole("link", { name: "Ciencia" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(cards(page)).toHaveCount(20);
});

test("más de una página: el scroll carga la siguiente y no hay tarjetas repetidas", async ({
  page,
}) => {
  await ready(page, "/?tab=recientes&categoria=ciencia");
  await expect(cards(page)).toHaveCount(20);

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect.poll(async () => cards(page).count(), { timeout: 15_000 }).toBeGreaterThan(20);

  await loadAll(page);
  for (const question of [bulk[0], bulk[BULK - 1]]) {
    await expect(page.locator("[role=feed] article", { hasText: question })).toHaveCount(1);
  }
  const headings = await cards(page).getByRole("heading", { level: 2 }).allTextContents();
  expect(new Set(headings).size).toBe(headings.length);
});

test("sin IntersectionObserver el botón «Cargar más» recorre todas las páginas", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // @ts-expect-error: simula un navegador sin IntersectionObserver
    delete window.IntersectionObserver;
  });
  await ready(page, "/?tab=recientes&categoria=ciencia");
  await expect(cards(page)).toHaveCount(20);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await expect(cards(page)).toHaveCount(20); // sin observador no hay carga automática

  await loadAll(page);
  for (const question of [bulk[0], bulk[BULK - 1]]) {
    await expect(page.locator("[role=feed] article", { hasText: question })).toHaveCount(1);
  }
});

test("usuario sin seguimientos o con solicitudes pendientes entra en Recientes; con uno aceptado, en Siguiendo", async ({
  page,
  baseURL,
}) => {
  const viewer = await createUser("lector");
  const followed = await createUser("seguido");
  const other = await createUser("otro");
  const tag = stamp();
  const followedQuestion = `¿E2E seguido ${tag}?`;
  const otherQuestion = `¿E2E otro ${tag}?`;
  await seedPoll(followed, followedQuestion, { category: "deportes" });
  await seedPoll(other, otherQuestion, { category: "deportes" });

  await signIn(page.context(), viewer, baseURL!);
  await ready(page, "/");
  await expect(tabs(page).getByRole("link", { name: "Recientes" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  // Una solicitud pendiente no cuenta como seguimiento.
  await addFollow(viewer, followed, "pending");
  await ready(page, "/");
  await expect(tabs(page).getByRole("link", { name: "Recientes" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  // Aceptada: la entrada es Siguiendo, sólo con las encuestas de quien sigue.
  await addFollow(viewer, followed, "accepted");
  await ready(page, "/");
  await expect(tabs(page).getByRole("link", { name: "Siguiendo" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.locator("article", { hasText: followedQuestion })).toBeVisible();
  await expect(page.locator("article", { hasText: otherQuestion })).toHaveCount(0);

  // El filtro de categoría conserva la pestaña.
  await categories(page).getByRole("link", { name: "Deportes" }).click();
  await expect(page).toHaveURL(/tab=siguiendo&categoria=deportes/);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("article", { hasText: followedQuestion })).toBeVisible();

  // Cambiar a Recientes muestra también a la otra cuenta y conserva la categoría.
  await tabs(page).getByRole("link", { name: "Recientes" }).click();
  await expect(page).toHaveURL(/tab=recientes&categoria=deportes/);
  await page.waitForLoadState("networkidle");
  await expect(page.locator("article", { hasText: otherQuestion })).toBeVisible();
});

test("Siguiendo sin encuestas visibles sigue seleccionado y ofrece ir a Recientes", async ({
  page,
  baseURL,
}) => {
  const viewer = await createUser("lector");
  const silent = await createUser("callado");
  await addFollow(viewer, silent, "accepted");

  await signIn(page.context(), viewer, baseURL!);
  await ready(page, "/");
  await expect(tabs(page).getByRole("link", { name: "Siguiendo" })).toHaveAttribute(
    "aria-current",
    "page",
  );
  await expect(page.getByText(/todavía no tienen encuestas visibles/i)).toBeVisible();
  await page.getByRole("link", { name: "Ver Recientes" }).click();
  await expect(page).toHaveURL(/tab=recientes/);
  await page.waitForLoadState("networkidle");
  await expect(tabs(page).getByRole("link", { name: "Recientes" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});

test("voto desde la tarjeta con teclado y movimiento reducido: persiste al recargar y cuenta una vez", async ({
  page,
  baseURL,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const author = await createUser("autor");
  const voter = await createUser("votante");
  const question = `¿E2E teclado ${stamp()}?`;
  const pollId = await seedPoll(author, question, { category: "otros", options: ["Rojo", "Azul"] });

  await signIn(page.context(), voter, baseURL!);
  await ready(page, "/?categoria=otros");
  const card = page.locator("article", { hasText: question });
  await expect(card).toBeVisible();

  await card.getByRole("radio", { name: "Azul" }).focus();
  await page.keyboard.press("Space");
  await expect(card.getByRole("radio", { name: "Azul" })).toBeChecked();
  expect(await votesOf(pollId)).toHaveLength(0);
  await card.getByRole("button", { name: "Votar y descubrir" }).focus();
  await page.keyboard.press("Enter");

  await expect(card.getByText("Tu voto")).toBeVisible();
  const animation = await card
    .locator("[data-bar]")
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);
  expect(animation).toBe("none");
  expect(await votesOf(pollId)).toHaveLength(1);

  await page.reload();
  await page.waitForLoadState("networkidle");
  const again = page.locator("article", { hasText: question });
  await expect(again.getByText("Tu voto")).toBeVisible();
  await expect(again.getByRole("radio")).toHaveCount(0);
  expect(await votesOf(pollId)).toHaveLength(1);
});

test("retención: una cerrada hace 1 h sigue en el feed con resultados; hace 25 h sale, pero su enlace funciona", async ({
  page,
}) => {
  const author = await createUser("autor");
  const voter = await createUser("votante");
  const tag = stamp();
  const recent = `¿E2E cerrada reciente ${tag}?`;
  const expired = `¿E2E cerrada caducada ${tag}?`;
  const recentId = await seedPoll(author, recent, { category: "estilo-de-vida" });
  const expiredId = await seedPoll(author, expired, { category: "estilo-de-vida" });
  await vote(voter, recentId, 0);
  await vote(voter, expiredId, 1);
  await closePoll(recentId, 1);
  await closePoll(expiredId, 25);

  await ready(page, "/?tab=recientes&categoria=estilo-de-vida");
  const card = page.locator("article", { hasText: recent });
  await expect(card).toBeVisible();
  await expect(card.getByRole("radio")).toHaveCount(0);
  await expect(card).toContainText(/\d[,.]\d\s?%/);
  await expect(page.locator("article", { hasText: expired })).toHaveCount(0);

  // La caducada sigue accesible por su enlace, con resultados y sin voto.
  await ready(page, `/polls/${expiredId}`);
  await expect(page.getByRole("heading", { name: expired })).toBeVisible();
  await expect(page.getByRole("radio")).toHaveCount(0);
  await expect(page.locator("main")).toContainText(/\d[,.]\d\s?%/);
});

test("peticiones lentas, doble clic y error de red al cargar más: no se duplica nada y se puede continuar", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // @ts-expect-error: sin observador la carga es sólo por botón, determinista
    delete window.IntersectionObserver;
  });
  await ready(page, "/?tab=recientes&categoria=ciencia");
  await expect(cards(page)).toHaveCount(20);

  const actions: Request[] = [];
  page.on("request", (request) => {
    if (isServerAction(request)) actions.push(request);
  });
  const more = page.getByRole("button", { name: "Cargar más" });

  // Petición lenta + doble clic: una sola petición y sin tarjetas repetidas.
  await page.route("**/*", async (route) => {
    if (isServerAction(route.request())) await new Promise((r) => setTimeout(r, 1500));
    await route.continue();
  });
  await more.dblclick();
  await expect(page.getByRole("button", { name: "Cargando…" })).toBeVisible();
  await expect.poll(async () => cards(page).count(), { timeout: 15_000 }).toBeGreaterThan(20);
  expect(actions).toHaveLength(1);
  const afterSlow = await cards(page).count();
  await page.unroute("**/*");

  // Error de red: se avisa, se conservan las tarjetas y el botón sigue usable.
  const hasMore = await more.isVisible().catch(() => false);
  if (hasMore) {
    await page.route("**/*", async (route) => {
      if (isServerAction(route.request())) await route.abort("failed");
      else await route.continue();
    });
    await more.click();
    await expect(page.locator("p[role=alert]")).toBeVisible();
    await expect(cards(page)).toHaveCount(afterSlow);
    await page.unroute("**/*");
    await more.click();
    await page.waitForLoadState("networkidle");
    await expect(page.locator("p[role=alert]")).toHaveCount(0);
  }
});

test("a 320 px no hay desbordamiento horizontal y el botón queda por encima de la barra móvil", async ({
  page,
}) => {
  await page.addInitScript(() => {
    // @ts-expect-error: sin observador la carga es sólo por botón, determinista
    delete window.IntersectionObserver;
  });
  await page.setViewportSize({ width: 320, height: 640 });
  await ready(page, "/?tab=recientes&categoria=ciencia");
  await expect(cards(page)).toHaveCount(20);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);

  // Teclado: las pestañas y las categorías son enlaces alcanzables con Tab y tienen foco visible.
  await tabs(page).getByRole("link", { name: "Recientes" }).focus();
  await page.keyboard.press("Tab");
  await expect(tabs(page).getByRole("link", { name: "Siguiendo" })).toBeFocused();

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const more = page.getByRole("button", { name: "Cargar más" });
  await expect(more).toBeVisible();
  const bar = page.getByRole("navigation", { name: "Navegación móvil" });
  if (await bar.isVisible().catch(() => false)) {
    const buttonBox = (await more.boundingBox())!;
    const barBox = (await bar.boundingBox())!;
    expect(buttonBox.y + buttonBox.height).toBeLessThanOrEqual(barBox.y + 1);
  }
});
