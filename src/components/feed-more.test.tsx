// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FeedPage, PublicPoll, Result } from "@/lib/data/types";
import { FeedMore } from "./feed-more";

afterEach(cleanup);

const NOW = new Date("2026-10-27T20:00:00Z");
const poll = (id: string, question: string): PublicPoll => ({
  id,
  question,
  createdAt: "2026-10-27T10:00:00Z",
  options: [
    { id: `${id}-a`, text: "Sí", position: 1 },
    { id: `${id}-b`, text: "No", position: 2 },
  ],
});
const page = (polls: PublicPoll[], nextCursor: string | null): Result<FeedPage> => ({
  ok: true,
  data: { items: polls.map((p) => ({ poll: p, viewer: { kind: "anonymous" } })), nextCursor },
});
const button = () => screen.getByRole("button", { name: "Cargar más" });

describe("FeedMore", () => {
  it("sin otra página no ofrece cargar más", () => {
    render(<FeedMore cursor={null} seenIds={["p1"]} loadMore={vi.fn()} now={NOW} />);

    expect(screen.queryByRole("button")).toBeNull();
  });

  it("añade la página siguiente sin repetir tarjetas ya vistas y se oculta al final", async () => {
    const loadMore = vi.fn(async () =>
      page([poll("p1", "¿Ya vista?"), poll("p3", "¿Nueva?")], null),
    );
    render(<FeedMore cursor="c1" seenIds={["p1", "p2"]} loadMore={loadMore} now={NOW} />);

    fireEvent.click(button());

    await screen.findByRole("heading", { name: "¿Nueva?" });
    expect(loadMore).toHaveBeenCalledWith("c1");
    expect(screen.queryByRole("heading", { name: "¿Ya vista?" })).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("No hay más encuestas")).toBeDefined();
  });

  it("pide cada página con el cursor de la anterior", async () => {
    const loadMore = vi
      .fn()
      .mockResolvedValueOnce(page([poll("p3", "¿Tercera?")], "c2"))
      .mockResolvedValueOnce(page([poll("p4", "¿Cuarta?")], null));
    render(<FeedMore cursor="c1" seenIds={["p1"]} loadMore={loadMore} now={NOW} />);

    fireEvent.click(button());
    await screen.findByRole("heading", { name: "¿Tercera?" });
    fireEvent.click(button());
    await screen.findByRole("heading", { name: "¿Cuarta?" });

    expect(loadMore.mock.calls).toEqual([["c1"], ["c2"]]);
  });

  it("mientras carga, el control está deshabilitado y no lanza otra petición", async () => {
    let resolve: (r: Result<FeedPage>) => void = () => {};
    const loadMore = vi.fn(() => new Promise<Result<FeedPage>>((r) => (resolve = r)));
    render(<FeedMore cursor="c1" seenIds={[]} loadMore={loadMore} now={NOW} />);

    fireEvent.click(button());
    const busy = await screen.findByRole("button", { name: "Cargando…" });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(busy);
    expect(loadMore).toHaveBeenCalledTimes(1);

    resolve(page([poll("p3", "¿Nueva?")], "c2"));
    await waitFor(() => expect((button() as HTMLButtonElement).disabled).toBe(false));
  });

  it("si la petición no llega al servidor, avisa de la red y no deja el control bloqueado", async () => {
    const loadMore = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch"));
    render(<FeedMore cursor="c1" seenIds={[]} loadMore={loadMore} now={NOW} />);

    fireEvent.click(button());

    const alert = await screen.findByRole("alert");
    expect(
      within(alert).getByText("No hay conexión. Comprueba tu red y vuelve a intentarlo."),
    ).toBeDefined();
    expect((button() as HTMLButtonElement).disabled).toBe(false);
  });

  it("si falla, avisa y permite reintentar con el mismo cursor", async () => {
    const loadMore = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: "NETWORK_ERROR" })
      .mockResolvedValueOnce(page([poll("p3", "¿Nueva?")], null));
    render(<FeedMore cursor="c1" seenIds={[]} loadMore={loadMore} now={NOW} />);

    fireEvent.click(button());
    const alert = await screen.findByRole("alert");
    expect(
      within(alert).getByText("No hay conexión. Comprueba tu red y vuelve a intentarlo."),
    ).toBeDefined();

    fireEvent.click(button());
    await screen.findByRole("heading", { name: "¿Nueva?" });
    expect(loadMore.mock.calls).toEqual([["c1"], ["c1"]]);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("las tarjetas votadas de páginas siguientes muestran sus resultados", async () => {
    const voted = poll("p9", "¿Votada?");
    const loadMore = vi.fn(async (): Promise<Result<FeedPage>> => ({
      ok: true,
      data: {
        items: [
          {
            poll: voted,
            viewer: {
              kind: "voted",
              results: {
                pollId: "p9",
                totalVotes: 2,
                myOptionId: "p9-a",
                options: [
                  { id: "p9-a", text: "Sí", position: 1, votes: 1, percentage: 50 },
                  { id: "p9-b", text: "No", position: 2, votes: 1, percentage: 50 },
                ],
              },
            },
          },
          { poll: poll("p10", "¿Sin votar?"), viewer: { kind: "not_voted" } },
        ],
        nextCursor: null,
      },
    }));
    render(<FeedMore cursor="c1" seenIds={[]} loadMore={loadMore} now={NOW} />);

    fireEvent.click(button());

    const votedCard = (await screen.findByRole("heading", { name: "¿Votada?" })).closest(
      "article",
    )!;
    expect(within(votedCard).getByText("Tu voto")).toBeDefined();
    const otherCard = screen.getByRole("heading", { name: "¿Sin votar?" }).closest("article")!;
    expect(within(otherCard).queryByText("Tu voto")).toBeNull();
    expect(within(otherCard).getAllByText("?? %")).toHaveLength(2);
  });
});
