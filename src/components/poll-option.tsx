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
    <label className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-3 has-checked:border-accent has-disabled:cursor-not-allowed has-disabled:opacity-60">
      <input
        type="radio"
        name={name}
        value={option.id}
        checked={checked}
        onChange={() => onSelect(option.id)}
        className="size-4 accent-accent"
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
}: PollOptionGroupProps) {
  return (
    <fieldset disabled={disabled} className="flex flex-col gap-2">
      <legend className="mb-2 font-semibold">{question}</legend>
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
