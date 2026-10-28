import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES, toAppError } from "./errors";
import type { AppErrorCode } from "./types";

const BUSINESS: AppErrorCode[] = [
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
  "USERNAME_INVALID",
  "USERNAME_TAKEN",
  "USERNAME_RESERVED",
  "DISPLAY_NAME_INVALID",
  "PROFILE_REQUIRED",
];

describe("toAppError", () => {
  it.each(BUSINESS)("traduce el código de negocio %s de una RPC (P0001)", (code) => {
    expect(toAppError({ code: "P0001", message: code, details: null, hint: null })).toBe(code);
  });

  it("un P0001 con mensaje desconocido no se propaga tal cual", () => {
    expect(toAppError({ code: "P0001", message: "relation polls does not exist" })).toBe("UNKNOWN");
  });

  it("falta de permiso o JWT caducado/inválido → AUTH_REQUIRED", () => {
    expect(toAppError({ code: "42501", message: "permission denied for function vote_poll" })).toBe(
      "AUTH_REQUIRED",
    );
    expect(toAppError({ code: "PGRST303", message: "JWT expired" })).toBe("AUTH_REQUIRED");
    expect(toAppError({ code: "PGRST301", message: "JWSError" })).toBe("AUTH_REQUIRED");
  });

  it("caída de red: error de supabase-js sin código o excepción de fetch → NETWORK_ERROR", () => {
    expect(
      toAppError({ code: "", message: "TypeError: fetch failed", details: "", hint: "" }),
    ).toBe("NETWORK_ERROR");
    expect(toAppError(new TypeError("Failed to fetch"))).toBe("NETWORK_ERROR");
    expect(toAppError(new TypeError("NetworkError when attempting to fetch resource."))).toBe(
      "NETWORK_ERROR",
    );
  });

  it("cualquier otro error → UNKNOWN", () => {
    expect(
      toAppError({ code: "23505", message: "duplicate key value violates unique constraint" }),
    ).toBe("UNKNOWN");
    expect(toAppError(new Error("boom"))).toBe("UNKNOWN");
    expect(toAppError("texto")).toBe("UNKNOWN");
    expect(toAppError(null)).toBe("UNKNOWN");
  });
});

describe("ERROR_MESSAGES", () => {
  const ALL: AppErrorCode[] = [...BUSINESS, "NETWORK_ERROR", "UNKNOWN"];

  it("hay un mensaje en español para cada código", () => {
    for (const code of ALL) expect(ERROR_MESSAGES[code], code).toMatch(/\S/);
    expect(Object.keys(ERROR_MESSAGES).sort()).toEqual([...ALL].sort());
  });

  it("los mensajes no contienen detalles internos", () => {
    for (const message of Object.values(ERROR_MESSAGES)) {
      expect(message).not.toMatch(/sql|postgres|rpc|P0001|42501|stack|supabase|null|undefined/i);
    }
  });
});

describe("VALIDATION_OPTION_COUNT", () => {
  it("anuncia el rango vigente de 2 a 6 opciones", () => {
    expect(ERROR_MESSAGES.VALIDATION_OPTION_COUNT).toBe("Añade entre 2 y 6 opciones.");
  });
});
