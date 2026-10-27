// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { PollOption } from "@/lib/data/types";
import { PollOptionGroup } from "./poll-option";

afterEach(cleanup);

const OPTIONS: PollOption[] = [
  { id: "o1", text: "Café", position: 1 },
  { id: "o2", text: "Té", position: 2 },
  { id: "o3", text: "Zumo", position: 3 },
];

function Selector({
  disabled = false,
  initial = null,
}: {
  disabled?: boolean;
  initial?: string | null;
}) {
  const [value, setValue] = useState<string | null>(initial);
  return (
    <PollOptionGroup
      pollId="p1"
      question="¿Qué tomas por la mañana?"
      options={OPTIONS}
      value={value}
      onValueChange={setValue}
      disabled={disabled}
    />
  );
}

const radio = (name: string) => screen.getByRole("radio", { name });

describe("PollOptionGroup", () => {
  it("agrupa las opciones bajo la pregunta y en su orden", () => {
    render(<Selector />);
    const group = screen.getByRole("group", { name: "¿Qué tomas por la mañana?" });
    const radios = screen.getAllByRole("radio");
    expect(group).toBeDefined();
    expect(radios.map((r) => r.getAttribute("value"))).toEqual(["o1", "o2", "o3"]);
    expect(radios.every((r) => !(r as HTMLInputElement).checked)).toBe(true);
  });

  it("al elegir otra opción deselecciona la anterior y sólo queda una", async () => {
    const user = userEvent.setup();
    render(<Selector />);

    await user.click(screen.getByText("Café"));
    expect((radio("Café") as HTMLInputElement).checked).toBe(true);

    await user.click(screen.getByText("Zumo"));
    expect((radio("Zumo") as HTMLInputElement).checked).toBe(true);
    expect((radio("Café") as HTMLInputElement).checked).toBe(false);
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
  });

  it("se recorre y elige con el teclado e informa del estado elegido", async () => {
    const user = userEvent.setup();
    render(<Selector />);

    await user.tab();
    expect(document.activeElement).toBe(radio("Café"));
    await user.keyboard(" ");
    expect(screen.getByRole("radio", { name: "Café", checked: true })).toBeDefined();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("radio", { name: "Té", checked: true })).toBeDefined();
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
  });

  it("deshabilitado (voto pendiente o completado) no admite cambios", async () => {
    const user = userEvent.setup();
    render(<Selector disabled initial="o2" />);

    // El fieldset deshabilitado bloquea todos sus controles (:disabled), también para
    // tecnología asistiva, aunque cada input no lleve su propio atributo.
    for (const r of screen.getAllByRole("radio")) {
      expect(r.matches(":disabled")).toBe(true);
    }
    await user.click(screen.getByText("Café"));
    expect((radio("Café") as HTMLInputElement).checked).toBe(false);
    expect((radio("Té") as HTMLInputElement).checked).toBe(true);
  });
});
