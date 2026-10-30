// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Result } from "@/lib/data/types";
import { CommentsToggle } from "./comments-toggle";

afterEach(cleanup);

const setup = (
  enabled: boolean,
  set = vi.fn(async (): Promise<Result<void>> => ({ ok: true, data: undefined })),
) => {
  const onChanged = vi.fn();
  render(<CommentsToggle pollId="p1" enabled={enabled} setComments={set} onChanged={onChanged} />);
  return { set, onChanged };
};
const box = () => screen.getByRole("checkbox", { name: "Comentarios" }) as HTMLInputElement;

describe("CommentsToggle (CMT-002)", () => {
  it("refleja el estado actual y explica que apagar conserva los comentarios", () => {
    setup(true);
    expect(box().checked).toBe(true);
    expect(screen.getByText(/no borra los comentarios/i)).toBeDefined();
  });

  it("activar llama a la acción con true y avisa para refrescar", async () => {
    const { set, onChanged } = setup(false);
    await userEvent.click(box());
    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
    expect(set).toHaveBeenCalledWith("p1", true);
  });

  it("apagar llama con false", async () => {
    const { set } = setup(true);
    await userEvent.click(box());
    await waitFor(() => expect(set).toHaveBeenCalledWith("p1", false));
  });

  it("un error devuelve el interruptor a su estado y lo explica", async () => {
    const set = vi.fn(async (): Promise<Result<void>> => ({
      ok: false,
      error: "POLL_UNAVAILABLE",
    }));
    const { onChanged } = setup(false, set);
    await userEvent.click(box());
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(box().checked).toBe(false);
    expect(onChanged).not.toHaveBeenCalled();
  });

  it("se maneja con el teclado (Espacio)", async () => {
    const { set } = setup(false);
    box().focus();
    await userEvent.keyboard(" ");
    await waitFor(() => expect(set).toHaveBeenCalledOnce());
  });
});
