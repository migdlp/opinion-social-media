// Validación cliente del perfil según docs/contratos-api.md §3.4 (V2-001). Repite las reglas
// de upsert_my_profile sólo para avisar antes de enviar; la base de datos decide.
import { codePointLength, normalizeText } from "@/lib/utils/text";

export const USERNAME_PATTERN = /^[a-z][a-z0-9_]{2,19}$/;
export const USERNAME_ERROR =
  "El usuario debe tener de 3 a 20 caracteres (letras minúsculas, números o _) y empezar por una letra.";
export const USERNAME_RESERVED_ERROR = "Ese usuario está reservado. Prueba con otro.";
export const DISPLAY_NAME_ERROR = "El nombre debe tener entre 1 y 50 caracteres.";

// Misma lista que la función SQL.
const RESERVED = new Set([
  "admin",
  "me",
  "settings",
  "login",
  "logout",
  "create",
  "polls",
  "u",
  "api",
  "auth",
  "onboarding",
  "opinion",
  "soporte",
  "support",
  "moderacion",
]);

export type ProfileInputErrors = { username?: string; displayName?: string };

export function validateProfileInput(username: string, displayName: string): ProfileInputErrors {
  const errors: ProfileInputErrors = {};
  const lowered = username.toLowerCase();
  if (!USERNAME_PATTERN.test(lowered)) errors.username = USERNAME_ERROR;
  else if (RESERVED.has(lowered)) errors.username = USERNAME_RESERVED_ERROR;

  // En blanco = sin nombre visible. Con texto, de 1 a 50 caracteres tras normalizar.
  const name = normalizeText(displayName);
  if (name && codePointLength(name) > 50) errors.displayName = DISPLAY_NAME_ERROR;
  return errors;
}

export function hasProfileErrors(errors: ProfileInputErrors): boolean {
  return Boolean(errors.username) || Boolean(errors.displayName);
}
