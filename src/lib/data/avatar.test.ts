import { describe, expect, it } from "vitest";
import type { AvatarIcon } from "@/lib/avatar-icons";
import {
  getMyProfile,
  getProfileView,
  listFollowers,
  listFollowRequests,
  setProfileAvatar,
} from "./operations";
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

describe("setProfileAvatar (AVATAR-001)", () => {
  it.each(["sol", null])("llama a set_profile_avatar con %s", async (icon) => {
    const { supabase, queries } = fakeSupabase({
      "rpc:set_profile_avatar": { data: null, error: null },
    });
    expect(await setProfileAvatar(supabase, icon as AvatarIcon | null)).toEqual({
      ok: true,
      data: undefined,
    });
    expect(queries[0].calls[0]).toEqual(["rpc", "set_profile_avatar", { p_icon: icon }]);
  });

  it.each(["AVATAR_INVALID", "AUTH_REQUIRED", "PROFILE_REQUIRED"])("propaga %s", async (code) => {
    const { supabase } = fakeSupabase({
      "rpc:set_profile_avatar": { data: null, error: { code: "P0001", message: code } },
    });
    expect(await setProfileAvatar(supabase, "sol")).toEqual({ ok: false, error: code });
  });

  it("un fallo de red no lanza", async () => {
    const { supabase } = fakeSupabase({ "rpc:set_profile_avatar": networkThrow });
    expect(await setProfileAvatar(supabase, "sol")).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});

describe("el icono viaja con el perfil", () => {
  it("getProfileView lo lee por @usuario de la columna pública", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:get_profile": { data: [header], error: null },
      profiles: { data: [{ username: "perfil_b", avatar_icon: "hoja" }], error: null },
    });
    const r = await getProfileView(supabase, "perfil_b");
    expect(r.ok && r.data.avatarIcon).toBe("hoja");
    const q = queries.find((x) => x.target === "profiles")!;
    expect(q.calls).toContainEqual(["select", "username, avatar_icon"]);
    expect(q.calls).toContainEqual(["in", "username", ["perfil_b"]]);
  });

  it("sin icono, con un valor fuera del catálogo o si falla la lectura, quedan las iniciales", async () => {
    for (const profiles of [
      { data: [{ username: "perfil_b", avatar_icon: null }], error: null },
      { data: [{ username: "perfil_b", avatar_icon: "https://x.test/a.png" }], error: null },
      { data: null, error: { code: "XX000", message: "boom" } },
      networkThrow,
    ]) {
      const { supabase } = fakeSupabase({
        "rpc:get_profile": { data: [header], error: null },
        profiles,
      });
      const r = await getProfileView(supabase, "perfil_b");
      expect(r.ok).toBe(true);
      expect(r.ok && r.data.avatarIcon).toBeFalsy();
    }
  });

  it("getMyProfile trae el icono propio en la misma consulta, sin un segundo viaje", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:get_my_profile": {
        data: [{ username: "ana_23", display_name: null, is_private: false, avatar_icon: "luna" }],
        error: null,
      },
    });
    const r = await getMyProfile(supabase);
    expect(r.ok && r.data?.avatarIcon).toBe("luna");
    expect(queries.map((q) => q.target)).toEqual(["rpc:get_my_profile"]);
  });

  it("getMyProfile ignora un icono fuera del catálogo", async () => {
    const { supabase } = fakeSupabase({
      "rpc:get_my_profile": {
        data: [{ username: "ana_23", display_name: null, is_private: false, avatar_icon: "x" }],
        error: null,
      },
    });
    const r = await getMyProfile(supabase);
    expect(r.ok && r.data?.avatarIcon).toBeFalsy();
  });

  it("las listas de seguidores y solicitudes piden los iconos de la página en una sola consulta", async () => {
    const rows = [
      { username: "ana_23", display_name: "Ana", cursor: "c1" },
      { username: "beto", display_name: null, cursor: "c2" },
    ];
    for (const run of [
      (s: Parameters<typeof listFollowers>[0]) => listFollowers(s, "perfil_b"),
      (s: Parameters<typeof listFollowRequests>[0]) => listFollowRequests(s),
    ]) {
      const { supabase, queries } = fakeSupabase({
        "rpc:list_followers": { data: rows, error: null },
        "rpc:list_follow_requests": { data: rows, error: null },
        profiles: { data: [{ username: "ana_23", avatar_icon: "sol" }], error: null },
      });
      const r = await run(supabase);
      expect(r.ok && r.data.users).toEqual([
        { username: "ana_23", displayName: "Ana", avatarIcon: "sol" },
        { username: "beto", displayName: null },
      ]);
      expect(queries.filter((q) => q.target === "profiles")).toHaveLength(1);
    }
  });

  it("una lista vacía no consulta perfiles", async () => {
    const { supabase, queries } = fakeSupabase({ "rpc:list_followers": { data: [], error: null } });
    await listFollowers(supabase, "perfil_b");
    expect(queries.some((q) => q.target === "profiles")).toBe(false);
  });
});
