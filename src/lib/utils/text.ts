// Reglas de texto de docs/contratos-api.md §1. La base de datos es la autoridad;
// el cliente las repite sólo para avisar antes de enviar.

const WHITESPACE_RUN = /[ \t\n\r\f\v]+/g;

export function normalizeText(value: string): string {
  return value.replace(WHITESPACE_RUN, " ").trim();
}

// Longitud en puntos de código Unicode, igual que char_length() en PostgreSQL.
export function codePointLength(value: string): number {
  return [...value].length;
}
