import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "./errors";
import { getMyProfile, getProfileView, setProfileBio } from "./operations";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

const header = {
  username: "perfil_b",
  display_name: "Beto",
  is_private: false,
  followers_count: 2,
  following_count: 1,
  polls_count: 5,
  viewer_relation: "none",
  can_view_content: true,
};

describe("setProfileBio (PROFILE-001)", () => {
  it.each(["Me gusta debatir", null])("llama a set_profile_bio con %s", async (bio) => {
    const { supabase, queries } = fakeSupabase({
      "rpc:set_profile_bio": { data: null, error: null },
    });
    expect(await setProfileBio(supabase, bio)).toEqual({ ok: true, data: undefined });
    expect(queries[0].calls[0]).toEqual(["rpc", "set_profile_bio", { p_bio: bio }]);
  });

  it.each(["BIO_INVALID", "AUTH_REQUIRED", "PROFILE_REQUIRED"])("propaga %s", async (code) => {
    const { supabase } = fakeSupabase({
      "rpc:set_profile_bio": { data: null, error: { code: "P0001", message: code } },
    });
    expect(await setProfileBio(supabase, "hola")).toEqual({ ok: false, error: code });
  });

  it("un fallo de red no lanza", async () => {
    const { supabase } = fakeSupabase({ "rpc:set_profile_bio": networkThrow });
    expect(await setProfileBio(supabase, "hola")).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });

  it("BIO_INVALID tiene un mensaje para la interfaz", () => {
    expect(ERROR_MESSAGES.BIO_INVALID).toMatch(/280/);
  });
});

describe("la bio viaja con el perfil", () => {
  it("getMyProfile la devuelve en la misma consulta", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:get_my_profile": {
        data: [{ username: "ana_23", display_name: null, is_private: true, bio: "Mi bio" }],
        error: null,
      },
    });
    const r = await getMyProfile(supabase);
    expect(r.ok && r.data?.bio).toBe("Mi bio");
    expect(queries.map((q) => q.target)).toEqual(["rpc:get_my_profile"]);
  });

  it("getMyProfile sin bio (null) no la incluye", async () => {
    const { supabase } = fakeSupabase({
      "rpc:get_my_profile": {
        data: [{ username: "ana_23", display_name: null, is_private: false, bio: null }],
        error: null,
      },
    });
    const r = await getMyProfile(supabase);
    expect(r.ok && r.data && "bio" in r.data).toBe(false);
  });

  it("getProfileView la devuelve cuando el backend la entrega y no la inventa si no", async () => {
    const withBio = fakeSupabase({
      "rpc:get_profile": { data: [{ ...header, bio: "Hola, soy Beto" }], error: null },
    });
    const a = await getProfileView(withBio.supabase, "perfil_b");
    expect(a.ok && a.data.bio).toBe("Hola, soy Beto");

    const hidden = fakeSupabase({
      "rpc:get_profile": { data: [{ ...header, can_view_content: false, bio: null }], error: null },
    });
    const b = await getProfileView(hidden.supabase, "perfil_b");
    expect(b.ok && "bio" in b.data).toBe(false);
  });
});
