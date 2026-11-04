import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES, toAppError } from "./errors";
import { createPoll } from "./operations";
import { fakeSupabase } from "./testing/fake-supabase";

const ID = "11111111-2222-4333-8444-555555555555";

describe("createPoll con descripción (POLL-002)", () => {
  it("envía p_description cuando hay texto", async () => {
    const { supabase, queries } = fakeSupabase({ "rpc:create_poll": { data: ID, error: null } });
    const result = await createPoll(
      supabase,
      "¿Pregunta?",
      ["Sí", "No"],
      null,
      null,
      false,
      "Contexto de la encuesta",
    );
    expect(result).toEqual({ ok: true, data: { id: ID } });
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "create_poll",
      {
        p_question: "¿Pregunta?",
        p_options: ["Sí", "No"],
        p_description: "Contexto de la encuesta",
      },
    ]);
  });

  it.each([[undefined], [null], [""]])("sin descripción (%s) no envía p_description", async (d) => {
    const { supabase, queries } = fakeSupabase({ "rpc:create_poll": { data: ID, error: null } });
    await createPoll(supabase, "¿Pregunta?", ["Sí", "No"], null, null, false, d);
    expect(queries[0].calls[0]).toEqual([
      "rpc",
      "create_poll",
      { p_question: "¿Pregunta?", p_options: ["Sí", "No"] },
    ]);
  });

  it("propaga DESCRIPTION_INVALID con su texto exacto", async () => {
    const { supabase } = fakeSupabase({
      "rpc:create_poll": { data: null, error: { code: "P0001", message: "DESCRIPTION_INVALID" } },
    });
    expect(await createPoll(supabase, "¿Pregunta?", ["Sí", "No"], null, null, false, "x")).toEqual({
      ok: false,
      error: "DESCRIPTION_INVALID",
    });
    expect(toAppError({ code: "P0001", message: "DESCRIPTION_INVALID" })).toBe(
      "DESCRIPTION_INVALID",
    );
    expect(ERROR_MESSAGES.DESCRIPTION_INVALID).toBe(
      "La descripción admite hasta 500 caracteres de texto.",
    );
  });
});
