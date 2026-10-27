// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PublicPoll } from "@/lib/data/types";
import { PollCard } from "./poll-card";

afterEach(cleanup);

const NOW = new Date("2026-10-27T20:00:00Z");
const POLL: PublicPoll = {
  id: "11111111-2222-3333-4444-555555555555",
  question: "¿Qué tomas por la mañana?",
  createdAt: "2026-10-27T19:55:00Z",
  options: [
    { id: "o1", text: "Café", position: 1 },
    { id: "o2", text: "Té", position: 2 },
  ],
};

describe("PollCard", () => {
  it("muestra pregunta, opciones, fecha y autor genérico, sin datos agregados", () => {
    const { container } = render(<PollCard poll={POLL} now={NOW} />);

    const card = screen.getByRole("article");
    expect(within(card).getByRole("heading", { name: POLL.question })).toBeDefined();
    const items = within(card).getAllByRole("listitem");
    expect(items.map((li) => within(li).getByText(/^(Café|Té)$/).textContent)).toEqual([
      "Café",
      "Té",
    ]);
    const time = card.querySelector("time")!;
    expect(time.getAttribute("datetime")).toBe(POLL.createdAt);
    expect(time.textContent).toBe("hace 5 minutos");
    expect(within(card).getByText("Anónimo")).toBeDefined();

    // Ninguna cifra real: ni porcentajes, ni recuentos, ni total.
    expect(container.textContent).not.toMatch(/\d\s*%|\bvotos?\b|total/i);
    expect(container.querySelector("[data-bar]")).toBeNull();
  });

  it("cada opción muestra su porcentaje bloqueado hasta votar", () => {
    render(<PollCard poll={POLL} now={NOW} />);

    for (const li of screen.getAllByRole("listitem")) {
      expect(within(li).getByText("?? %")).toBeDefined();
      expect(within(li).getByText("Resultado oculto hasta votar")).toBeDefined();
    }
    expect(screen.getByText("Vota para ver")).toBeDefined();
  });

  it("la pregunta enlaza al detalle /polls/{id}", () => {
    render(<PollCard poll={POLL} now={NOW} />);
    const link = screen.getByRole("link", { name: POLL.question });
    expect(link.getAttribute("href")).toBe(`/polls/${POLL.id}`);
  });
});
