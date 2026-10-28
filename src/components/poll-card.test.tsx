// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PollResults, PublicPoll, Result } from "@/lib/data/types";

const castVote = vi.fn<(pollId: string, optionId: string) => Promise<Result<PollResults>>>();
const loadOwnVote = vi.fn<(pollId: string) => Promise<Result<PollResults | null>>>();
vi.mock("@/app/vote-actions", () => ({ castVote, loadOwnVote }));

const { PollCard } = await import("./poll-card");

beforeEach(() => {
  castVote.mockReset();
  loadOwnVote.mockReset();
});
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

const RESULTS_VOTED: PollResults = {
  pollId: "11111111-2222-3333-4444-555555555555",
  totalVotes: 4,
  myOptionId: "o2",
  options: [
    { id: "o1", text: "Café", position: 1, votes: 3, percentage: 75 },
    { id: "o2", text: "Té", position: 2, votes: 1, percentage: 25 },
  ],
};

const CLOSED_RESULTS: PollResults = {
  pollId: "11111111-2222-3333-4444-555555555555",
  totalVotes: 4,
  myOptionId: null,
  options: [
    { id: "o1", text: "Café", position: 1, votes: 3, percentage: 75 },
    { id: "o2", text: "Té", position: 2, votes: 1, percentage: 25 },
  ],
};

