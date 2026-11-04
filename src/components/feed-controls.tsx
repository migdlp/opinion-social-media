import Link from "next/link";
import { loginPath } from "@/lib/auth/redirect";
import type { Category, FeedMode } from "@/lib/data/types";
import { CategoryRail } from "./category-rail";

export function feedHref(mode: FeedMode, category: string | null): string {
  return `/?tab=${mode}${category ? `&categoria=${encodeURIComponent(category)}` : ""}`;
}

const TAB = "inline-flex min-h-11 items-center border-b-2 px-1 text-[15px] transition-colors";
const SELECTED = `${TAB} border-foreground font-semibold text-foreground`;
const UNSELECTED = `${TAB} border-transparent text-muted hover:border-field`;
const CHIP =
  "inline-flex min-h-11 shrink-0 items-center rounded-full border px-3.5 text-[13px] font-medium whitespace-nowrap transition-colors duration-150";

// Pestañas Recientes/Siguiendo y filtro de categoría del feed (V2-032, D-022 y D-024). Son enlaces:
// la selección vive en la URL, se puede copiar y recargar, y cambiarla descarta las filas y el
// cursor anteriores. El estado seleccionado lo anuncia aria-current. Un visitante ve «Siguiendo»
// como enlace al login que vuelve a esa pestaña.
export function FeedControls({
  mode,
  category,
  categories,
  signedIn,
}: {
  mode: FeedMode;
  category: string | null;
  categories: Category[];
  signedIn: boolean;
}) {
  const tabs: { id: FeedMode; label: string }[] = [
    { id: "recientes", label: "Recientes" },
    { id: "siguiendo", label: "Siguiendo" },
  ];
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <nav aria-label="Lista de encuestas" className="flex gap-6">
        {tabs.map(({ id, label }) => {
          const href = feedHref(id, category);
          const guest = id === "siguiendo" && !signedIn;
          return (
            <Link
              key={id}
              href={guest ? loginPath(href) : href}
              aria-current={mode === id ? "page" : undefined}
              className={mode === id ? SELECTED : UNSELECTED}
            >
              {label}
            </Link>
          );
        })}
      </nav>
      {categories.length > 0 && (
        <CategoryRail selected={category}>
          {[{ slug: null, name: "Todas" }, ...categories].map(({ slug, name }) => (
            <Link
              key={slug ?? "todas"}
              href={feedHref(mode, slug)}
              aria-current={category === slug ? "page" : undefined}
              className={`${CHIP} ${category === slug ? "border-field bg-accent-soft font-semibold text-accent-foreground" : "border-border text-muted hover:border-field"}`}
            >
              {name}
            </Link>
          ))}
        </CategoryRail>
      )}
    </div>
  );
}
