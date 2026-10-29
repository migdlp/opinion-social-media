import { expect, test } from "@playwright/test";
import { admin, createPoll, createUser, signIn, vote } from "./support/supabase";

test("la audiencia protege HTML/RSC y el propietario conserva su historial", async ({
  page,
  baseURL,
}) => {
  const author = await createUser("historyauthor");
  const owner = await createUser("historyowner");
  const question = `Historial de voto protegido ${Date.now()}`;
  const id = await createPoll(author, question, ["Naranja", "Azul"]);
  await vote(owner, id, 0);
  const path = `/u/${owner.username}?tab=votadas`;
  await page.goto(path);
  await expect(
    page.getByText("Este usuario no comparte su historial de votos contigo."),
  ).toBeVisible();
  expect(await page.content()).not.toContain(question);
  expect(await page.content()).not.toContain(id);
  // Simula únicamente la elección explícita del propietario en la base LOCAL; la UI va en PRIV-002.
  const shared = await admin
    .from("profiles")
    .update({ vote_visibility: "profile" })
    .eq("user_id", owner.id);
  if (shared.error) throw shared.error;
  await page.reload();
  await expect(page.getByText(question, { exact: true })).toBeVisible();
  const hidden = await admin
    .from("profiles")
    .update({ vote_visibility: "private" })
    .eq("user_id", owner.id);
  if (hidden.error) throw hidden.error;
  await page.reload();
  expect(await page.content()).not.toContain(question);
  expect(await page.content()).not.toContain(id);
  await signIn(page.context(), owner, baseURL!);
  await page.reload();
  await expect(page.getByText(question, { exact: true })).toBeVisible();
  await expect(page.getByText("Votó: Naranja", { exact: true })).toBeVisible();
});
