"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { loginPath } from "@/lib/auth/redirect";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { AppErrorCode, Result } from "@/lib/data/types";
import { normalizeText } from "@/lib/utils/text";
import { hasErrors, type PollInputErrors, validatePollInput } from "@/lib/validation/poll";

export type PollCreationInput = { question: string; options: string[] };

type PollCreationFormProps = {
  onSubmit: (input: PollCreationInput) => Promise<Result<{ id: string }>>;
  onPublished: (id: string) => void;
  // Tras una caída de red: ¿se llegó a publicar? Evita crear un duplicado al reintentar.
  onRecover?: (input: PollCreationInput) => Promise<Result<{ id: string } | null>>;
};

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

const fieldClass =
  "w-full rounded-xl border border-field bg-surface px-3.5 py-2.5 text-[15px] transition-colors hover:border-foreground focus:border-foreground focus:outline-none aria-invalid:border-danger";

// Formulario de creación. Los campos sólo viven en memoria: no se guardan borradores
// en el navegador ni en la base de datos (D-007). Publicar es responsabilidad de quien
// pasa onSubmit; si falla, los campos se conservan para reintentar. Un solo envío a la vez
// (MVP-032). Tras publicar con éxito, onPublished recibe el id de la nueva encuesta.
export function PollCreationForm({ onSubmit, onPublished, onRecover }: PollCreationFormProps) {
  const id = useId();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(Array(MIN_OPTIONS).fill(""));
  const [errors, setErrors] = useState<PollInputErrors | null>(null);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AppErrorCode | null>(null);
  const sending = useRef(false);
  const checkFirst = useRef(false);

  const setOption = (index: number, value: string) =>
    setOptions((current) => current.map((option, i) => (i === index ? value : option)));

  const removeOption = (index: number) => {
    setOptions((current) => current.filter((_, i) => i !== index));
    setErrors(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending.current) return;
    const result = validatePollInput(question, options);
    if (hasErrors(result)) {
      setErrors(result);
      return;
    }
    setErrors(null);
    setFailure(null);
    sending.current = true;
    setPending(true);
    const input = {
      question: normalizeText(question),
      options: options.map(normalizeText),
    };
    // Tras una caída de red la publicación quizá se completó: se consulta el servidor antes
    // de volver a enviar. Si la consulta tampoco llega, se espera a que haya conexión.
    if (checkFirst.current && onRecover) {
      const recovered = await onRecover(input).catch((): Result<{ id: string } | null> => ({
        ok: false,
        error: "NETWORK_ERROR",
      }));
      if (!recovered.ok) {
        sending.current = false;
        setPending(false);
        setFailure(recovered.error);
        return;
      }
      if (recovered.data) {
        onPublished(recovered.data.id);
        return;
      }
      checkFirst.current = false;
    }
    // Si la llamada ni llega al servidor, la promesa se rechaza.
    const outcome = await onSubmit(input).catch((): Result<{ id: string }> => ({
      ok: false,
      error: "NETWORK_ERROR",
    }));
    if (outcome.ok) {
      // Se mantiene bloqueado: la navegación al detalle está en curso.
      onPublished(outcome.data.id);
      return;
    }
    checkFirst.current = outcome.error === "NETWORK_ERROR";
    sending.current = false;
    setPending(false);
    setFailure(outcome.error);
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
                    className="min-h-11 shrink-0 rounded-full px-3 text-[13px] font-medium text-muted underline-offset-4 hover:text-foreground hover:underline"
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
            className="min-h-11 self-start rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-foreground"
          >
            Añadir opción
          </button>
        )}
      </fieldset>

      {failure === "AUTH_REQUIRED" ? (
        <p className="rounded-xl border border-border bg-surface p-3 text-sm">
          Inicia sesión para publicar; volverás aquí y podrás terminar la encuesta.{" "}
          <Link href={loginPath("/create")} className="font-semibold underline">
            Iniciar sesión
          </Link>
        </p>
      ) : (
        failure && (
          <p role="alert" className="text-sm text-danger">
            {ERROR_MESSAGES[failure]}
          </p>
        )
      )}

      <button
        type="submit"
        disabled={pending}
        className="self-start rounded-full bg-foreground px-6 py-2.5 font-semibold text-background transition-opacity hover:opacity-85 disabled:opacity-50"
      >
        {pending ? "Publicando…" : "Publicar"}
      </button>
    </form>
  );
}
