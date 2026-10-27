// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FeedPage, PublicPoll, Result } from "@/lib/data/types";
import { FeedList } from "./feed-list";

afterEach(cleanup);

const loadMore = vi.fn();

const NOW = new Date("2026-10-27T20:00:00Z");
const poll = (id: string, question: string, createdAt: string): PublicPoll => ({
  id,
  question,
  createdAt,
  options: [
    { id: `${id}-a`, text: "Sí", position: 1 },
    { id: `${id}-b`, text: "No", position: 2 },
  ],
});
const page = (polls: PublicPoll[]): Result<FeedPage> => ({
  ok: true,
  data: { items: polls.map((p) => ({ poll: p, viewer: { kind: "anonymous" } })), nextCursor: null },
});

describe("FeedList", () => {
  it("pinta una tarjeta por encuesta, en el orden recibido y enlazando a su detalle", () => {
    render(
      <FeedList
        now={NOW}
        page={page([
          poll("p2", "¿La más reciente?", "2026-10-27T19:59:00Z"),
          poll("p1", "¿La más antigua?", "2026-10-27T10:00:00Z"),
        ])}
        loadMore={loadMore}
      />,
    );

    const feed = screen.getByRole("feed", { name: "Encuestas" });
    const cards = within(feed).getAllByRole("article");
    expect(cards.map((c) => within(c).getByRole("heading").textContent)).toEqual([
      "¿La más reciente?",
      "¿La más antigua?",
    ]);
    expect(within(cards[0]).getByRole("link").getAttribute("href")).toBe("/polls/p2");
  });

  it("con otra página, ofrece cargar más dentro del feed", () => {
    const first = page([poll("p1", "¿Primera?", "2026-10-27T19:59:00Z")]);
    if (first.ok) first.data.nextCursor = "c1";
    render(<FeedList now={NOW} page={first} loadMore={loadMore} />);

    const feed = screen.getByRole("feed", { name: "Encuestas" });
    expect(within(feed).getByRole("button", { name: "Cargar más" })).toBeDefined();
  });

  it("sin encuestas, muestra un estado vacío útil", () => {
    render(<FeedList now={NOW} page={page([])} loadMore={loadMore} />);

    expect(screen.getByRole("heading", { name: "Todavía no hay encuestas" })).toBeDefined();
    expect(
      screen.getByRole("link", { name: "Crear la primera encuesta" }).getAttribute("href"),
    ).toBe("/create");
  });

  it("si falla la consulta, avisa con un mensaje comprensible y permite reintentar", () => {
    render(<FeedList now={NOW} page={{ ok: false, error: "NETWORK_ERROR" }} loadMore={loadMore} />);

    const alert = screen.getByRole("alert");
    expect(within(alert).getByText("No se han podido cargar las encuestas")).toBeDefined();
    expect(
      within(alert).getByText("No hay conexión. Comprueba tu red y vuelve a intentarlo."),
    ).toBeDefined();
    expect(within(alert).getByRole("link", { name: "Reintentar" }).getAttribute("href")).toBe("/");
  });
});
