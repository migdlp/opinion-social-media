"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { loginPath, onboardingPath } from "@/lib/auth/redirect";
import { ERROR_MESSAGES } from "@/lib/data/errors";
import type { AppErrorCode, Category, Result } from "@/lib/data/types";
import { normalizeText } from "@/lib/utils/text";
import { hasErrors, type PollInputErrors, validatePollInput } from "@/lib/validation/poll";

// closesAt: instante ISO en UTC; ausente si la encuesta no cierra (V2-013).
export type PollCreationInput = {
  question: string;
  options: string[];
  closesAt?: string;
  category?: string;
};

type PollCreationFormProps = {
  // Lista cerrada de categorías (V2-021). Vacía: no se muestra el selector.
  categories?: Category[];
  onSubmit: (input: PollCreationInput) => Promise<Result<{ id: string }>>;
  onPublished: (id: string) => void;
  // Tras una caída de red: ¿se llegó a publicar? Evita crear un duplicado al reintentar.
  onRecover?: (input: PollCreationInput) => Promise<Result<{ id: string } | null>>;
};

const MIN_OPTIONS = 2;
const MAX_OPTIONS = 6;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
// El servidor exige entre 1 hora y 30 días desde que recibe la petición. Los plazos fijos
// llevan un margen de 2 minutos para que el trayecto de red no los deje por debajo de 1 hora.
const MARGIN = 2 * MINUTE;
const CLOSE_PRESETS: Record<string, { label: string; ms: number } | undefined> = {
  none: undefined,
  "1h": { label: "1 hora", ms: HOUR },
  "1d": { label: "1 día", ms: DAY },
  "3d": { label: "3 días", ms: 3 * DAY },
  "7d": { label: "7 días", ms: 7 * DAY },
};
const CLOSE_ERROR = "El cierre debe estar entre 1 hora y 30 días desde ahora.";

// undefined: sin cierre; null: fecha ausente o fuera de 1 hora–30 días; si no, instante UTC.
function resolveCloseDate(choice: string, custom: string): string | undefined | null {
  if (choice === "none") return undefined;
  const preset = CLOSE_PRESETS[choice];
  if (preset) return new Date(Date.now() + preset.ms + MARGIN).toISOString();
  const date = new Date(custom); // «YYYY-MM-DDTHH:mm» se interpreta en hora local
  const ahead = date.getTime() - Date.now();
  if (!custom || Number.isNaN(ahead) || ahead < HOUR || ahead > 30 * DAY) return null;
  return date.toISOString();
}

const fieldClass =
  "w-full rounded-xl border border-field bg-surface px-3.5 py-2.5 text-[15px] transition-colors hover:border-foreground focus:border-foreground aria-invalid:border-danger aria-invalid:focus:border-danger";

// Formulario de creación. Los campos sólo viven en memoria: no se guardan borradores
// en el navegador ni en la base de datos (D-007). Publicar es responsabilidad de quien
// pasa onSubmit; si falla, los campos se conservan para reintentar. Un solo envío a la vez
// (MVP-032). Tras publicar con éxito, onPublished recibe el id de la nueva encuesta.
export function PollCreationForm({
  onSubmit,
  onPublished,
  onRecover,
  categories = [],
}: PollCreationFormProps) {
  const id = useId();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(Array(MIN_OPTIONS).fill(""));
  const [closeChoice, setCloseChoice] = useState("none");
  const [customClose, setCustomClose] = useState("");
  const [closeError, setCloseError] = useState(false);
  const [category, setCategory] = useState("");
  const [errors, setErrors] = useState<PollInputErrors | null>(null);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<AppErrorCode | null>(null);
  const sending = useRef(false);
  const checkFirst = useRef(false);

  const setOption = (index: number, value: string) =>
    setOptions((current) => current.map((option, i) => (i === index ? value : option)));

  // Plantilla de dos opciones (V2-011). Si ya hay texto escrito, se pide confirmación.
  const applyYesNo = () => {
    const hasText = options.some((option) => option.trim() !== "");
    if (hasText && !window.confirm("Se sustituirán las opciones escritas por Sí y No. ¿Continuar?"))
      return;
    setOptions(["Sí", "No"]);
    setErrors(null);
  };

  const removeOption = (index: number) => {
    setOptions((current) => current.filter((_, i) => i !== index));
    setErrors(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (sending.current) return;
    const result = validatePollInput(question, options);
    const closesAt = resolveCloseDate(closeChoice, customClose);
    setCloseError(closesAt === null);
    if (hasErrors(result) || closesAt === null) {
      setErrors(result);
      return;
    }
    setErrors(null);
    setFailure(null);
    sending.current = true;
    setPending(true);
    const input: PollCreationInput = {
      question: normalizeText(question),
      options: options.map(normalizeText),
      ...(closesAt ? { closesAt } : {}),
      ...(category ? { category } : {}),
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

  const closeErrorId = `${id}-close-error`;
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
        <button
          type="button"
          onClick={applyYesNo}
          className="min-h-11 self-start rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium transition-colors hover:border-foreground"
        >
          Sí / No
        </button>
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

      {categories.length > 0 && (
        <div className="flex flex-col gap-1">
          <label htmlFor={`${id}-category`} className="text-[15px] font-semibold">
            Categoría (opcional)
          </label>
          <select
            id={`${id}-category`}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className={fieldClass}
          >
            <option value="">Sin categoría</option>
            {categories.map((option) => (
              <option key={option.slug} value={option.slug}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor={`${id}-close`} className="text-[15px] font-semibold">
          Cierre
        </label>
        <select
          id={`${id}-close`}
          value={closeChoice}
          onChange={(event) => {
            setCloseChoice(event.target.value);
            setCloseError(false);
          }}
          className={fieldClass}
        >
          <option value="none">Sin cierre</option>
          <option value="1h">1 hora</option>
          <option value="1d">1 día</option>
          <option value="3d">3 días</option>
          <option value="7d">7 días</option>
          <option value="custom">Personalizada</option>
        </select>
        {closeChoice === "custom" && (
          <>
            <label htmlFor={`${id}-close-custom`} className="mt-2 text-[13px] text-muted">
              Fecha y hora de cierre
            </label>
            <input
              id={`${id}-close-custom`}
              type="datetime-local"
              value={customClose}
              onChange={(event) => setCustomClose(event.target.value)}
              aria-invalid={closeError ? true : undefined}
              aria-describedby={closeError ? closeErrorId : undefined}
              className={fieldClass}
            />
          </>
        )}
        {closeError && (
          <p id={closeErrorId} className="text-[13px] font-medium text-danger">
            {CLOSE_ERROR}
          </p>
        )}
        <p className="text-[13px] text-muted">
          Al cerrar, la encuesta deja de admitir votos y no se puede cambiar la fecha.
        </p>
      </div>

      {failure === "AUTH_REQUIRED" ? (
        <p className="rounded-xl border border-border bg-surface p-3 text-sm">
          Inicia sesión para publicar; volverás aquí y podrás terminar la encuesta.{" "}
          <Link href={loginPath("/create")} className="font-semibold underline">
            Iniciar sesión
          </Link>
        </p>
      ) : failure === "PROFILE_REQUIRED" ? (
        <p className="rounded-xl border border-border bg-surface p-3 text-sm">
          Elige tu usuario para publicar; volverás aquí y podrás terminar la encuesta.{" "}
          <Link href={onboardingPath("/create")} className="font-semibold underline">
            Elegir mi usuario
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
        className="self-start action-primary rounded-xl px-6 py-2.5 font-semibold"
      >
        {pending ? "Publicando…" : "Publicar"}
      </button>
    </form>
  );
}
