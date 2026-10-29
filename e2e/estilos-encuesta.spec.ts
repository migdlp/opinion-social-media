import { expect, test } from "@playwright/test";
import { createPoll, createUser, signIn } from "./support/supabase";

for (const theme of ["light", "dark"] as const) {
  test(`After Sunset: elegir, votar, denunciar y crear en ${theme}`, async ({
    page,
    baseURL,
  }, testInfo) => {
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.setViewportSize({ width: 320, height: 850 });
    const user = await createUser("estilo");
    const question = `¿Qué actividad prefieres ${Date.now()}?`.padEnd(280, "?");
    const id = await createPoll(user, question, [
      "Un paseo",
      "Una conversación",
      ...Array.from({ length: 4 }, (_, i) =>
        `Alternativa ${i + 3}: ${"una opción muy larga ".repeat(6)}`.slice(0, 100),
      ),
    ]);
    await signIn(page.context(), user, baseURL!);
    await page.goto(`/polls/${id}`);
    const first = page.getByRole("radio", { name: "Un paseo", exact: true });
    await first.check();
    await expect(first.locator("..")).toHaveCSS(
      "background-color",
      theme === "dark" ? "rgb(73, 75, 76)" : "rgb(255, 241, 228)",
    );
    await expect(first.locator("..")).toHaveCSS(
      "color",
      theme === "dark" ? "rgb(249, 249, 255)" : "rgb(22, 30, 46)",
    );
    await first.focus();
    await page.keyboard.press("ArrowDown");
    const second = page.getByRole("radio", { name: "Una conversación", exact: true });
    await expect(second).toBeChecked();
    await expect(second.locator("..")).toHaveCSS(
      "background-color",
      theme === "dark" ? "rgb(73, 75, 76)" : "rgb(255, 241, 228)",
    );
    await expect(first.locator("..")).toHaveCSS(
      "background-color",
      theme === "dark" ? "rgb(44, 59, 80)" : "rgb(249, 250, 255)",
    );
    await expect(second).toHaveCSS(
      "outline-color",
      theme === "dark" ? "rgb(255, 177, 107)" : "rgb(22, 30, 46)",
    );
    await expect(page.getByRole("button", { name: "Votar y descubrir", exact: true })).toHaveCSS(
      "background-color",
      "rgb(255, 177, 107)",
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await testInfo.attach(`seleccion-${theme}`, {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await page.getByRole("button", { name: "Votar y descubrir", exact: true }).click();
    await expect(page.getByText("Tu voto", { exact: true })).toBeVisible();
    await expect(page.locator("[data-bar]").first()).toHaveCSS("animation-name", "none");

    const more = page.getByRole("button", { name: "Más acciones" });
    await more.click();
    await page.getByRole("menuitem", { name: "Denunciar", exact: true }).click();
    const dialog = page.getByRole("dialog", { name: "Denunciar encuesta" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Enviar denuncia" })).toHaveCSS(
      "background-color",
      "rgb(255, 177, 107)",
    );
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press("Tab");
      expect(await dialog.evaluate((element) => element.contains(document.activeElement))).toBe(
        true,
      );
    }
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(more).toBeFocused();

    await page.goto("/");
    await expect(
      page
        .getByRole("navigation", { name: "Lista de encuestas" })
        .getByRole("link", { name: "Recientes", exact: true }),
    ).toHaveCSS("border-bottom-color", theme === "dark" ? "rgb(249, 249, 255)" : "rgb(22, 30, 46)");
    await page.goto("/create");
    await expect(page.getByRole("button", { name: "Publicar", exact: true })).toHaveCSS(
      "background-color",
      "rgb(255, 177, 107)",
    );
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    const field = page.getByLabel("Pregunta", { exact: true });
    await expect(field).toHaveAttribute("aria-invalid", "true");
    await field.focus();
    await page.keyboard.press("Tab");
    await page.keyboard.press("Shift+Tab");
    await expect(field).toHaveCSS("outline-width", "2px");
    await expect(field).toHaveCSS(
      "border-color",
      theme === "dark" ? "rgb(255, 157, 157)" : "rgb(196, 22, 28)",
    );
  });
}
