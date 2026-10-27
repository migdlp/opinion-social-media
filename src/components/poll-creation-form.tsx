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
  "w-full rounded-md border bg-background px-3 py-2 aria-invalid:border-red-600 dark:aria-invalid:border-red-400 border-border";

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
        <label htmlFor={`${id}-question`} className="font-semibold">
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
          <p id={questionErrorId} className="text-sm text-red-600 dark:text-red-400">
            {errors.question}
          </p>
        )}
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 font-semibold">Opciones</legend>
        {options.map((option, index) => {
          const error = errors?.options[index];
          const inputId = `${id}-option-${index}`;
          const errorId = `${inputId}-error`;
          return (
            <div key={index} className="flex flex-col gap-1">
              <label htmlFor={inputId} className="text-sm">
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
                    className="shrink-0 rounded-md border border-border px-3"
                  >
                    Quitar
                  </button>
                )}
              </div>
              {error && (
                <p id={errorId} className="text-sm text-red-600 dark:text-red-400">
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
            className="self-start rounded-md border border-border px-3 py-2 text-sm"
          >
            Añadir opción
          </button>
        )}
      </fieldset>

      <button
        type="submit"
        className="self-start rounded-md bg-accent px-4 py-2 font-semibold text-accent-foreground hover:opacity-90"
      >
        Publicar
      </button>
    </form>
  );
}