describe("PollCard", () => {
  it("muestra pregunta, opciones, fecha y autor genérico, sin datos agregados", () => {
    const { container } = render(<PollCard poll={POLL} now={NOW} />);

    const card = screen.getByRole("article");
    expect(within(card).getByRole("heading", { name: POLL.question })).toBeDefined();
    expect(
      within(card)
        .getAllByRole("radio")
        .map((r) => r.closest("label")?.textContent),
    ).toEqual(["Café", "Té"]);
    const time = card.querySelector("time")!;
    expect(time.getAttribute("datetime")).toBe(POLL.createdAt);
    expect(time.textContent).toBe("hace 5 minutos");
    expect(within(card).getByText("Anónimo")).toBeDefined();

    // Ninguna cifra real: ni porcentajes, ni recuentos, ni total.
    expect(container.textContent).not.toMatch(/\d\s*%|\bvotos?\b|total/i);
    expect(container.querySelector("[data-bar]")).toBeNull();
  });

  it("V2-033: antes de votar ofrece elegir y confirmar en la propia tarjeta, sin cifras", () => {
    const { container } = render(<PollCard poll={POLL} viewer={{ kind: "not_voted" }} now={NOW} />);

    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect((screen.getByRole("button", { name: "Votar" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(container.textContent).not.toMatch(/\d\s*%|\?\?\s*%|\bvotos?\b|total/i);
    expect(container.querySelector("[data-bar]")).toBeNull();
  });

  it("V2-033: al elegir y confirmar vota y esa tarjeta pasa a mostrar los resultados", async () => {
    castVote.mockResolvedValue({
      ok: true,
      data: { ...RESULTS_VOTED, myOptionId: "o2" },
    });
    render(<PollCard poll={POLL} viewer={{ kind: "not_voted" }} now={NOW} />);

    await userEvent.click(screen.getByRole("radio", { name: "Té" }));
    await userEvent.click(screen.getByRole("button", { name: "Votar" }));

    expect(castVote).toHaveBeenCalledOnce();
    expect(castVote).toHaveBeenCalledWith(POLL.id, "o2");
    expect(await screen.findByText("Tu voto")).toBeDefined();
    expect(screen.getAllByText(/75,0\s*%/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Votar" })).toBeNull();
  });

  it("V2-033: un visitante que confirma va al login con la encuesta y la opción, sin voto", async () => {
    render(<PollCard poll={POLL} viewer={{ kind: "anonymous" }} now={NOW} />);

    await userEvent.click(screen.getByRole("radio", { name: "Café" }));
    await userEvent.click(screen.getByRole("button", { name: "Votar" }));

    expect(castVote).not.toHaveBeenCalled();
    expect(screen.getByRole("link", { name: "Iniciar sesión" }).getAttribute("href")).toBe(
      `/login?next=${encodeURIComponent(`/polls/${POLL.id}?elige=o1`)}`,
    );
  });

  it("V2-033: los controles de voto no están dentro de ningún enlace", () => {
    const { container } = render(<PollCard poll={POLL} viewer={{ kind: "not_voted" }} now={NOW} />);
    expect(container.querySelectorAll("a input, a button, a label")).toHaveLength(0);
    // Y quedan por encima del enlace que cubre la tarjeta.
    expect(container.querySelector("form")?.closest("[class*='z-10']")).not.toBeNull();
  });

  it("V2-033: una cerrada no admite voto y muestra los resultados desde la carga", () => {
    const closed = { ...POLL, closesAt: "2026-10-27T18:00:00Z" };
    render(
      <PollCard
        poll={closed}
        viewer={{ kind: "closed", results: CLOSED_RESULTS, signedIn: true }}
        now={NOW}
      />,
    );
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByRole("button", { name: "Votar" })).toBeNull();
    expect(screen.getByText(/75,0\s*%/)).toBeDefined();
  });

  it("la pregunta enlaza al detalle /polls/{id}", () => {
    render(<PollCard poll={POLL} now={NOW} />);
    const link = screen.getByRole("link", { name: POLL.question });
    expect(link.getAttribute("href")).toBe(`/polls/${POLL.id}`);
  });

  describe("con voto propio", () => {
    const RESULTS: PollResults = {
      pollId: POLL.id,
      totalVotes: 4,
      myOptionId: "o1",
      options: [
        { id: "o1", text: "Café", position: 1, votes: 3, percentage: 75 },
        { id: "o2", text: "Té", position: 2, votes: 1, percentage: 25 },
      ],
    };

    it("muestra los resultados en lugar de las cifras bloqueadas y marca su voto", () => {
      render(<PollCard poll={POLL} viewer={{ kind: "voted", results: RESULTS }} now={NOW} />);

      expect(screen.getAllByText(/75,0\s*%/).length).toBeGreaterThan(0);
      expect(screen.getByText("Tu voto")).toBeDefined();
      expect(screen.queryByText("?? %")).toBeNull();
    });

    it("sigue llevando al detalle de la encuesta", () => {
      render(<PollCard poll={POLL} viewer={{ kind: "voted", results: RESULTS }} now={NOW} />);

      expect(screen.getByRole("link", { name: POLL.question }).getAttribute("href")).toBe(
        `/polls/${POLL.id}`,
      );
    });
  });

  it.each([{ kind: "anonymous" as const }, { kind: "not_voted" as const }])(
    "con estado %j sigue sin cifras",
    (viewer) => {
      const { container } = render(<PollCard poll={POLL} viewer={viewer} now={NOW} />);

      expect(container.textContent).not.toMatch(/\d\s*%|\bvotos?\b|total/i);
      expect(screen.queryByText("?? %")).toBeNull();
    },
  );

  it("ofrece el menú «⋯» para denunciar, a visitantes y a usuarios con sesión", () => {
    render(<PollCard poll={POLL} viewer={{ kind: "anonymous" }} now={NOW} />);
    expect(screen.getByRole("button", { name: "Más acciones" })).toBeDefined();
  });

  it("con cierre muestra el tiempo restante y, cerrada, cuánto hace que cerró", () => {
    const open = { ...POLL, closesAt: "2026-10-27T23:10:00Z" };
    const { unmount } = render(<PollCard poll={open} now={NOW} />);
    expect(screen.getByText("Cierra en 3 h")).toBeDefined();
    unmount();

    const closed = { ...POLL, closesAt: "2026-10-27T18:00:00Z" };
    render(<PollCard poll={closed} now={NOW} />);
    expect(screen.getByText("Cerrada hace 2 h")).toBeDefined();
  });

  it("firma con @usuario y nombre visible, enlazado a su perfil", () => {
    const poll = { ...POLL, author: { username: "ana_23", displayName: "Ana María" } };
    render(<PollCard poll={poll} now={NOW} />);

    const link = screen.getByRole("link", { name: "@ana_23" });
    expect(link.getAttribute("href")).toBe("/u/ana_23");
    expect(screen.getByText("Ana María")).toBeDefined();
    expect(screen.queryByText("Anónimo")).toBeNull();
  });

  it("sin autor con perfil muestra «Anónimo» sin enlace", () => {
    render(<PollCard poll={{ ...POLL, author: null }} now={NOW} />);

    expect(screen.getByText("Anónimo")).toBeDefined();
    expect(screen.queryByRole("link", { name: /^@/ })).toBeNull();
  });

  it("una cerrada muestra resultados públicos aunque no se haya votado, sin «Tu voto»", () => {
    const poll = { ...POLL, closesAt: "2026-10-27T18:00:00Z" };
    render(
      <PollCard
        poll={poll}
        viewer={{ kind: "closed", results: CLOSED_RESULTS, signedIn: false }}
        now={NOW}
      />,
    );

    expect(screen.getByText("75,0 %")).toBeDefined();
    expect(screen.getByText("4 votos en total")).toBeDefined();
    expect(screen.queryByText("Tu voto")).toBeNull();
    expect(screen.queryByText("?? %")).toBeNull();
  });

  it("una abierta sin voto sigue sin cifras", () => {
    const poll = { ...POLL, closesAt: "2026-10-28T18:00:00Z" };
    const { container } = render(<PollCard poll={poll} viewer={{ kind: "not_voted" }} now={NOW} />);

    expect(container.textContent).not.toMatch(/\d\s*%|\bvotos?\b|total/i);
    expect(screen.getByRole("button", { name: "Votar" })).toBeDefined();
  });

  it("muestra la etiqueta de la categoría, y ninguna si no tiene", () => {
    const { unmount } = render(
      <PollCard poll={{ ...POLL, category: { slug: "deportes", name: "Deportes" } }} now={NOW} />,
    );
    expect(screen.getByText("Deportes")).toBeDefined();
    unmount();

    render(<PollCard poll={{ ...POLL, category: null }} now={NOW} />);
    expect(screen.queryByText("Deportes")).toBeNull();
    expect(document.querySelector("[data-category]")).toBeNull();
  });

  it("sin cierre no muestra ninguna indicación de cierre", () => {
    render(<PollCard poll={POLL} now={NOW} />);
    expect(screen.queryByText(/Cierra|Cerrada/)).toBeNull();
  });

  it("V2-022: ofrece guardar; con sesión refleja si ya estaba guardada y un visitante va al login", () => {
    render(<PollCard poll={POLL} viewer={{ kind: "not_voted" }} saved={false} now={NOW} />);
    expect(screen.getByRole("button", { name: "Guardar para luego" })).toBeDefined();
    cleanup();
    render(<PollCard poll={POLL} viewer={{ kind: "not_voted" }} saved now={NOW} />);
    expect(screen.getByRole("button", { name: "Quitar de guardadas" })).toBeDefined();
    cleanup();
    render(<PollCard poll={POLL} viewer={{ kind: "anonymous" }} now={NOW} />);
    expect(screen.getByRole("link", { name: "Guardar para luego" }).getAttribute("href")).toBe(
      `/login?next=${encodeURIComponent(`/polls/${POLL.id}`)}`,
    );
  });
});
