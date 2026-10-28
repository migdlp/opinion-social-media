import Link from "next/link";
import { loginPath } from "@/lib/auth/redirect";
import type { Category, FeedMode } from "@/lib/data/types";

export function feedHref(mode: FeedMode, category: string | null): string {
  return `/?tab=${mode}${category ? `&categoria=${encodeURIComponent(category)}` : ""}`;
}

const TAB =
  "inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold transition-colors";
const SELECTED = `${TAB} bg-foreground text-background`;
const UNSELECTED = `${TAB} border border-field hover:border-foreground`;
const CHIP =
  "inline-flex min-h-11 items-center rounded-full px-3.5 text-[13px] font-medium transition-colors";

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
    <div className="flex flex-col gap-3">
      <nav aria-label="Lista de encuestas" className="flex gap-2">
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
        <nav aria-label="Categorías" className="flex flex-wrap gap-2">
          {[{ slug: null, name: "Todas" }, ...categories].map(({ slug, name }) => (
            <Link
              key={slug ?? "todas"}
              href={feedHref(mode, slug)}
              aria-current={category === slug ? "page" : undefined}
              className={`${CHIP} ${category === slug ? "bg-foreground text-background" : "border border-border hover:border-foreground"}`}
            >
              {name}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
