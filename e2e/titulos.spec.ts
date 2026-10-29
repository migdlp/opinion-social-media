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
