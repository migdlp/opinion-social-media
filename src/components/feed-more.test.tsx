// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

    expect(screen.queryByRole("button", { name: "Cargar más" })).toBeNull();
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
    expect(screen.queryByRole("button", { name: "Cargar más" })).toBeNull();
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
    // Sin votar: opciones para elegir y confirmar (V2-033), sin ninguna cifra.
    expect(within(otherCard).getAllByRole("radio")).toHaveLength(2);
    expect(within(otherCard).queryByText(/\d\s*%/)).toBeNull();
  });
});

// V2-034: scroll infinito con IntersectionObserver y botón alternativo.
class FakeObserver {
  static instances: FakeObserver[] = [];
  static immediate = false;
  observed: Element[] = [];
  disconnected = false;
  constructor(public callback: IntersectionObserverCallback) {
    FakeObserver.instances.push(this);
  }
  observe(element: Element) {
    this.observed.push(element);
    if (FakeObserver.immediate) this.fire(true);
  }
  unobserve() {}
  disconnect() {
    this.disconnected = true;
  }
  takeRecords() {
    return [];
  }
  fire(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}
const live = () => FakeObserver.instances.filter((o) => !o.disconnected);
// Sin observador activo (p. ej. con un error pendiente) no hay nada que dispare la carga.
const intersect = (isIntersecting = true) =>
  act(() => {
    live().at(-1)?.fire(isIntersecting);
  });

describe("FeedMore con scroll infinito", () => {
  beforeEach(() => {
    FakeObserver.instances = [];
    FakeObserver.immediate = false;
    vi.stubGlobal("IntersectionObserver", FakeObserver);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("carga la página siguiente al acercarse al final, con una sola petición en vuelo", async () => {
    let resolve!: (r: Result<FeedPage>) => void;
    const loadMore = vi.fn(() => new Promise<Result<FeedPage>>((r) => (resolve = r)));
    render(<FeedMore cursor="c1" seenIds={["p1"]} loadMore={loadMore} now={NOW} />);

    await intersect();
    await intersect();
    await intersect();
    expect(loadMore).toHaveBeenCalledTimes(1);
    expect(loadMore).toHaveBeenCalledWith("c1");

    await act(async () => resolve(page([poll("p2", "¿Segunda?")], "c2")));
    await screen.findByRole("heading", { name: "¿Segunda?" });
  });

  it("no carga si el final no está a la vista ni si no hay otra página", async () => {
    const loadMore = vi.fn(async () => page([], null));
    const { unmount } = render(<FeedMore cursor="c1" seenIds={[]} loadMore={loadMore} now={NOW} />);
    await intersect(false);
    expect(loadMore).not.toHaveBeenCalled();
    unmount();

    FakeObserver.instances = [];
    render(<FeedMore cursor={null} seenIds={["p1"]} loadMore={loadMore} now={NOW} />);
    expect(FakeObserver.instances.flatMap((o) => o.observed)).toHaveLength(0);
  });

  it("si tras cargar el final sigue a la vista, continúa con la página siguiente", async () => {
    const loadMore = vi
      .fn()
      .mockResolvedValueOnce(page([poll("p2", "¿Segunda?")], "c2"))
      .mockResolvedValueOnce(page([poll("p3", "¿Tercera?")], null));
    render(<FeedMore cursor="c1" seenIds={["p1"]} loadMore={loadMore} now={NOW} />);
    FakeObserver.immediate = true;

    await intersect();
    await screen.findByRole("heading", { name: "¿Tercera?" });
    expect(loadMore.mock.calls).toEqual([["c1"], ["c2"]]);
    expect(screen.getByText("No hay más encuestas")).toBeDefined();
  });

  it("el botón «Cargar más» sigue disponible junto al observador", async () => {
    const loadMore = vi.fn(async () => page([poll("p2", "¿Segunda?")], null));
    render(<FeedMore cursor="c1" seenIds={["p1"]} loadMore={loadMore} now={NOW} />);

    fireEvent.click(button());
    await screen.findByRole("heading", { name: "¿Segunda?" });
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it("sin IntersectionObserver el botón recorre todas las páginas hasta el fin de la lista", async () => {
    vi.unstubAllGlobals();
    const loadMore = vi
      .fn()
      .mockResolvedValueOnce(page([poll("p2", "¿Segunda?")], "c2"))
      .mockResolvedValueOnce(page([poll("p3", "¿Tercera?")], null));
    render(<FeedMore cursor="c1" seenIds={["p1"]} loadMore={loadMore} now={NOW} />);

    fireEvent.click(button());
    await screen.findByRole("heading", { name: "¿Segunda?" });
    fireEvent.click(button());
    await screen.findByRole("heading", { name: "¿Tercera?" });
    expect(screen.getByText("No hay más encuestas")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Cargar más" })).toBeNull();
  });

  it("un fallo conserva las tarjetas, avisa y NO se repite solo aunque el final siga a la vista", async () => {
    const loadMore = vi
      .fn()
      .mockResolvedValueOnce(page([poll("p2", "¿Segunda?")], "c2"))
      .mockResolvedValueOnce({ ok: false, error: "NETWORK_ERROR" } as Result<FeedPage>)
      .mockResolvedValueOnce(page([poll("p3", "¿Tercera?")], null));
    render(<FeedMore cursor="c1" seenIds={["p1"]} loadMore={loadMore} now={NOW} />);

    await intersect();
    await screen.findByRole("heading", { name: "¿Segunda?" });
    await intersect();
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("heading", { name: "¿Segunda?" })).toBeDefined();

    // Con el error activo, más intersecciones no piden nada (sin bucle de peticiones).
    await intersect();
    await intersect();
    expect(loadMore).toHaveBeenCalledTimes(2);

    // El usuario reintenta con el mismo botón.
    fireEvent.click(button());
    await screen.findByRole("heading", { name: "¿Tercera?" });
    expect(loadMore).toHaveBeenCalledTimes(3);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("una promesa rechazada también es un error recuperable, sin bucle", async () => {
    const loadMore = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    render(<FeedMore cursor="c1" seenIds={[]} loadMore={loadMore} now={NOW} />);
    await intersect();
    expect(await screen.findByRole("alert")).toBeDefined();
    await intersect();
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it("si el servidor devuelve el mismo cursor sin novedades, termina en lugar de repetir", async () => {
    const loadMore = vi.fn(async () => page([poll("p1", "¿Ya vista?")], "c1"));
    render(<FeedMore cursor="c1" seenIds={["p1"]} loadMore={loadMore} now={NOW} />);
    FakeObserver.immediate = true;

    await intersect();
    await waitFor(() => expect(screen.getByText("No hay más encuestas")).toBeDefined());
    expect(loadMore).toHaveBeenCalledTimes(1);
  });

  it("anuncia la carga sin mover el foco", async () => {
    let resolve!: (r: Result<FeedPage>) => void;
    const loadMore = vi.fn(() => new Promise<Result<FeedPage>>((r) => (resolve = r)));
    render(
      <>
        <a href="#x">Enlace con foco</a>
        <FeedMore cursor="c1" seenIds={[]} loadMore={loadMore} now={NOW} />
      </>,
    );
    const link = screen.getByRole("link", { name: "Enlace con foco" });
    link.focus();

    await intersect();
    expect(screen.getByRole("status").textContent).toMatch(/Cargando más encuestas/);
    await act(async () => resolve(page([poll("p2", "¿Segunda?"), poll("p3", "¿Tercera?")], null)));
    await screen.findByRole("heading", { name: "¿Tercera?" });
    expect(screen.getByRole("status").textContent).toMatch(/2 encuestas más/);
    expect(document.activeElement).toBe(link);
  });

  it("libera el observador al desmontar", () => {
    const { unmount } = render(<FeedMore cursor="c1" seenIds={[]} loadMore={vi.fn()} now={NOW} />);
    expect(live().length).toBeGreaterThan(0);
    unmount();
    expect(live()).toHaveLength(0);
  });

  it("una respuesta tardía tras desmontar (cambio de selección) no provoca errores", async () => {
    let resolve!: (r: Result<FeedPage>) => void;
    const loadMore = vi.fn(() => new Promise<Result<FeedPage>>((r) => (resolve = r)));
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const { unmount } = render(<FeedMore cursor="c1" seenIds={[]} loadMore={loadMore} now={NOW} />);
    await intersect();
    unmount();
    await act(async () => resolve(page([poll("p2", "¿Tardía?")], null)));
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });
});
