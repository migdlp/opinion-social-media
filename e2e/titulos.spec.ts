// DESIGN-011: cada página tiene un <title> propio y sin filtrar nada de cuentas privadas ni inexistentes.
import { expect, test } from "@playwright/test";
import { createPoll, createUser, signIn } from "./support/supabase";

const SUFFIX = " · Opinión";

test("rutas públicas: título propio y distinto", async ({ page }) => {
  const author = await createUser("autor", { isPrivate: true });
  // La encuesta es de una cuenta pública: la de una cuenta privada no existe para un visitante.
  const publicAuthor = await createUser("publico");
  const pollId = await createPoll(publicAuthor, `¿E2E título ${Date.now()}?`, ["Sí", "No"]);

  const expected: [string, string | RegExp][] = [
    ["/", "Opinión"],
    ["/login", `Iniciar sesión${SUFFIX}`],
    ["/create", `Crear encuesta${SUFFIX}`],
    [`/u/${author.username}`, `@${author.username}${SUFFIX}`],
    [`/u/${author.username}/seguidores`, `Seguidores de @${author.username}${SUFFIX}`],
    [`/u/${author.username}/siguiendo`, `Siguiendo de @${author.username}${SUFFIX}`],
    ["/u/1mal", `No disponible${SUFFIX}`],
    ["/ruta-que-no-existe", `No disponible${SUFFIX}`],
  ];
  for (const [path, title] of expected) {
    await page.goto(path);
    await expect(page, path).toHaveTitle(title);
  }
  // La encuesta conserva su título propio (sin sufijo añadido por esta tarea).
  await page.goto(`/polls/${pollId}`);
  await expect(page).toHaveTitle(/¿E2E título \d+\?/);
});

test("con sesión: onboarding y solicitudes", async ({ page, baseURL }) => {
  const newcomer = await createUser("nuevo", { profile: false });
  await signIn(page.context(), newcomer, baseURL!);
  await page.goto("/onboarding");
  await expect(page).toHaveTitle(`Elige tu usuario${SUFFIX}`);

  const member = await createUser("miembro");
  await signIn(page.context(), member, baseURL!);
  await page.goto("/solicitudes");
  await expect(page).toHaveTitle(`Solicitudes de seguimiento${SUFFIX}`);
});

// META-001: tarjeta social. Las páginas sin metadatos propios heredan la de «Opinión»; el perfil
// tiene la suya con sólo el @usuario de la URL (sin biografía, nombre visible ni recuentos).
test("tarjeta social de la portada y del perfil", async ({ page }) => {
  const author = await createUser("tarjeta", { isPrivate: true });
  const og = (property: string) =>
    page.locator(`meta[property="${property}"]`).getAttribute("content");

  await page.goto("/");
  expect(await og("og:title")).toBe("Opinión");
  expect(await og("og:site_name")).toBe("Opinión");
  expect(await og("og:type")).toBe("website");
  await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary");

  await page.goto("/login");
  expect(await og("og:title")).toBe("Opinión");

  // Una cuenta privada tiene la misma tarjeta que una pública: sólo el @usuario de la URL.
  await page.goto(`/u/${author.username}`);
  expect(await og("og:title")).toBe(`@${author.username}${SUFFIX}`);
  expect(await og("og:description")).toBe(`Encuestas de @${author.username} en Opinión.`);
  expect(await og("og:type")).toBe("profile");
  // Los metadatos de la página sustituyen a los del layout (no se mezclan).
  await expect(page.locator('meta[property="og:site_name"]')).toHaveCount(0);

  await page.goto("/u/1mal");
  expect(await og("og:description")).toBe("Esta página no está disponible.");
});
