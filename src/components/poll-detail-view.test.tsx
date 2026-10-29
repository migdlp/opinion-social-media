// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PollDetail } from "@/lib/data/types";
import { PollDetailView } from "./poll-detail-view";

const castVote = vi.fn();

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
    const { container } = render(<PollDetailView detail={DETAIL} castVote={castVote} now={NOW} />);

    expect(screen.getByRole("heading", { level: 1, name: DETAIL.poll.question })).toBeDefined();
    expect(screen.getAllByRole("radio").map((r) => r.closest("label")?.textContent)).toEqual([
      "Con cebolla",
      "Sin cebolla",
    ]);
    expect(screen.getByText("Anónimo")).toBeDefined();
    expect(container.querySelector("time")?.textContent).toBe("hace 1 hora");
  });

  it("firma con @usuario enlazado a su perfil", () => {
    const detail = {
      ...DETAIL,
      poll: { ...DETAIL.poll, author: { username: "ana_23", displayName: null } },
    };
    render(<PollDetailView detail={detail} castVote={castVote} now={NOW} />);

    expect(screen.getByRole("link", { name: "@ana_23" }).getAttribute("href")).toBe("/u/ana_23");
    expect(screen.queryByText("Anónimo")).toBeNull();
  });

  it("una cerrada de un visitante muestra los resultados y que ya no admite votos", () => {
    const detail: PollDetail = {
      poll: { ...DETAIL.poll, closesAt: "2026-10-27T18:00:00Z" },
      viewer: {
        kind: "closed",
        signedIn: false,
        results: {
          pollId: DETAIL.poll.id,
          totalVotes: 2,
          myOptionId: null,
          options: [
            { id: "a", text: "Con cebolla", position: 1, votes: 1, percentage: 50 },
            { id: "b", text: "Sin cebolla", position: 2, votes: 1, percentage: 50 },
          ],
        },
      },
    };
    render(<PollDetailView detail={detail} castVote={castVote} now={NOW} />);

    expect(screen.getAllByText("50,0 %")).toHaveLength(2);
    expect(screen.getByText("Cerrada hace 2 h")).toBeDefined();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("muestra la etiqueta de la categoría", () => {
    const detail = {
      ...DETAIL,
      poll: { ...DETAIL.poll, category: { slug: "otros", name: "Otros" } },
    };
    render(<PollDetailView detail={detail} castVote={castVote} now={NOW} />);

    expect(screen.getByText("Otros")).toBeDefined();
  });

  it("ofrece copiar el enlace de la encuesta", () => {
    render(<PollDetailView detail={DETAIL} castVote={castVote} now={NOW} />);

    expect(screen.getByRole("button", { name: "Copiar enlace" })).toBeDefined();
  });

  it("antes de votar no muestra ninguna cifra ni resultado", () => {
    const { container } = render(<PollDetailView detail={DETAIL} castVote={castVote} now={NOW} />);

    expect(container.textContent).not.toMatch(/\d\s*%|\bvotos?\b|total/i);
  });

  it("ofrece el menú «⋯» para denunciar la encuesta", () => {
    render(<PollDetailView detail={DETAIL} castVote={castVote} now={NOW} />);

    expect(screen.getByRole("button", { name: "Más acciones" })).toBeDefined();
  });

  it("muestra el cierre y, abierta, sigue ofreciendo votar", () => {
    const detail = { ...DETAIL, poll: { ...DETAIL.poll, closesAt: "2026-10-28T20:00:00Z" } };
    render(<PollDetailView detail={detail} castVote={castVote} now={NOW} />);

    expect(screen.getByText("Cierra en 1 día")).toBeDefined();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });

  it("una encuesta cerrada no ofrece el selector de voto", () => {
    const detail = { ...DETAIL, poll: { ...DETAIL.poll, closesAt: "2026-10-27T18:00:00Z" } };
    render(<PollDetailView detail={detail} castVote={castVote} now={NOW} />);

    expect(screen.getByText("Cerrada hace 2 h")).toBeDefined();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: /votar/i })).toBeNull();
    expect(screen.getByText(/ya no admite votos/i)).toBeDefined();
  });

  it("V2-022: el detalle ofrece guardar y refleja si la encuesta ya estaba guardada", () => {
    render(
      <PollDetailView
        detail={{ ...DETAIL, viewer: { kind: "not_voted" }, saved: true }}
        castVote={castVote}
        now={NOW}
      />,
    );
    expect(screen.getByRole("button", { name: "Quitar de guardadas" })).toBeDefined();
    cleanup();
    render(<PollDetailView detail={DETAIL} castVote={castVote} now={NOW} />);
    expect(screen.getByRole("link", { name: "Guardar para luego" })).toBeDefined();
  });

  describe("DESIGN-009: camino para seguir explorando", () => {
    const RESULTS = {
      pollId: DETAIL.poll.id,
      totalVotes: 3,
      myOptionId: "a",
      options: [
        { id: "a", text: "Con cebolla", position: 1, votes: 2, percentage: 66.7 },
        { id: "b", text: "Sin cebolla", position: 2, votes: 1, percentage: 33.3 },
      ],
    };
    const CLOSED_AT = "2026-10-27T18:00:00Z";
    const cases: [string, PollDetail][] = [
      ["visitante sin votar", DETAIL],
      ["con sesión sin votar", { ...DETAIL, viewer: { kind: "not_voted" } }],
      ["con voto emitido", { ...DETAIL, viewer: { kind: "voted", results: RESULTS } }],
      [
        "cerrada",
        {
          poll: { ...DETAIL.poll, closesAt: CLOSED_AT },
          viewer: { kind: "closed", signedIn: false, results: RESULTS },
        },
      ],
    ];

    it.each(cases)("%s: hay un enlace «Ver más encuestas» que lleva al feed", (_name, detail) => {
      render(<PollDetailView detail={detail} castVote={castVote} now={NOW} />);

      const link = screen.getByRole("link", { name: "Ver más encuestas" });
      expect(link.getAttribute("href")).toBe("/");
      // Objetivo táctil de al menos 44 px de alto.
      expect(link.className).toMatch(/min-h-11/);
    });

    it("antes de votar el enlace no añade cifras ni nada que dependa de los resultados", () => {
      const { container } = render(
        <PollDetailView
          detail={{ ...DETAIL, viewer: { kind: "not_voted" } }}
          castVote={castVote}
          now={NOW}
        />,
      );

      expect(screen.getByRole("link", { name: "Ver más encuestas" })).toBeDefined();
      expect(container.textContent).not.toMatch(/\d\s?%|\bvotos?\b/i);
    });
  });
});
