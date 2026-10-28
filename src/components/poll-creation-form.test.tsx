// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Result } from "@/lib/data/types";
import { PollCreationForm } from "./poll-creation-form";

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

type Publish = Result<{ id: string }>;
const OK: Publish = { ok: true, data: { id: "p1" } };
const props = (over: Partial<React.ComponentProps<typeof PollCreationForm>> = {}) => ({
  onSubmit: vi.fn(async () => OK),
  onPublished: vi.fn(),
  ...over,
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
  it("empieza con pregunta y dos opciones, y permite añadir hasta seis", async () => {
    const user = userEvent.setup();
    render(<PollCreationForm {...props()} />);

    expect(screen.getByRole("textbox", { name: "Pregunta" })).toBeDefined();
    expect(optionInputs()).toHaveLength(2);

    const add = screen.getByRole("button", { name: "Añadir opción" });
    for (let i = 0; i < 4; i++) await user.click(add);
    expect(optionInputs()).toHaveLength(6);
    expect(screen.queryByRole("button", { name: "Añadir opción" })).toBeNull();

    await user.click(screen.getByRole("button", { name: "Quitar opción 3" }));
    expect(optionInputs()).toHaveLength(5);
  });

  it("no deja quitar opciones por debajo de dos", () => {
    render(<PollCreationForm {...props()} />);
    expect(screen.queryByRole("button", { name: /^Quitar opción/ })).toBeNull();
  });

  it("envía los datos normalizados cuando son válidos", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => OK);
    render(<PollCreationForm {...props({ onSubmit })} />);

    await fill(user, "  ¿Qué tomas   por la mañana?  ", [" Café ", "Té"]);
    await user.click(screen.getByRole("button", { name: "Publicar" }));

    expect(onSubmit).toHaveBeenCalledWith({
      question: "¿Qué tomas por la mañana?",
      options: ["Café", "Té"],
    });
  });

  it("no envía y señala los campos con pregunta corta, opción vacía o duplicados", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn(async () => OK);
    render(<PollCreationForm {...props({ onSubmit })} />);

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
    const { unmount } = render(<PollCreationForm {...props()} />);
    await fill(user, "¿Una pregunta a medias?", ["Sí", ""]);

    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);

    unmount();
    render(<PollCreationForm {...props()} />);
    expect((screen.getByRole("textbox", { name: "Pregunta" }) as HTMLTextAreaElement).value).toBe(
      "",
    );
    expect(optionInputs().map((i) => (i as HTMLInputElement).value)).toEqual(["", ""]);
  });

  describe("publicar", () => {
    const VALID = ["¿Qué tomas por la mañana?", ["Café", "Té"]] as const;
    const publish = async (user: ReturnType<typeof userEvent.setup>) => {
      await fill(user, VALID[0], [...VALID[1]]);
      await user.click(screen.getByRole("button", { name: "Publicar" }));
    };

    it("al publicar con éxito avisa con el id de la nueva encuesta", async () => {
      const user = userEvent.setup();
      const p = props();
      render(<PollCreationForm {...p} />);

      await publish(user);

      expect(p.onSubmit).toHaveBeenCalledOnce();
      expect(p.onPublished).toHaveBeenCalledWith("p1");
    });

    it("bloquea el botón y no envía dos veces mientras publica", async () => {
      const user = userEvent.setup();
      let resolve!: (r: Publish) => void;
      const onSubmit = vi.fn(() => new Promise<Publish>((r) => (resolve = r)));
      render(<PollCreationForm {...props({ onSubmit })} />);

      await publish(user);
      const button = screen.getByRole("button", { name: /Publicando/ }) as HTMLButtonElement;
      expect(button.disabled).toBe(true);
      await user.click(button);
      fireEvent.submit(button.closest("form")!);
      expect(onSubmit).toHaveBeenCalledOnce();

      resolve(OK);
    });

    it("si falla mantiene los campos, explica el motivo y permite reintentar", async () => {
      const user = userEvent.setup();
      const onSubmit = vi
        .fn<() => Promise<Publish>>()
        .mockResolvedValueOnce({ ok: false, error: "RATE_LIMITED" })
        .mockResolvedValueOnce(OK);
      const p = props({ onSubmit });
      render(<PollCreationForm {...p} />);

      await publish(user);

      expect((await screen.findByRole("alert")).textContent).toContain("límite de 5 encuestas");
      expect((screen.getByRole("textbox", { name: "Pregunta" }) as HTMLTextAreaElement).value).toBe(
        VALID[0],
      );
      expect(optionInputs().map((i) => (i as HTMLInputElement).value)).toEqual(["Café", "Té"]);
      expect(p.onPublished).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Publicar" }));
      expect(onSubmit).toHaveBeenCalledTimes(2);
      expect(p.onPublished).toHaveBeenCalledWith("p1");
    });

    it("si la llamada ni llega al servidor muestra el error de red", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn(() => Promise.reject(new Error("offline")));
      render(<PollCreationForm {...props({ onSubmit })} />);

      await publish(user);

      expect((await screen.findByRole("alert")).textContent).toContain("No hay conexión");
    });

    it("sin sesión pide iniciar sesión, vuelve a /create y conserva lo escrito", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn(async (): Promise<Publish> => ({ ok: false, error: "AUTH_REQUIRED" }));
      render(<PollCreationForm {...props({ onSubmit })} />);

      await publish(user);

      const link = await screen.findByRole("link", { name: "Iniciar sesión" });
      expect(link.getAttribute("href")).toBe("/login?next=%2Fcreate");
      expect((screen.getByRole("textbox", { name: "Pregunta" }) as HTMLTextAreaElement).value).toBe(
        VALID[0],
      );
    });
  });

  describe("tras una caída de red (MVP-040)", () => {
    const VALID = ["¿Qué tomas por la mañana?", ["Café", "Té"]] as const;
    const NET: Publish = { ok: false, error: "NETWORK_ERROR" };
    const submitOnce = async (user: ReturnType<typeof userEvent.setup>) => {
      await fill(user, VALID[0], [...VALID[1]]);
      await user.click(screen.getByRole("button", { name: "Publicar" }));
      await screen.findByRole("alert");
    };

    it("antes de reintentar consulta si la encuesta ya se publicó y, si es así, no crea otra", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn(async (): Promise<Publish> => NET);
      const onRecover = vi.fn(async () => ({ ok: true as const, data: { id: "ya-existe" } }));
      const p = props({ onSubmit, onRecover });
      render(<PollCreationForm {...p} />);
      await submitOnce(user);

      await user.click(screen.getByRole("button", { name: "Publicar" }));

      expect(onRecover).toHaveBeenCalledWith({ question: VALID[0], options: ["Café", "Té"] });
      expect(onSubmit).toHaveBeenCalledOnce();
      expect(p.onPublished).toHaveBeenCalledWith("ya-existe");
    });

    it("si no se había publicado, reintenta el envío normalmente", async () => {
      const user = userEvent.setup();
      const onSubmit = vi
        .fn<() => Promise<Publish>>()
        .mockResolvedValueOnce(NET)
        .mockResolvedValueOnce(OK);
      const onRecover = vi.fn(async () => ({ ok: true as const, data: null }));
      const p = props({ onSubmit, onRecover });
      render(<PollCreationForm {...p} />);
      await submitOnce(user);

      await user.click(screen.getByRole("button", { name: "Publicar" }));

      expect(onRecover).toHaveBeenCalledOnce();
      expect(onSubmit).toHaveBeenCalledTimes(2);
      expect(p.onPublished).toHaveBeenCalledWith("p1");
    });

    it("si todavía no hay conexión para comprobarlo, no envía y lo explica", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn(async (): Promise<Publish> => NET);
      const onRecover = vi.fn(async () => ({
        ok: false as const,
        error: "NETWORK_ERROR" as const,
      }));
      render(<PollCreationForm {...props({ onSubmit, onRecover })} />);
      await submitOnce(user);

      await user.click(screen.getByRole("button", { name: "Publicar" }));

      expect(onSubmit).toHaveBeenCalledOnce();
      expect((await screen.findByRole("alert")).textContent).toContain("No hay conexión");
      expect((screen.getByRole("button", { name: "Publicar" }) as HTMLButtonElement).disabled).toBe(
        false,
      );
    });

    it("un fallo que no es de red (cuota) reintenta sin comprobar nada", async () => {
      const user = userEvent.setup();
      const onSubmit = vi
        .fn<() => Promise<Publish>>()
        .mockResolvedValueOnce({ ok: false, error: "RATE_LIMITED" })
        .mockResolvedValueOnce(OK);
      const onRecover = vi.fn();
      render(<PollCreationForm {...props({ onSubmit, onRecover })} />);
      await submitOnce(user);

      await user.click(screen.getByRole("button", { name: "Publicar" }));

      expect(onRecover).not.toHaveBeenCalled();
      expect(onSubmit).toHaveBeenCalledTimes(2);
    });
  });
});
