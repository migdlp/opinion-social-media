// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PollResults, PollViewerState, PublicPoll, Result } from "@/lib/data/types";
import { PollVoting } from "./poll-voting";

const POLL: PublicPoll = {
  id: "11111111-2222-4333-8444-555555555555",
  question: "¿Tortilla con o sin cebolla?",
  createdAt: "2026-10-27T19:00:00Z",
  options: [
    { id: "a", text: "Con cebolla", position: 1 },
    { id: "b", text: "Sin cebolla", position: 2 },
  ],
};
const RESULTS: PollResults = {
  pollId: POLL.id,
  totalVotes: 4,
  myOptionId: "a",
  options: [
    { id: "a", text: "Con cebolla", position: 1, votes: 3, percentage: 75 },
    { id: "b", text: "Sin cebolla", position: 2, votes: 1, percentage: 25 },
  ],
};

let castVote: ReturnType<
  typeof vi.fn<(pollId: string, optionId: string) => Promise<Result<PollResults>>>
>;
let loadOwnVote: ReturnType<typeof vi.fn<(pollId: string) => Promise<Result<PollResults | null>>>>;
const view = (viewer: PollViewerState) =>
  render(<PollVoting poll={POLL} viewer={viewer} castVote={castVote} loadOwnVote={loadOwnVote} />);
const pick = (name: string) => userEvent.click(screen.getByRole("radio", { name }));
const vote = () => userEvent.click(screen.getByRole("button", { name: "Votar" }));

beforeEach(() => {
  castVote = vi.fn(async () => ({ ok: true, data: RESULTS }));
  loadOwnVote = vi.fn(async () => ({ ok: true, data: null }));
});
afterEach(cleanup);

describe("PollVoting", () => {
  it("antes de votar ofrece las opciones sin ninguna cifra y «Votar» desactivado", () => {
    const { container } = view({ kind: "not_voted" });

    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect((screen.getByRole("button", { name: "Votar" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
    expect(container.textContent).not.toMatch(/\d\s*%|\bvotos?\b/i);
  });

  it("al confirmar envía sólo esa opción y pasa a mostrar los resultados", async () => {
    view({ kind: "not_voted" });

    await pick("Con cebolla");
    await vote();

    expect(castVote).toHaveBeenCalledOnce();
    expect(castVote).toHaveBeenCalledWith(POLL.id, "a");
    expect(await screen.findByText("Tu voto")).toBeDefined();
    expect(screen.getByText(/75,0\s*%/)).toBeDefined();
    expect(screen.queryByRole("button", { name: "Votar" })).toBeNull();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("mientras se envía bloquea el formulario y dos clics rápidos envían un solo voto", async () => {
    let resolve!: (r: Result<PollResults>) => void;
    castVote.mockImplementation(() => new Promise((r) => (resolve = r)));
    view({ kind: "not_voted" });
    await pick("Con cebolla");

    const button = screen.getByRole("button", { name: "Votar" });
    await userEvent.dblClick(button);

    expect(castVote).toHaveBeenCalledOnce();
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getAllByRole("radio").every((r) => r.matches(":disabled"))).toBe(true);

    resolve({ ok: true, data: RESULTS });
    expect(await screen.findByText("Tu voto")).toBeDefined();
  });

  it("un visitante que confirma recibe la petición de iniciar sesión y no se emite ningún voto", async () => {
    view({ kind: "anonymous" });

    await pick("Sin cebolla");
    await vote();

    expect(castVote).not.toHaveBeenCalled();
    const link = screen.getByRole("link", { name: "Iniciar sesión" });
    expect(link.getAttribute("href")).toBe(
      `/login?next=${encodeURIComponent(`/polls/${POLL.id}`)}`,
    );
    expect(screen.queryByText("Tu voto")).toBeNull();
  });

  it("si la sesión caducó (AUTH_REQUIRED) ofrece iniciar sesión sin error técnico", async () => {
    castVote.mockResolvedValue({ ok: false, error: "AUTH_REQUIRED" });
    view({ kind: "not_voted" });

    await pick("Con cebolla");
    await vote();

    expect(await screen.findByRole("link", { name: "Iniciar sesión" })).toBeDefined();
  });

  it("si falla la red avisa, mantiene la elección y permite reintentar", async () => {
    castVote.mockResolvedValueOnce({ ok: false, error: "NETWORK_ERROR" });
    view({ kind: "not_voted" });

    await pick("Con cebolla");
    await vote();

    expect((await screen.findByRole("alert")).textContent).toMatch(/No hay conexión/);
    expect((screen.getByRole("radio", { name: "Con cebolla" }) as HTMLInputElement).checked).toBe(
      true,
    );
    await waitFor(() =>
      expect((screen.getByRole("button", { name: "Votar" }) as HTMLButtonElement).disabled).toBe(
        false,
      ),
    );

    await vote();

    expect(castVote).toHaveBeenCalledTimes(2);
    expect(await screen.findByText("Tu voto")).toBeDefined();
  });

  it("si la llamada al servidor se rechaza también avisa de la red", async () => {
    castVote.mockRejectedValueOnce(new TypeError("fetch failed"));
    view({ kind: "not_voted" });

    await pick("Con cebolla");
    await vote();

    expect((await screen.findByRole("alert")).textContent).toMatch(/No hay conexión/);
  });

  it("anima las barras sólo justo después de votar, no con resultados ya conocidos", async () => {
    const { container, unmount } = view({ kind: "not_voted" });
    await pick("Con cebolla");
    await vote();
    await screen.findByText(/en total/);
    expect(container.querySelectorAll(".reveal-bar")).toHaveLength(2);
    unmount();

    const reloaded = view({ kind: "voted", results: RESULTS });
    expect(reloaded.container.querySelector(".reveal-bar")).toBeNull();
  });

  it("quien ya había votado ve los resultados directamente, sin formulario", () => {
    view({ kind: "voted", results: RESULTS });

    expect(screen.getByText("Tu voto")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Votar" })).toBeNull();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(castVote).not.toHaveBeenCalled();
  });

  describe("tras una caída de red (MVP-040)", () => {
    const failOnce = async () => {
      castVote.mockResolvedValueOnce({ ok: false, error: "NETWORK_ERROR" });
      view({ kind: "not_voted" });
      await pick("Con cebolla");
      await vote();
      await screen.findByRole("alert");
    };

    it("antes de reintentar consulta el estado del servidor: si el voto entró, muestra resultados sin votar otra vez", async () => {
      loadOwnVote.mockResolvedValue({ ok: true, data: RESULTS });
      await failOnce();

      await vote();

      expect(loadOwnVote).toHaveBeenCalledWith(POLL.id);
      expect(await screen.findByText("Tu voto")).toBeDefined();
      expect(castVote).toHaveBeenCalledOnce();
    });

    it("si el voto no entró, reintenta el envío", async () => {
      await failOnce();

      await vote();

      expect(loadOwnVote).toHaveBeenCalledOnce();
      expect(castVote).toHaveBeenCalledTimes(2);
      expect(await screen.findByText("Tu voto")).toBeDefined();
    });

    it("si aún no hay conexión para consultarlo, no envía y avisa", async () => {
      loadOwnVote.mockResolvedValue({ ok: false, error: "NETWORK_ERROR" });
      await failOnce();

      await vote();

      expect(castVote).toHaveBeenCalledOnce();
      expect((await screen.findByRole("alert")).textContent).toMatch(/No hay conexión/);
    });
  });
});
