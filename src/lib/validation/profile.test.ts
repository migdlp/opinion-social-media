import { describe, expect, it } from "vitest";
import {
  DISPLAY_NAME_ERROR,
  USERNAME_ERROR,
  USERNAME_RESERVED_ERROR,
  hasProfileErrors,
  validateProfileInput,
} from "./profile";

describe("validateProfileInput (mismas reglas que upsert_my_profile)", () => {
  it.each(["ana_23", "Ana_23", "bea", "a1_", "x".padEnd(20, "y")])(
    "admite el usuario %s",
    (username) => {
      expect(validateProfileInput(username, "").username).toBeUndefined();
    },
  );

  it.each(["", "an", "1ana", "ana 23", " ana", "ana-23", "ñandú_1", "a".repeat(21)])(
    "rechaza el usuario «%s»",
    (username) => {
      expect(validateProfileInput(username, "").username).toBe(USERNAME_ERROR);
    },
  );

  it.each(["admin", "settings", "u", "moderacion", "support"])(
    "rechaza el nombre reservado %s",
    (username) => {
      // «u» no cumple el formato; el resto, sí pero reservado.
      const error = validateProfileInput(username, "").username;
      expect(error).toBe(username === "u" ? USERNAME_ERROR : USERNAME_RESERVED_ERROR);
    },
  );

  it("el nombre visible es opcional y se normaliza antes de medirlo", () => {
    expect(validateProfileInput("ana_23", "").displayName).toBeUndefined();
    expect(validateProfileInput("ana_23", "   ").displayName).toBeUndefined();
    expect(validateProfileInput("ana_23", "  Ana   María ").displayName).toBeUndefined();
    expect(validateProfileInput("ana_23", "x".repeat(50)).displayName).toBeUndefined();
    expect(validateProfileInput("ana_23", "x".repeat(51)).displayName).toBe(DISPLAY_NAME_ERROR);
  });

  it("hasProfileErrors resume", () => {
    expect(hasProfileErrors(validateProfileInput("ana_23", "Ana"))).toBe(false);
    expect(hasProfileErrors(validateProfileInput("1", ""))).toBe(true);
  });
});
