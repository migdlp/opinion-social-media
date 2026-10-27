import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { EmptyState } from "./empty-state";
import { LoadingState } from "./loading-state";

describe("LoadingState", () => {
  it("se anuncia como estado y muestra texto visible", () => {
    const html = renderToStaticMarkup(<LoadingState label="Cargando encuesta…" />);
    expect(html).toContain('role="status"');
    expect(html).toContain("Cargando encuesta…");
  });

  it("usa un texto por defecto", () => {
    expect(renderToStaticMarkup(<LoadingState />)).toContain("Cargando…");
  });
});

describe("EmptyState", () => {
  it("explica el vacío y ofrece navegación útil", () => {
    const html = renderToStaticMarkup(
      <EmptyState
        title="Todavía no hay encuestas"
        description="Sé la primera persona en preguntar algo."
        action={{ href: "/create", label: "Crear encuesta" }}
      />,
    );
    expect(html).toContain("<h2");
    expect(html).toContain("Todavía no hay encuestas");
    expect(html).toContain("Sé la primera persona en preguntar algo.");
    expect(html).toMatch(/<a[^>]*href="\/create"[^>]*>Crear encuesta<\/a>/);
  });

  it("no muestra acción si no se indica", () => {
    const html = renderToStaticMarkup(
      <EmptyState title="Sin datos" description="Nada que mostrar." />,
    );
    expect(html).not.toContain("<a");
  });
});

// Ambos componentes no guardan estado: lo que pintan depende sólo de sus props,
// así que al cambiar de estado no queda contenido anterior.
describe("cambio de estado", () => {
  it("de carga a vacío no conserva el indicador de carga", () => {
    const loading = renderToStaticMarkup(<LoadingState />);
    const empty = renderToStaticMarkup(<EmptyState title="Sin datos" description="Nada." />);
    expect(loading).not.toContain("Sin datos");
    expect(empty).not.toContain('role="status"');
    expect(empty).not.toContain("Cargando");
  });
});
