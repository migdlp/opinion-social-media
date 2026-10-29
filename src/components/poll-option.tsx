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
// El foco contrasta con la superficie seleccionada en cada tema.
export function PollOption({ name, option, checked, onSelect }: PollOptionProps) {
  return (
    <label className="poll-choice flex cursor-pointer items-center gap-3 px-3.5 py-3 text-[15px] has-checked:font-semibold">
      <input
        type="radio"
        name={name}
        value={option.id}
        checked={checked}
        onChange={() => onSelect(option.id)}
        className="poll-radio shrink-0"
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
