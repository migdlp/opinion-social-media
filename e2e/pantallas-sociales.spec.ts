// DESIGN-004: perfiles, listas, solicitudes y ajustes con la identidad After Sunset, en 320 px y
// escritorio, en ambos temas y con nombres de 50 caracteres. Las capturas (visual-*.png) las sube la CI.
import { expect, test, type Page } from "@playwright/test";
import { chooseTheme } from "./support/theme";
import { addFollow, admin, createUser, seedPoll, signIn, type TestUser } from "./support/supabase";

const LONG_NAME = "Maximiliano de la Santísima Trinidad y Alcántara"; // 48 caracteres
const ACCENT = "rgb(255, 177, 107)"; // --accent, igual en ambos temas

async function setDisplayName(user: TestUser, name: string) {
  const { error } = await admin
    .from("profiles")
    .update({ display_name: name })
    .eq("user_id", user.id);
  if (error) throw error;
}

const noHorizontalOverflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);

test("perfiles, listas, solicitudes y ajustes en 320 px y escritorio, claro y oscuro", async ({
  page,
  baseURL,
}, testInfo) => {
  test.skip(testInfo.project.name !== "escritorio", "fija sus propios anchos de ventana");
  test.setTimeout(240_000);

  const owner = await createUser("propia", { isPrivate: true });
  await setDisplayName(owner, LONG_NAME);
  const closed = await createUser("cerrada", { isPrivate: true });
  const open = await createUser("abierta");
  await seedPoll(open, "¿Pantallas sociales con la misma identidad?", { options: ["Sí", "No"] });
  const followerA = await createUser("seguidora");
  const followerB = await createUser("seguidor");
  await setDisplayName(followerA, LONG_NAME);
  await addFollow(followerA, owner, "accepted");
  await addFollow(followerB, owner, "accepted");
  const askerA = await createUser("solicita");
  const askerB = await createUser("solicitud");
  await setDisplayName(askerA, LONG_NAME);
  await addFollow(askerA, owner, "pending");
  await addFollow(askerB, owner, "pending");
  const viewer = await createUser("lectora");

  for (const width of [320, 1280]) {
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme, reducedMotion: "no-preference" });
      await page.setViewportSize({ width, height: width < 768 ? 960 : 1000 });
      const shot = (name: string) =>
        page.screenshot({
          path: testInfo.outputPath(`visual-${width}-${theme}-${name}.png`),
          fullPage: true,
          animations: "disabled",
        });

      // Con la sesión de una lectora: perfil público y perfil privado sin acceso.
      await signIn(page.context(), viewer, baseURL!);
      await page.goto(`/u/${open.username}`);
      await chooseTheme(page, theme);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const follow = page.getByRole("button", { name: "Seguir", exact: true });
      await expect(follow).toHaveCSS("background-color", ACCENT);
      expect(await noHorizontalOverflow(page), `público ${width} ${theme}`).toBe(true);
      await shot("publico");

      await page.goto(`/u/${closed.username}`);
      await expect(
        page.getByText("Esta cuenta es privada. Síguela para ver sus encuestas y votos."),
      ).toBeVisible();
      expect(await noHorizontalOverflow(page), `privado ${width} ${theme}`).toBe(true);
      await shot("privado");

      // Con la sesión de la cuenta privada: perfil propio, listas, solicitudes y ajustes.
      await signIn(page.context(), owner, baseURL!);
      await page.goto(`/u/${owner.username}`);
      await expect(
        page.getByRole("link", { name: /Solicitudes de seguimiento: 2 pendientes/ }),
      ).toBeVisible();
      const tab = page.getByRole("link", { name: "Creadas", exact: true });
      await expect(tab).toHaveAttribute("aria-current", "page");
      // Pestaña subrayada como las del feed, no una píldora rellena.
      await expect(tab).toHaveCSS("border-bottom-width", "2px");
      await expect(tab).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      expect(await noHorizontalOverflow(page), `propio ${width} ${theme}`).toBe(true);
      await shot("propio");

      await page.goto(`/u/${owner.username}/seguidores`);
      await expect(page.getByRole("button", { name: /^Eliminar/ }).first()).toBeVisible();
      expect(await noHorizontalOverflow(page), `seguidores ${width} ${theme}`).toBe(true);
      await shot("seguidores");

      await page.goto("/solicitudes");
      const accept = page.getByRole("button", { name: /^Aceptar/ }).first();
      await expect(accept).toHaveCSS("background-color", ACCENT);
      expect(await noHorizontalOverflow(page), `solicitudes ${width} ${theme}`).toBe(true);
      await shot("solicitudes");

      await page.goto("/settings");
      await expect(page.getByRole("switch", { name: "Cuenta privada" })).toBeVisible();
      expect(await noHorizontalOverflow(page), `ajustes ${width} ${theme}`).toBe(true);
      await shot("ajustes");
    }
  }
});
