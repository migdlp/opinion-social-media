import type { Page } from "@playwright/test";

// Objetivos táctiles (DESIGN-010). Mínimo AA de WCAG 2.5.8: 24×24 px de zona pulsable para cualquier enlace o
// botón visible; 44 px de alto para los controles primarios.
export const MIN_TARGET = 24;
export const PRIMARY_TARGET = 44;

export type SmallTarget = { text: string; width: number; height: number; need: number };

// Mide la zona pulsable real: el ancho del elemento y el alto hasta donde `elementFromPoint` sigue
// devolviendo el propio elemento (así cuenta el padding de un enlace en línea, que no cambia el
// diseño). Se salta lo que no es un objetivo propio: texto sólo para lectores, el enlace que cubre
// toda la tarjeta (su `::after` ocupa la tarjeta) y las casillas, cuya zona es su etiqueta.
export async function findSmallTargets(page: Page, primary: string[] = []): Promise<SmallTarget[]> {
  return page.evaluate(
    ({ min, big, primary }) => {
      const label = (e: Element) =>
        ((e as HTMLElement).innerText || e.getAttribute("aria-label") || e.tagName)
          .trim()
          .replace(/\s+/g, " ")
          .slice(0, 40);
      const found: { text: string; width: number; height: number; need: number }[] = [];
      const selector =
        "a[href], button, select, textarea, summary, input:not([type=hidden]):not([type=radio]):not([type=checkbox])";
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(selector))) {
        const style = getComputedStyle(el);
        if (style.visibility === "hidden" || style.display === "none") continue;
        const rect = el.getBoundingClientRect();
        if (rect.width <= 1 || rect.height <= 1) continue;
        if (el.closest(".sr-only") || el.classList.contains("sr-only")) continue;
        const after = getComputedStyle(el, "::after");
        if (after.position === "absolute" && parseFloat(after.height) > rect.height * 2) continue;
        el.scrollIntoView({ block: "center" });
        const box = el.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const inside = (y: number) => {
          const hit = document.elementFromPoint(x, y);
          return !!hit && (hit === el || el.contains(hit));
        };
        const mid = box.top + box.height / 2;
        let top = mid;
        let bottom = mid;
        while (inside(top - 1) && mid - top < 80) top -= 1;
        while (inside(bottom + 1) && bottom - mid < 80) bottom += 1;
        const height = Math.round(bottom - top + 1);
        const need = primary.some((p) => el.matches(p)) ? big : min;
        if (height < need || box.width < min)
          found.push({ text: label(el), width: Math.round(box.width), height, need });
      }
      return found;
    },
    { min: MIN_TARGET, big: PRIMARY_TARGET, primary },
  );
}
