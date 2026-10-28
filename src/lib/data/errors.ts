// Traducción de errores a códigos controlados (docs/contratos-api.md §2). La UI
// sólo recibe AppErrorCode y estos mensajes: nunca SQL, stack ni credenciales.
import type { AppErrorCode } from "./types";

export const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  AUTH_REQUIRED: "Inicia sesión para continuar.",
  VALIDATION_QUESTION_LENGTH: "La pregunta debe tener entre 10 y 280 caracteres.",
  VALIDATION_OPTION_COUNT: "Añade entre 2 y 6 opciones.",
  VALIDATION_OPTION_LENGTH: "Cada opción debe tener entre 1 y 100 caracteres.",
  VALIDATION_OPTION_DUPLICATE: "Hay opciones repetidas.",
  RATE_LIMITED: "Has alcanzado el límite de 5 encuestas por hora. Inténtalo más tarde.",
  POLL_UNAVAILABLE: "Esta encuesta no está disponible.",
  OPTION_INVALID: "Esa opción no es válida para esta encuesta.",
  ALREADY_VOTED: "Ya has votado en esta encuesta.",
  NOT_VOTED: "Vota para ver los resultados.",
  INVALID_CLOSES_AT: "El cierre debe estar entre 1 hora y 30 días desde ahora.",
  POLL_CLOSED: "Esta encuesta ya está cerrada y no admite votos.",
  USERNAME_INVALID:
    "El usuario debe tener de 3 a 20 caracteres (letras minúsculas, números o _) y empezar por una letra.",
  USERNAME_TAKEN: "Ese usuario ya está en uso. Prueba con otro.",
  USERNAME_RESERVED: "Ese usuario está reservado. Prueba con otro.",
  DISPLAY_NAME_INVALID: "El nombre debe tener entre 1 y 50 caracteres.",
  PROFILE_REQUIRED: "Elige primero tu usuario.",
  NETWORK_ERROR: "No hay conexión. Comprueba tu red y vuelve a intentarlo.",
  UNKNOWN: "Algo ha fallado. Vuelve a intentarlo.",
};

// Códigos que las RPC lanzan con RAISE ... ERRCODE 'P0001', MESSAGE '<código>'.
const RPC_CODES = new Set<string>([
  "AUTH_REQUIRED",
  "VALIDATION_QUESTION_LENGTH",
  "VALIDATION_OPTION_COUNT",
  "VALIDATION_OPTION_LENGTH",
  "VALIDATION_OPTION_DUPLICATE",
  "RATE_LIMITED",
  "POLL_UNAVAILABLE",
  "OPTION_INVALID",
  "ALREADY_VOTED",
  "NOT_VOTED",
  "INVALID_CLOSES_AT",
  "POLL_CLOSED",
  "USERNAME_INVALID",
  "USERNAME_TAKEN",
  "USERNAME_RESERVED",
  "DISPLAY_NAME_INVALID",
  "PROFILE_REQUIRED",
]);

// 42501: sin permiso (anon). PGRST301/303: JWT inválido o caducado.
const AUTH_CODES = new Set(["42501", "PGRST301", "PGRST303"]);

const NETWORK_MESSAGE = /fetch|network|load failed/i;

export function toAppError(error: unknown): AppErrorCode {
  // fetch lanzó (TypeError) antes de que supabase-js pudiera envolverlo.
  if (error instanceof TypeError)
    return NETWORK_MESSAGE.test(error.message) ? "NETWORK_ERROR" : "UNKNOWN";
  if (typeof error !== "object" || error === null || !("message" in error)) return "UNKNOWN";

  const { code, message } = error as { code?: unknown; message?: unknown };
  if (code === "P0001" && typeof message === "string" && RPC_CODES.has(message))
    return message as AppErrorCode;
  if (typeof code === "string" && AUTH_CODES.has(code)) return "AUTH_REQUIRED";
  // supabase-js envuelve los fallos de fetch en un error sin código.
  if (!code && typeof message === "string" && NETWORK_MESSAGE.test(message)) return "NETWORK_ERROR";
  return "UNKNOWN";
}
