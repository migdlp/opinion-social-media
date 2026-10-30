// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PollResults, PollViewerState, PublicPoll, Result } from "@/lib/data/types";
import { PollVoting, VOTED_EVENT } from "./poll-voting";

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
const vote = () => userEvent.click(screen.getByRole("button", { name: "Votar y descubrir" }));

beforeEach(() => {
  castVote = vi.fn(async () => ({ ok: true, data: RESULTS }));
  loadOwnVote = vi.fn(async () => ({ ok: true, data: null }));
});
afterEach(cleanup);

describe("PollVoting", () => {
  it("antes de votar ofrece las opciones sin ninguna cifra y «Votar» desactivado", () => {
    const { container } = view({ kind: "not_voted" });

    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(
      (screen.getByRole("button", { name: "Votar y descubrir" }) as HTMLButtonElement).disabled,
    ).toBe(true);
    expect(container.textContent).not.toMatch(/\d\s*%|\b\d[\d.,]*\s+votos?\b|en total/i);
  });

  it("al confirmar envía sólo esa opción y pasa a mostrar los resultados", async () => {
    view({ kind: "not_voted" });

    await pick("Con cebolla");
    await vote();

    expect(castVote).toHaveBeenCalledOnce();
    expect(castVote).toHaveBeenCalledWith(POLL.id, "a");
    expect(await screen.findByText("Tu voto")).toBeDefined();
    expect(screen.getByText("75,0 %")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Votar y descubrir" })).toBeNull();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
  });

  it("mientras se envía bloquea el formulario y dos clics rápidos envían un solo voto", async () => {
    let resolve!: (r: Result<PollResults>) => void;
    castVote.mockImplementation(() => new Promise((r) => (resolve = r)));
    view({ kind: "not_voted" });
    await pick("Con cebolla");

    const button = screen.getByRole("button", { name: "Votar y descubrir" });
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
    // Vuelve a la encuesta con la opción elegida marcada, pero sin votarla (V2-033).
    expect(link.getAttribute("href")).toBe(
      `/login?next=${encodeURIComponent(`/polls/${POLL.id}?elige=b`)}`,
    );
    expect(screen.queryByText("Tu voto")).toBeNull();
  });

  it("initialSelected marca la opción al volver del login pero no emite ningún voto", () => {
    render(
      <PollVoting
        poll={POLL}
        viewer={{ kind: "not_voted" }}
        castVote={castVote}
        loadOwnVote={loadOwnVote}
        initialSelected="b"
      />,
    );
    expect((screen.getByRole("radio", { name: "Sin cebolla" }) as HTMLInputElement).checked).toBe(
      true,
    );
    expect(castVote).not.toHaveBeenCalled();
    expect(
      (screen.getByRole("button", { name: "Votar y descubrir" }) as HTMLButtonElement).disabled,
    ).toBe(false);
  });

  it("initialSelected con una opción que no existe se ignora", () => {
    render(
      <PollVoting
        poll={POLL}
        viewer={{ kind: "not_voted" }}
        castVote={castVote}
        loadOwnVote={loadOwnVote}
        initialSelected="zzz"
      />,
    );
    expect(screen.getAllByRole("radio").every((r) => !(r as HTMLInputElement).checked)).toBe(true);
  });

  it("V2-052: la elección sólo viaja en la URL de retorno; no se escribe en localStorage ni sessionStorage", async () => {
    const local = vi.spyOn(Storage.prototype, "setItem");
    view({ kind: "anonymous" });

    await pick("Sin cebolla");
    await vote();

    expect(screen.getByRole("link", { name: "Iniciar sesión" })).toBeDefined();
    expect(local).not.toHaveBeenCalled();
    local.mockRestore();
  });

  it("si la sesión caducó (AUTH_REQUIRED) ofrece iniciar sesión sin error técnico", async () => {
    castVote.mockResolvedValue({ ok: false, error: "AUTH_REQUIRED" });
    view({ kind: "not_voted" });

    await pick("Con cebolla");
    await vote();

    expect(await screen.findByRole("link", { name: "Iniciar sesión" })).toBeDefined();
  });

  it("sin @usuario (PROFILE_REQUIRED) ofrece elegirlo y volver a la encuesta, sin voto", async () => {
    castVote.mockResolvedValue({ ok: false, error: "PROFILE_REQUIRED" });
    view({ kind: "not_voted" });

    await pick("Con cebolla");
    await vote();

    const link = await screen.findByRole("link", { name: "Elegir mi usuario" });
    expect(link.getAttribute("href")).toBe(
      `/onboarding?next=${encodeURIComponent(`/polls/${POLL.id}?elige=a`)}`,
    );
    expect(screen.queryByText("Tu voto")).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
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
      expect(
        (screen.getByRole("button", { name: "Votar y descubrir" }) as HTMLButtonElement).disabled,
      ).toBe(false),
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

  it("tras votar anuncia con cuántas personas coincide", async () => {
    view({ kind: "not_voted" });
    await pick("Con cebolla");
    await vote();

    expect((await screen.findByText(/Coincides con el 75,0 %/)).textContent).toBe(
      "Coincides con el 75,0 % (3 personas)",
    );
  });

  it("una cerrada muestra los resultados públicos sin formulario ni mensaje de coincidencia", () => {
    const closed = { ...RESULTS, myOptionId: null };
    render(
      <PollVoting
        poll={POLL}
        viewer={{ kind: "closed", results: closed, signedIn: false }}
        castVote={castVote}
        closed
      />,
    );

    expect(screen.getByText("75,0 %")).toBeDefined();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Votar y descubrir" })).toBeNull();
    expect(screen.queryByText("Tu voto")).toBeNull();
    expect(screen.queryByText(/Coincides|primero en votar/)).toBeNull();
  });

  it("quien ya había votado ve los resultados directamente, sin formulario", () => {
    view({ kind: "voted", results: RESULTS });

    expect(screen.getByText("Tu voto")).toBeDefined();
    expect(screen.queryByRole("button", { name: "Votar y descubrir" })).toBeNull();
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

describe("PollVoting: evento de voto (CMT-002)", () => {
  const listen = () => {
    const seen: string[] = [];
    const handler = (event: Event) => seen.push((event as CustomEvent).detail.pollId);
    window.addEventListener(VOTED_EVENT, handler);
    return { seen, stop: () => window.removeEventListener(VOTED_EVENT, handler) };
  };

  it("avisa a la ventana tras un voto correcto para que el detalle refresque el debate", async () => {
    const { seen, stop } = listen();
    view({ kind: "not_voted" });
    await pick("Con cebolla");
    await vote();
    await waitFor(() => expect(seen).toEqual([POLL.id]));
    stop();
  });

  it("no avisa si el voto falla", async () => {
    castVote = vi.fn(async () => ({ ok: false, error: "UNKNOWN" }));
    const { seen, stop } = listen();
    view({ kind: "not_voted" });
    await pick("Con cebolla");
    await vote();
    await screen.findByRole("alert");
    expect(seen).toEqual([]);
    stop();
  });
});
