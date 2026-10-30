// CMT-002 (y E2E de CMT-003): debate bajo el detalle de una encuesta en la app compilada contra
// Supabase local, en escritorio y móvil: apagado por defecto, activar al crear, voto previo,
// publicar, apagar/reactivar sin perder comentarios, cerradas, denuncia y contenido moderado.
import { expect, test, type Page } from "@playwright/test";
import { admin, closePoll, createUser, seedPoll, signIn, vote } from "./support/supabase";

const stamp = () => `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;

async function ready(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
}

const discussion = (page: Page) => page.getByRole("region", { name: "Comentarios" });
const commentBox = (page: Page) => page.getByRole("textbox", { name: "Escribe un comentario" });

async function addComment(pollId: string, userId: string, body: string) {
  const { error } = await admin.from("comments").insert({ poll_id: pollId, user_id: userId, body });
  if (error) throw error;
}

test("crear: Comentarios viene apagado; al activarlo la autora lo ve en el detalle", async ({
  page,
  baseURL,
}) => {
  const author = await createUser("autor");
  const question = `¿E2E debate al crear ${stamp()}?`;
  await signIn(page.context(), author, baseURL!);
  await ready(page, "/create");

  await expect(page.getByRole("checkbox", { name: "Comentarios" })).not.toBeChecked();
  await page.getByLabel("Pregunta").fill(question);
  await page.getByRole("checkbox", { name: "Comentarios" }).check();
  await page.getByRole("button", { name: "Publicar" }).click();
  await page.waitForURL(/\/polls\/[0-9a-f-]{36}$/);

  await expect(discussion(page)).toBeVisible();
  await expect(discussion(page).getByRole("checkbox", { name: "Comentarios" })).toBeChecked();
  // La autora tampoco accede al debate de una abierta sin haber votado.
  await expect(discussion(page).getByText(/vota para ver y escribir comentarios/i)).toBeVisible();
  await expect(commentBox(page)).toHaveCount(0);
});

test("apagado por defecto: sin sección para los demás; la autora puede activarlo desde el detalle", async ({
  page,
  baseURL,
  browser,
}) => {
  const author = await createUser("autor");
  const reader = await createUser("lector");
  const pollId = await seedPoll(author, `¿E2E debate apagado ${stamp()}?`);

  await signIn(page.context(), reader, baseURL!);
  await ready(page, `/polls/${pollId}`);
  await expect(discussion(page)).toHaveCount(0);

  const authorContext = await browser.newContext();
  try {
    await signIn(authorContext, author, baseURL!);
    const authorPage = await authorContext.newPage();
    await ready(authorPage, `/polls/${pollId}`);
    await expect(
      discussion(authorPage).getByRole("checkbox", { name: "Comentarios" }),
    ).not.toBeChecked();
    await discussion(authorPage).getByRole("checkbox", { name: "Comentarios" }).check();
    await expect(
      discussion(authorPage).getByText(/vota para ver y escribir comentarios/i),
    ).toBeVisible();
    const { data } = await admin.from("polls").select("comments_enabled").eq("id", pollId).single();
    expect(data?.comments_enabled).toBe(true);
  } finally {
    await authorContext.close();
  }
});

test("abierta: sin voto no hay comentarios en la página; al votar se abre el debate y se publica", async ({
  page,
  baseURL,
}) => {
  const author = await createUser("autor");
  const voter = await createUser("votante");
  const pollId = await seedPoll(author, `¿E2E debate con voto ${stamp()}?`, {
    commentsEnabled: true,
  });
  await addComment(pollId, author.id, "Texto secreto del debate");

  await signIn(page.context(), voter, baseURL!);
  await ready(page, `/polls/${pollId}`);
  await expect(discussion(page).getByText(/vota para ver y escribir comentarios/i)).toBeVisible();
  expect(await page.content()).not.toContain("Texto secreto del debate");

  await page.getByRole("radio", { name: "Sí", exact: true }).check();
  await page.getByRole("button", { name: "Votar y descubrir" }).click();
  await expect(page.getByText("Tu voto")).toBeVisible();
  await expect(discussion(page).getByText("Texto secreto del debate")).toBeVisible();

  await commentBox(page).fill("<b>Mi opinión</b> con HTML");
  await page.getByRole("button", { name: "Publicar comentario" }).click();
  await expect(discussion(page).getByText("<b>Mi opinión</b> con HTML")).toBeVisible();
  await expect(commentBox(page)).toHaveValue("");
  expect(await discussion(page).locator("b").count()).toBe(0);

  await ready(page, `/polls/${pollId}`);
  await expect(discussion(page).getByText("<b>Mi opinión</b> con HTML")).toBeVisible();
});

test("apagar y reactivar conserva los comentarios", async ({ page, baseURL }) => {
  const author = await createUser("autor");
  const pollId = await seedPoll(author, `¿E2E debate reactivado ${stamp()}?`, {
    commentsEnabled: true,
  });
  await vote(author, pollId, 0);
  await addComment(pollId, author.id, "Se conserva");

  await signIn(page.context(), author, baseURL!);
  await ready(page, `/polls/${pollId}`);
  await expect(discussion(page).getByText("Se conserva")).toBeVisible();
  await discussion(page).getByRole("checkbox", { name: "Comentarios" }).uncheck();
  await expect(discussion(page).getByText("Se conserva")).toHaveCount(0);
  await discussion(page).getByRole("checkbox", { name: "Comentarios" }).check();
  await expect(discussion(page).getByText("Se conserva")).toBeVisible();
});

test("cerrada: un visitante lee el debate sin votar y para comentar le pide iniciar sesión", async ({
  page,
}) => {
  const author = await createUser("autor");
  const pollId = await seedPoll(author, `¿E2E debate cerrada ${stamp()}?`, {
    commentsEnabled: true,
  });
  await addComment(pollId, author.id, "Comentario de una cerrada");
  await closePoll(pollId, 2);

  await ready(page, `/polls/${pollId}`);
  await expect(discussion(page).getByText("Comentario de una cerrada")).toBeVisible();
  await expect(commentBox(page)).toHaveCount(0);
  await expect(
    discussion(page).getByRole("link", { name: /inicia sesión para comentar/i }),
  ).toBeVisible();
});

test("denunciar: se envía, un duplicado se explica y un comentario moderado desaparece", async ({
  page,
  baseURL,
}) => {
  const author = await createUser("autor");
  const reader = await createUser("lector");
  const pollId = await seedPoll(author, `¿E2E debate denuncia ${stamp()}?`, {
    commentsEnabled: true,
  });
  await vote(reader, pollId, 0);
  await addComment(pollId, author.id, "Comentario denunciable");

  await signIn(page.context(), reader, baseURL!);
  await ready(page, `/polls/${pollId}`);
  const item = discussion(page).getByRole("listitem").filter({ hasText: "Comentario denunciable" });
  await item.getByText("Denunciar").click();
  await item.getByRole("button", { name: "Enviar denuncia" }).click();
  await expect(item.getByRole("alert")).toContainText(/elige un motivo/i);
  await item.getByRole("combobox", { name: "Motivo" }).selectOption("spam");
  await item.getByRole("button", { name: "Enviar denuncia" }).click();
  await expect(item.getByText(/gracias, hemos recibido/i)).toBeVisible();

  // Duplicado tras recargar: el servidor lo rechaza con un mensaje claro.
  await ready(page, `/polls/${pollId}`);
  const again = discussion(page)
    .getByRole("listitem")
    .filter({ hasText: "Comentario denunciable" });
  await again.getByText("Denunciar").click();
  await again.getByRole("combobox", { name: "Motivo" }).selectOption("spam");
  await again.getByRole("button", { name: "Enviar denuncia" }).click();
  await expect(again.getByRole("alert")).toContainText(/ya habías denunciado/i);

  // Moderado por un operador: desaparece de la página.
  await admin.from("comments").update({ status: "hidden" }).eq("poll_id", pollId);
  await ready(page, `/polls/${pollId}`);
  await expect(discussion(page).getByText("Comentario denunciable")).toHaveCount(0);
});

test("bloqueo: los comentarios de una cuenta bloqueada por la autora no se ven", async ({
  page,
  baseURL,
}) => {
  const author = await createUser("autor");
  const blocked = await createUser("bloqueado");
  const reader = await createUser("lector");
  const pollId = await seedPoll(author, `¿E2E debate bloqueo ${stamp()}?`, {
    commentsEnabled: true,
  });
  await vote(reader, pollId, 0);
  await addComment(pollId, blocked.id, "Del bloqueado");
  await addComment(pollId, reader.id, "Del lector");
  await admin.from("user_blocks").insert({ blocker_id: author.id, blocked_id: blocked.id });

  await signIn(page.context(), reader, baseURL!);
  await ready(page, `/polls/${pollId}`);
  await expect(discussion(page).getByText("Del lector")).toBeVisible();
  await expect(discussion(page).getByText("Del bloqueado")).toHaveCount(0);
});

test("teclado: el formulario y el interruptor se manejan sin ratón", async ({ page, baseURL }) => {
  const author = await createUser("autor");
  const pollId = await seedPoll(author, `¿E2E debate teclado ${stamp()}?`, {
    commentsEnabled: true,
  });
  await vote(author, pollId, 0);
  await signIn(page.context(), author, baseURL!);
  await ready(page, `/polls/${pollId}`);

  await commentBox(page).focus();
  await page.keyboard.type("Escrito con teclado");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Publicar comentario" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(discussion(page).getByText("Escrito con teclado")).toBeVisible();
});
