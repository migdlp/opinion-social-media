"use client";

import { useId, useState } from "react";
import { normalizeText } from "@/lib/utils/text";
import { hasErrors, type PollInputErrors, validatePollInput } from "@/lib/validation/poll";

export type PollCreationInput = { question: string; options: string[] };

type PollCreationFormProps = {
  onSubmit: (input: PollCreationInput) => void;
};

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 4;

const fieldClass =
  "w-full rounded-xl border border-field bg-surface px-3.5 py-2.5 text-[15px] transition-colors hover:border-foreground focus:border-foreground focus:outline-none aria-invalid:border-danger";

// Formulario de creación. Los campos sólo viven en memoria: no se guardan borradores
// en el navegador ni en la base de datos (D-007). Publicar es responsabilidad de quien
// pasa onSubmit (MVP-032).
export function PollCreationForm({ onSubmit }: PollCreationFormProps) {
  const id = useId();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(Array(MIN_OPTIONS).fill(""));
  const [errors, setErrors] = useState<PollInputErrors | null>(null);

  const setOption = (index: number, value: string) =>
    setOptions((current) => current.map((option, i) => (i === index ? value : option)));

  const removeOption = (index: number) => {
    setOptions((current) => current.filter((_, i) => i !== index));
    setErrors(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = validatePollInput(question, options);
    if (hasErrors(result)) {
      setErrors(result);
      return;
    }
    setErrors(null);
    onSubmit({ question: normalizeText(question), options: options.map(normalizeText) });
  };

  const questionErrorId = `${id}-question-error`;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-question`} className="text-[15px] font-semibold">
          Pregunta
        </label>
        <textarea
          id={`${id}-question`}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          rows={3}
          aria-invalid={errors?.question ? true : undefined}
          aria-describedby={errors?.question ? questionErrorId : undefined}
          className={fieldClass}
        />
        {errors?.question && (
          <p id={questionErrorId} className="text-[13px] font-medium text-danger">
            {errors.question}
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-3.5">
        <legend className="mb-1 text-[15px] font-semibold">Opciones</legend>
        {options.map((option, index) => {
          const error = errors?.options[index];
          const inputId = `${id}-option-${index}`;
          const errorId = `${inputId}-error`;
          return (
            <div key={index} className="flex flex-col gap-1">
              <label htmlFor={inputId} className="text-[13px] text-muted">
                Opción {index + 1}
              </label>
              <div className="flex gap-2">
                <input
                  id={inputId}
                  type="text"
                  value={option}
                  onChange={(event) => setOption(index, event.target.value)}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? errorId : undefined}
                  className={fieldClass}
                />
                {options.length > MIN_OPTIONS && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    aria-label={`Quitar opción ${index + 1}`}
                    className="shrink-0 rounded-full px-3 text-[13px] font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
                  >
                    Quitar
                  </button>
                )}
              </div>
              {error && (
                <p id={errorId} className="text-[13px] font-medium text-danger">
                  {error}
                </p>
              )}
            </div>
          );
        })}
        {options.length < MAX_OPTIONS && (
          <button
            type="button"
            onClick={() => setOptions((current) => [...current, ""])}
            className="self-start rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-foreground"
          >
            Añadir opción
          </button>
        )}
      </fieldset>

      <button
        type="submit"
        className="self-start rounded-full bg-foreground px-6 py-2.5 font-semibold text-background transition-opacity hover:opacity-85"
      >
        Publicar
      </button>
    </form>
  );
}
