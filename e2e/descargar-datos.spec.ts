// ACCOUNT-003: descargar una copia de mis datos desde Ajustes, contra Supabase local, en
// escritorio y móvil. Comprueba el nombre del archivo, el contenido y el límite de 10 minutos.
import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { admin, createUser, signIn } from "./support/supabase";

test("descargar mis datos: archivo JSON con lo propio, aviso y límite de frecuencia", async ({
  page,
  baseURL,
}) => {
  const me = await createUser("exporta");
  const other = await createUser("ajena");
  const created = await admin
    .from("polls")
    .insert({ user_id: me.id, question: "¿Esta encuesta va en mi copia?" })
    .select("id")
    .single();
  if (created.error) throw created.error;
  const foreign = await admin
    .from("polls")
    .insert({ user_id: other.id, question: "¿Encuesta de otra persona?" })
    .select("id")
    .single();
  if (foreign.error) throw foreign.error;

  await signIn(page.context(), me, baseURL!);
  await page.goto("/settings#descargar");
  await page.waitForLoadState("networkidle");

  const section = page.getByRole("region", { name: "Descargar mis datos" });
  await expect(section).toContainText(
    "Recibirás un archivo JSON con tu perfil, encuestas, votos, comentarios, relaciones, ajustes y denuncias.",
  );

  const downloading = page.waitForEvent("download");
  await section.getByRole("button", { name: "Descargar mis datos" }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^opinion-datos-\d{4}-\d{2}-\d{2}\.json$/);
  await expect(section.getByRole("status")).toHaveText("Descarga lista.");

  const text = await readFile((await download.path())!, "utf8");
  expect(text).toContain('\n  "formato": "opinion-export"');
  const data = JSON.parse(text);
  expect(data.formato).toBe("opinion-export");
  expect(data.cuenta.email).toBe(me.email);
  expect(data.perfil.usuario).toBe(me.username);
  expect(data.encuestas.map((p: { id: string }) => p.id)).toEqual([created.data.id]);
  expect(text).not.toContain(other.id);
  expect(text).not.toContain(foreign.data.id);
  expect(text).not.toContain(me.id);

  // Una segunda petición antes de 10 minutos se rechaza con el texto acordado.
  await section.getByRole("button", { name: "Descargar mis datos" }).click();
  await expect(section.getByRole("alert")).toHaveText(
    "Ya has descargado tus datos hace poco. Inténtalo de nuevo en unos minutos.",
  );
});
