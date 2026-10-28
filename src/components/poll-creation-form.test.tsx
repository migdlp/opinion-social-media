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

  describe("cierre (V2-013)", () => {
    const HOUR = 3_600_000;
    const choose = (label: string) =>
      userEvent.selectOptions(screen.getByRole("combobox", { name: "Cierre" }), label);

    it("por defecto no cierra: no envía closesAt", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn(async () => OK);
      render(<PollCreationForm {...props({ onSubmit })} />);
      expect((screen.getByRole("combobox", { name: "Cierre" }) as HTMLSelectElement).value).toBe(
        "none",
      );
      expect(screen.getByRole("option", { name: "Sin cierre" })).toBeDefined();

      await fill(user, "¿Qué tomas por la mañana?", ["Café", "Té"]);
      await user.click(screen.getByRole("button", { name: "Publicar" }));

      expect(onSubmit.mock.calls[0]).toEqual([
        { question: "¿Qué tomas por la mañana?", options: ["Café", "Té"] },
      ]);
    });

    it("ofrece los plazos fijos y una fecha personalizada", () => {
      render(<PollCreationForm {...props()} />);
      expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
        "Sin cierre",
        "1 hora",
        "1 día",
        "3 días",
        "7 días",
        "Personalizada",
      ]);
    });

    it.each([
      ["1 hora", HOUR, 1.1 * HOUR],
      ["3 días", 72 * HOUR, 72.1 * HOUR],
    ])("con «%s» envía una fecha UTC dentro del plazo", async (label, min, max) => {
      const user = userEvent.setup();
      const onSubmit = vi.fn<(input: unknown) => Promise<Publish>>(async () => OK);
      render(<PollCreationForm {...props({ onSubmit })} />);
      await fill(user, "¿Qué tomas por la mañana?", ["Café", "Té"]);
      await choose(label);
      const before = Date.now();
      await user.click(screen.getByRole("button", { name: "Publicar" }));

      const { closesAt } = onSubmit.mock.calls[0][0] as { closesAt: string };
      expect(closesAt).toMatch(/Z$/);
      const delta = new Date(closesAt).getTime() - before;
      expect(delta).toBeGreaterThanOrEqual(min);
      expect(delta).toBeLessThanOrEqual(max);
    });

    it("la fecha personalizada exige entre 1 hora y 30 días y avisa si no", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn(async () => OK);
      render(<PollCreationForm {...props({ onSubmit })} />);
      await fill(user, "¿Qué tomas por la mañana?", ["Café", "Té"]);
      await choose("Personalizada");

      const local = (offsetMs: number) => {
        const d = new Date(Date.now() + offsetMs);
        const pad = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      };
      const input = screen.getByLabelText("Fecha y hora de cierre");

      fireEvent.change(input, { target: { value: local(30 * 60_000) } });
      await user.click(screen.getByRole("button", { name: "Publicar" }));
      expect(onSubmit).not.toHaveBeenCalled();
      expect(
        screen.getByText("El cierre debe estar entre 1 hora y 30 días desde ahora."),
      ).toBeDefined();

      fireEvent.change(input, { target: { value: local(2 * HOUR) } });
      await user.click(screen.getByRole("button", { name: "Publicar" }));
      expect(onSubmit).toHaveBeenCalledOnce();
      const { closesAt } = (onSubmit.mock.calls[0] as unknown as [{ closesAt: string }])[0];
      expect(Math.abs(new Date(closesAt).getTime() - (Date.now() + 2 * HOUR))).toBeLessThan(
        2 * 60_000,
      );
    });

    it("elegir «Personalizada» sin fecha no deja publicar", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn(async () => OK);
      render(<PollCreationForm {...props({ onSubmit })} />);
      await fill(user, "¿Qué tomas por la mañana?", ["Café", "Té"]);
      await choose("Personalizada");
      await user.click(screen.getByRole("button", { name: "Publicar" }));

      expect(onSubmit).not.toHaveBeenCalled();
      expect(
        screen.getByText("El cierre debe estar entre 1 hora y 30 días desde ahora."),
      ).toBeDefined();
    });
  });

  describe("categoría (V2-021)", () => {
    const CATEGORIES = [
      { slug: "deportes", name: "Deportes" },
      { slug: "ciencia", name: "Ciencia" },
    ];
    const select = () => screen.getByRole("combobox", { name: "Categoría (opcional)" });

    it("sin categorías disponibles no muestra el selector", () => {
      render(<PollCreationForm {...props()} />);
      expect(screen.queryByRole("combobox", { name: /Categoría/ })).toBeNull();
    });

    it("ofrece «Sin categoría» y la lista, y por defecto no envía categoría", async () => {
      const user = userEvent.setup();
      const p = props();
      render(<PollCreationForm {...p} categories={CATEGORIES} />);

      expect(screen.getByRole("option", { name: "Sin categoría" })).toBeDefined();
      expect(screen.getByRole("option", { name: "Deportes" })).toBeDefined();
      await fill(user, "¿Qué tomas por la mañana?", ["Café", "Té"]);
      await user.click(screen.getByRole("button", { name: "Publicar" }));

      expect(p.onSubmit).toHaveBeenCalledWith({
        question: "¿Qué tomas por la mañana?",
        options: ["Café", "Té"],
      });
    });

    it("envía el slug de la categoría elegida", async () => {
      const user = userEvent.setup();
      const p = props();
      render(<PollCreationForm {...p} categories={CATEGORIES} />);
      await fill(user, "¿Qué tomas por la mañana?", ["Café", "Té"]);
      await user.selectOptions(select(), "Ciencia");
      await user.click(screen.getByRole("button", { name: "Publicar" }));

      expect(p.onSubmit).toHaveBeenCalledWith({
        question: "¿Qué tomas por la mañana?",
        options: ["Café", "Té"],
        category: "ciencia",
      });
    });
  });
});
