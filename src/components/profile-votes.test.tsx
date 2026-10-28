// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProfileVote, Result } from "@/lib/data/types";
import { ProfileVotes } from "./profile-votes";

afterEach(cleanup);

const NOW = new Date("2026-10-28T12:00:00Z");
const vote = (n: number, over: Partial<ProfileVote> = {}): ProfileVote => ({
  pollId: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  question: `¿Pregunta número ${n}?`,
  pollCreatedAt: "2026-10-27T10:00:00Z",
  closesAt: null,
  author: { username: "ana_23", displayName: null },
  votedAt: "2026-10-28T10:00:00Z",
  choice: { optionId: `o${n}`, text: "Café" },
  ...over,
});
type Load = (
  cursor: string,
) => Promise<Result<{ votes: ProfileVote[]; nextCursor: string | null }>>;
const setup = (votes: ProfileVote[], nextCursor: string | null = null, loadMore?: Load) =>
  render(
    <ProfileVotes
      username="perfil_b"
      initialVotes={votes}
      initialCursor={nextCursor}
      loadMore={
        loadMore ?? vi.fn<Load>(async () => ({ ok: true, data: { votes: [], nextCursor: null } }))
      }
      now={NOW}
    />,
  );

describe("ProfileVotes (pestaña «Votadas»)", () => {
  it("muestra cada voto con la pregunta enlazada, el autor y la opción elegida", () => {
    setup([vote(1)]);

    const item = screen.getByRole("listitem");
    expect(
      within(item).getByRole("link", { name: "¿Pregunta número 1?" }).getAttribute("href"),
    ).toBe("/polls/00000000-0000-4000-8000-000000000001");
    expect(within(item).getByText("Votó: Café")).toBeDefined();
    expect(within(item).getByText("@ana_23")).toBeDefined();
    expect(within(item).getByText("hace 2 horas")).toBeDefined();
  });

  it("P-1: si la opción está oculta lo dice y no muestra ninguna opción ni cifra", () => {
    setup([vote(1, { choice: null })]);

    expect(screen.getByText("Votó · vota para ver su elección")).toBeDefined();
    expect(screen.getByRole("listitem").textContent).not.toMatch(/Café|\d\s*%|\d+ votos?/);
  });

  it("sin autor con perfil: «Anónimo»", () => {
    setup([vote(1, { author: null })]);
    expect(screen.getByText("Anónimo")).toBeDefined();
  });

  it("sin votos visibles explica que no hay nada que mostrar", () => {
    setup([]);
    expect(screen.getByText("Todavía no hay votos que mostrar.")).toBeDefined();
  });

  it("«Cargar más» añade la siguiente página sin repetir y se retira al final", async () => {
    const loadMore = vi.fn<Load>(async () => ({
      ok: true,
      data: { votes: [vote(1), vote(2)], nextCursor: null },
    }));
    setup([vote(1)], "c1", loadMore);

    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));

    expect(loadMore).toHaveBeenCalledWith("c1");
    expect(await screen.findByText("¿Pregunta número 2?")).toBeDefined();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Cargar más" })).toBeNull();
  });

  it("si falla avisa y permite reintentar", async () => {
    const loadMore = vi
      .fn<Load>()
      .mockResolvedValueOnce({ ok: false, error: "NETWORK_ERROR" })
      .mockResolvedValueOnce({ ok: true, data: { votes: [vote(2)], nextCursor: null } });
    setup([vote(1)], "c1", loadMore);

    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));
    expect((await screen.findByRole("alert")).textContent).toContain("No hay conexión");
    await userEvent.click(screen.getByRole("button", { name: "Cargar más" }));
    expect(await screen.findByText("¿Pregunta número 2?")).toBeDefined();
  });
});
