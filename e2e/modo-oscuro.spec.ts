// V2-017: con el sistema en oscuro, las rutas públicas se ven en oscuro (tokens de globals.css)
// y se adjunta una captura de cada una. Contra la app compilada y Supabase local.
import { expect, test } from "@playwright/test";
import { createPoll, createUser } from "./support/supabase";

test.use({ colorScheme: "dark" });

// Colores computados: --background #161e2e, --foreground #f9f9ff.
const DARK_BACKGROUND = "rgb(22, 30, 46)";
const LIGHT_TEXT = "rgb(249, 249, 255)";

async function expectDark(page: import("@playwright/test").Page) {
  const colors = await page.evaluate(() => ({
    background: getComputedStyle(document.body).backgroundColor,
    text: getComputedStyle(document.body).color,
  }));
  expect(colors).toEqual({ background: DARK_BACKGROUND, text: LIGHT_TEXT });
}

test("feed y detalle se ven en oscuro, con captura", async ({ page }, testInfo) => {
  const author = await createUser("autor");
  const question = `¿E2E oscuro ${Date.now()}?`;
  const pollId = await createPoll(author, question, ["Rojo", "Azul"]);

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("article", { hasText: question })).toBeVisible();
  await expectDark(page);
  await testInfo.attach("feed-oscuro", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });

  await page.goto(`/polls/${pollId}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("heading", { level: 1, name: question })).toBeVisible();
  await expectDark(page);
  await testInfo.attach("detalle-oscuro", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("login y creación también en oscuro", async ({ page }) => {
  for (const path of ["/login", "/create"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectDark(page);
  }
});
