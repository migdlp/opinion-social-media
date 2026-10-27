"use client";

import type { PollOption as PollOptionData } from "@/lib/data/types";

type PollOptionProps = {
  name: string;
  option: PollOptionData;
  checked: boolean;
  onSelect: (optionId: string) => void;
};

// Una opción de respuesta: radio nativo con su etiqueta, para que teclado y
// tecnología asistiva reciban el estado (seleccionada / deshabilitada) sin ARIA extra.
export function PollOption({ name, option, checked, onSelect }: PollOptionProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-[15px] transition-colors hover:border-foreground has-checked:border-foreground has-checked:bg-foreground has-checked:font-semibold has-checked:text-background has-disabled:cursor-not-allowed has-disabled:opacity-60 has-disabled:hover:border-border">
      <input
        type="radio"
        name={name}
        value={option.id}
        checked={checked}
        onChange={() => onSelect(option.id)}
        className="size-4 shrink-0 appearance-none rounded-full border-2 border-current checked:bg-background checked:shadow-[inset_0_0_0_3px_var(--foreground)]"
      />
      <span>{option.text}</span>
    </label>
  );
}

type PollOptionGroupProps = {
  pollId: string;
  question: string;
  options: PollOptionData[];
  value: string | null;
  onValueChange: (optionId: string) => void;
  disabled?: boolean;
  // La pregunta ya es el título de la página: se deja sólo para tecnología asistiva.
  hideQuestion?: boolean;
};

// Selector de voto de selección única. Es controlado: quien lo usa guarda la opción
// elegida y lo deshabilita mientras el voto está pendiente o ya se ha emitido.
export function PollOptionGroup({
  pollId,
  question,
  options,
  value,
  onValueChange,
  disabled = false,
  hideQuestion = false,
}: PollOptionGroupProps) {
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2">
      <legend
        className={`mb-3 text-[17px] leading-snug font-semibold tracking-[-0.01em] ${hideQuestion ? "sr-only" : ""}`}
      >
        {question}
      </legend>
      {options.map((option) => (
        <PollOption
          key={option.id}
          name={`poll-${pollId}`}
          option={option}
          checked={value === option.id}
          onSelect={onValueChange}
        />
      ))}
    </fieldset>
  );
}
