// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SearchForm } from "./search-form";

afterEach(cleanup);

describe("SearchForm (SEARCH-002)", () => {
  it("es un formulario de búsqueda accesible que envía q por GET a /search", () => {
    render(<SearchForm />);
    const form = screen.getByRole("search");
    expect(form.getAttribute("action")).toBe("/search");
    expect(form.getAttribute("method")?.toLowerCase()).toBe("get");
    const input = screen.getByRole("searchbox", { name: "Buscar encuestas" }) as HTMLInputElement;
    expect(input.name).toBe("q");
    expect(input.maxLength).toBe(100);
    expect(input.minLength).toBe(2);
    expect(input.getAttribute("autocomplete")).toBe("off");
    expect(screen.getByRole("button", { name: "Buscar" })).toBeDefined();
  });

  it("muestra la consulta actual", () => {
    render(<SearchForm defaultValue="café" />);
    expect((screen.getByRole("searchbox") as HTMLInputElement).value).toBe("café");
  });

  it("los controles miden al menos 44 px", () => {
    render(<SearchForm />);
    expect(screen.getByRole("searchbox").className).toContain("min-h-11");
    expect(screen.getByRole("button", { name: "Buscar" }).className).toContain("min-h-11");
  });
});
