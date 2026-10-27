// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { PollResults as PollResultsData } from "@/lib/data/types";
import { PollResults } from "./poll-results";

afterEach(cleanup);

// Mismo ejemplo que docs/contratos-api.md §6.
const RESULTS: PollResultsData = {
  pollId: "p1",
  totalVotes: 3,
  myOptionId: "o2",
  options: [
    { id: "o1", text: "Café", position: 1, votes: 2, percentage: 66.7 },
    { id: "o2", text: "Té", position: 2, votes: 1, percentage: 33.3 },
    { id: "o3", text: "Zumo", position: 3, votes: 0, percentage: 0 },
  ],
};

const item = (text: string) =>
  screen.getAllByRole("listitem").find((li) => within(li).queryByText(text))!;
const bar = (li: HTMLElement) => li.querySelector<HTMLElement>("[data-bar]")!;

describe("PollResults", () => {
  it("muestra todas las opciones con barra, recuento y porcentaje, y el total", () => {
    render(<PollResults results={RESULTS} />);

    const items = screen.getAllByRole("listitem");
    expect(items.map((li) => li.textContent)).toEqual([
      expect.stringContaining("Café"),
      expect.stringContaining("Té"),
      expect.stringContaining("Zumo"),
    ]);
    expect(within(item("Café")).getByText("2 votos")).toBeDefined();
    expect(within(item("Café")).getByText("66,7 %")).toBeDefined();
    expect(bar(item("Café")).style.width).toBe("66.7%");
    expect(within(item("Té")).getByText("1 voto")).toBeDefined();
    expect(within(item("Té")).getByText("33,3 %")).toBeDefined();
    expect(screen.getByText("3 votos en total")).toBeDefined();
  });

  it("señala la opción propia con texto, no sólo con color", () => {
    render(<PollResults results={RESULTS} />);

    expect(within(item("Té")).getByText("Tu voto")).toBeDefined();
    expect(within(item("Café")).queryByText("Tu voto")).toBeNull();
    expect(within(item("Zumo")).queryByText("Tu voto")).toBeNull();
  });

  it("una opción con cero votos muestra 0 y barra vacía, sin NaN", () => {
    const { container } = render(<PollResults results={RESULTS} />);

    expect(within(item("Zumo")).getByText("0 votos")).toBeDefined();
    expect(within(item("Zumo")).getByText("0,0 %")).toBeDefined();
    expect(bar(item("Zumo")).style.width).toBe("0%");
    expect(container.textContent).not.toContain("NaN");
  });
});

describe("PollResults con miles de votos", () => {
  it("separa los miles en recuentos y total", () => {
    render(
      <PollResults
        results={{
          pollId: "p2",
          totalVotes: 1284,
          myOptionId: "a",
          options: [
            { id: "a", text: "Sí", position: 1, votes: 1283, percentage: 99.9 },
            { id: "b", text: "No", position: 2, votes: 1, percentage: 0.1 },
          ],
        }}
      />,
    );
    expect(screen.getByText("1.283 votos")).toBeDefined();
    expect(screen.getByText("1.284 votos en total")).toBeDefined();
  });
});
