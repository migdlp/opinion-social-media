// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PollCreationForm } from "./poll-creation-form";

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

const optionInputs = () => screen.getAllByRole("textbox", { name: /^Opción \d$/ });

async function fill(user: ReturnType<typeof userEvent.setup>, question: string, options: string[]) {
  await user.type(screen.getByRole("textbox", { name: "Pregunta" }), question);
  const inputs = optionInputs();
  for (const [i, text] of options.entries()) {
    if (text) await user.type(inputs[i], text);
  }
}

describe("PollCreationForm", () => {
  it("empieza con pregunta y dos opciones, y permite añadir hasta cuatro", async () => {
    const user = userEvent.setup();
    render(<PollCreationForm onSubmit={vi.fn()} />);

    expect(screen.getByRole("textbox", { name: "Pregunta" })).toBeDefined();
    expect(optionInputs()).toHaveLength(2);

    const add = screen.getByRole("button", { name: "Añadir opción" });
    await user.click(add);
    await user.click(add);
    expect(optionInputs()).toHaveLength(4);
    expect(screen.queryByRole("button", { name: "Añadir opción" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Quitar opción 3" }));
    expect(optionInputs()).toHaveLength(3);
  });

  it("no deja quitar opciones por debajo de dos", () => {
    render(<PollCreationForm onSubmit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /^Quitar opción/ })).toBeNull();
  });

  it("envía los datos normalizados cuando son válidos", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PollCreationForm onSubmit={onSubmit} />);

    await fill(user, "  ¿Qué tomas   por la mañana?  ", [" Café ", "Té"]);
    await user.click(screen.getByRole("button", { name: "Publicar" }));

    expect(onSubmit).toHaveBeenCalledWith({
      question: "¿Qué tomas por la mañana?",
      options: ["Café", "Té"],
    });
  });

  it("no envía y señala los campos con pregunta corta, opción vacía o duplicados", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<PollCreationForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Añadir opción" }));
    await fill(user, "Corta", ["Café", "café", ""]);
    await user.click(screen.getByRole("button", { name: "Publicar" }));

    expect(onSubmit).not.toHaveBeenCalled();
    const question = screen.getByRole("textbox", { name: "Pregunta" });
    expect(question.getAttribute("aria-invalid")).toBe("true");
    const questionError = screen.getByText("La pregunta debe tener entre 10 y 280 caracteres.");
    expect(question.getAttribute("aria-describedby")).toBe(questionError.id);
    const [o1, o2, o3] = optionInputs();
    expect(o1.getAttribute("aria-invalid")).toBe("true");
    expect(o2.getAttribute("aria-invalid")).toBe("true");
    expect(o3.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getAllByText("Hay opciones repetidas.")).toHaveLength(2);
    expect(screen.getByText("Cada opción debe tener entre 1 y 100 caracteres.")).toBeDefined();
  });

  it("no guarda borradores: nada en el almacenamiento y campos vacíos al volver", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<PollCreationForm onSubmit={vi.fn()} />);
    await fill(user, "¿Una pregunta a medias?", ["Sí", ""]);

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    unmount();
    render(<PollCreationForm onSubmit={vi.fn()} />);
    expect((screen.getByRole("textbox", { name: "Pregunta" }) as HTMLTextAreaElement).value).toBe(
      "",
    );
    expect(optionInputs().map((i) => (i as HTMLInputElement).value)).toEqual(["", ""]);
  });
});
