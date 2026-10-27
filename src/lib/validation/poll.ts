// Validación cliente de una encuesta según docs/contratos-api.md §1 y §2. Repite las
// reglas de create_poll sólo para avisar antes de enviar; la base de datos decide.
import { codePointLength, normalizeText } from "@/lib/utils/text";

export const QUESTION_LENGTH_ERROR = "La pregunta debe tener entre 10 y 280 caracteres.";
export const OPTION_LENGTH_ERROR = "Cada opción debe tener entre 1 y 100 caracteres.";
export const OPTION_DUPLICATE_ERROR = "Hay opciones repetidas.";

export type PollInputErrors = {
  question?: string;
  options: (string | undefined)[];
};

const inRange = (value: string, min: number, max: number) => {
  const length = codePointLength(value);
  return length >= min && length <= max;
};

export function validatePollInput(question: string, options: string[]): PollInputErrors {
  const normalized = options.map(normalizeText);
  const keys = normalized.map((option) => option.toLowerCase());
  const count = (key: string) => keys.filter((k) => k === key).length;

  return {
    question: inRange(normalizeText(question), 10, 280) ? undefined : QUESTION_LENGTH_ERROR,
    options: normalized.map((option, i) => {
      if (!inRange(option, 1, 100)) return OPTION_LENGTH_ERROR;
      if (count(keys[i]) > 1) return OPTION_DUPLICATE_ERROR;
      return undefined;
    }),
  };
}

export function hasErrors(errors: PollInputErrors): boolean {
  return Boolean(errors.question) || errors.options.some(Boolean);
}
