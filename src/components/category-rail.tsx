"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";

// Desplazar sólo el carril evita los saltos verticales de scrollIntoView al cargar
// una URL filtrada o recorrer los enlaces con teclado.
function reveal(rail: HTMLElement, link: HTMLElement) {
  const frame = rail.getBoundingClientRect();
  const item = link.getBoundingClientRect();
  if (item.left < frame.left + 4) rail.scrollLeft += item.left - frame.left - 4;
  else if (item.right > frame.right - 4) rail.scrollLeft += item.right - frame.right + 4;
}

export function CategoryRail({
  selected,
  children,
}: {
  selected: string | null;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const rail = ref.current;
    const active = rail?.querySelector<HTMLElement>('a[aria-current="page"]');
    if (rail && active) reveal(rail, active);
  }, [selected]);

  return (
    <nav
      ref={ref}
      aria-label="Categorías"
      className="category-rail"
      onKeyDown={(event) => {
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        const rail = ref.current;
        if (!rail) return;
        const links = Array.from(rail.querySelectorAll("a"));
        const active = links.indexOf((event.target as HTMLElement).closest("a")!);
        if (active < 0) return;
        let index: number;
        if (event.key === "ArrowRight") index = Math.min(active + 1, links.length - 1);
        else if (event.key === "ArrowLeft") index = Math.max(active - 1, 0);
        else if (event.key === "Home") index = 0;
        else if (event.key === "End") index = links.length - 1;
        else return;
        event.preventDefault();
        links[index].focus({ preventScroll: true });
        reveal(rail, links[index]);
      }}
    >
      {children}
    </nav>
  );
}
