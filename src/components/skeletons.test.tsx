import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FeedSkeleton, PollSkeleton } from "./skeletons";

describe("FeedSkeleton", () => {
  it("se anuncia como carga y no es sólo visual", () => {
    const html = renderToStaticMarkup(<FeedSkeleton />);

    expect(html).toContain('role="status"');
    expect(html).toContain('aria-busy="true"');
    expect(html).toContain("Cargando encuestas…");
  });

  it("reserva el mismo espacio que el feed: misma rejilla y varias tarjetas", () => {
    const html = renderToStaticMarkup(<FeedSkeleton />);

    expect(html).toContain("md:grid-cols-2");
    expect(html.match(/data-skeleton-card/g)?.length).toBeGreaterThanOrEqual(4);
  });

  it("la animación sólo corre si el usuario no pidió reducir el movimiento", () => {
    const html = renderToStaticMarkup(<FeedSkeleton />);

    expect(html).toContain("motion-safe:animate-pulse");
    expect(html).not.toMatch(/(?<![:\w-])animate-pulse/);
  });

  it("no contiene cifras ni porcentajes", () => {
    expect(renderToStaticMarkup(<FeedSkeleton />)).not.toMatch(/\d\s*%|\bvotos?\b/i);
  });
});

describe("PollSkeleton", () => {
  it("reserva el hueco del detalle con el mismo ancho de lectura", () => {
    const html = renderToStaticMarkup(<PollSkeleton />);

    expect(html).toContain('role="status"');
    expect(html).toContain("Cargando encuesta…");
    expect(html).toContain("max-w-content");
    expect(html).toContain("motion-safe:animate-pulse");
  });
});
