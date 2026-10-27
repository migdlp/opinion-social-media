// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PollDetail } from "@/lib/data/types";
import { PollDetailView } from "./poll-detail-view";

afterEach(cleanup);

const NOW = new Date("2026-10-27T20:00:00Z");
const DETAIL: PollDetail = {
  poll: {
    id: "11111111-2222-4333-8444-555555555555",
    question: "¿Tortilla con o sin cebolla?",
    createdAt: "2026-10-27T19:00:00Z",
    options: [
      { id: "a", text: "Con cebolla", position: 1 },
      { id: "b", text: "Sin cebolla", position: 2 },
    ],
  },
  viewer: { kind: "anonymous" },
};

describe("PollDetailView", () => {
  it("muestra la pregunta como título, las opciones en orden y el autor genérico", () => {
    const { container } = render(<PollDetailView detail={DETAIL} now={NOW} />);

    expect(screen.getByRole("heading", { level: 1, name: DETAIL.poll.question })).toBeDefined();
    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => within(li).getByText(/cebolla$/).textContent)).toEqual([
      "Con cebolla",
      "Sin cebolla",
    ]);
    expect(screen.getByText("Anónimo")).toBeDefined();
    expect(container.querySelector("time")?.textContent).toBe("hace 1 hora");
  });

  it("ofrece copiar el enlace de la encuesta", () => {
    render(<PollDetailView detail={DETAIL} now={NOW} />);

    expect(screen.getByRole("button", { name: "Copiar enlace" })).toBeDefined();
  });

  it("antes de votar no muestra ninguna cifra: cada opción tiene su porcentaje bloqueado", () => {
    const { container } = render(<PollDetailView detail={DETAIL} now={NOW} />);

    for (const li of screen.getAllByRole("listitem")) {
      expect(within(li).getByText("?? %")).toBeDefined();
    }
    expect(container.textContent).not.toMatch(/\d\s*%|\bvotos?\b|total/i);
  });
});
