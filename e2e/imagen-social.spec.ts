import { expect, test, type APIResponse } from "@playwright/test";
import { admin, createPoll, createUser, hidePoll, signIn, vote } from "./support/supabase";

async function png(response: APIResponse) {
  expect(response.status()).toBe(200);
  expect(response.headers()["content-type"]).toContain("image/png");
  const body = await response.body();
  expect([...body.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
  expect(body.readUInt32BE(16)).toBe(1200);
  expect(body.readUInt32BE(20)).toBe(630);
  return body;
}

test("la imagen compartida ignora la sesión, los votos y las encuestas privadas u ocultas", async ({
  page,
  baseURL,
}) => {
  const author = await createUser("og");
  const poll = await createPoll(author, `¿Qué prefieres para compartir ${Date.now()}?`, [
    "Sol",
    "Luna",
  ]);
  const image = `/polls/${poll}/opengraph-image`;
  const generic = await png(await page.request.get("/polls/no-valido/opengraph-image"));
  const publicImage = await png(await page.request.get(image));
  expect(publicImage.equals(generic)).toBe(false);

  await signIn(page.context(), author, baseURL!);
  await vote(author, poll, 0);
  // Ni la sesión ni el voto del autor alteran la tarjeta social.
  expect((await png(await page.request.get(image))).equals(publicImage)).toBe(true);

  const { error } = await admin
    .from("profiles")
    .update({ is_private: true })
    .eq("user_id", author.id);
  expect(error).toBeNull();
  // El autor puede ver su encuesta, pero el rastreador siempre es anónimo.
  expect((await png(await page.request.get(image))).equals(generic)).toBe(true);
  await page.goto(`/polls/${poll}`);
  await expect(page).toHaveTitle("No disponible | Opinión");

  await admin.from("profiles").update({ is_private: false }).eq("user_id", author.id);
  await hidePoll(poll);
  expect((await png(await page.request.get(image))).equals(generic)).toBe(true);
});
