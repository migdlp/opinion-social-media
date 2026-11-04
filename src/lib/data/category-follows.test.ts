import { describe, expect, it } from "vitest";
import { followCategory, listMyCategories, unfollowCategory } from "./operations";
import { fakeSupabase, networkThrow } from "./testing/fake-supabase";

describe("followCategory / unfollowCategory (FEED-006)", () => {
  it.each([
    ["follow_category", followCategory],
    ["unfollow_category", unfollowCategory],
  ])("%s llama a la RPC con el slug", async (rpc, run) => {
    const { supabase, queries } = fakeSupabase({ [`rpc:${rpc}`]: { data: null, error: null } });
    expect(await run(supabase, "deportes")).toEqual({ ok: true, data: undefined });
    expect(queries[0].calls[0]).toEqual(["rpc", rpc, { p_slug: "deportes" }]);
  });

  it.each(["INVALID_CATEGORY", "AUTH_REQUIRED"])("followCategory propaga %s", async (code) => {
    const { supabase } = fakeSupabase({
      "rpc:follow_category": { data: null, error: { code: "P0001", message: code } },
    });
    expect(await followCategory(supabase, "Deportes")).toEqual({ ok: false, error: code });
  });

  it("un fallo de red no lanza", async () => {
    const { supabase } = fakeSupabase({ "rpc:unfollow_category": networkThrow });
    expect(await unfollowCategory(supabase, "deportes")).toEqual({
      ok: false,
      error: "NETWORK_ERROR",
    });
  });
});

describe("listMyCategories (FEED-006)", () => {
  it("devuelve slug y nombre en el orden del servidor", async () => {
    const { supabase, queries } = fakeSupabase({
      "rpc:list_my_categories": {
        data: [
          { slug: "deportes", name: "Deportes" },
          { slug: "tecnologia", name: "Tecnología" },
        ],
        error: null,
      },
    });
    expect(await listMyCategories(supabase)).toEqual({
      ok: true,
      data: [
        { slug: "deportes", name: "Deportes" },
        { slug: "tecnologia", name: "Tecnología" },
      ],
    });
    expect(queries[0].calls[0].slice(0, 2)).toEqual(["rpc", "list_my_categories"]);
  });

  it("sin sesión propaga AUTH_REQUIRED y un fallo de red no lanza", async () => {
    const auth = fakeSupabase({
      "rpc:list_my_categories": { data: null, error: { code: "P0001", message: "AUTH_REQUIRED" } },
    });
    expect(await listMyCategories(auth.supabase)).toEqual({ ok: false, error: "AUTH_REQUIRED" });
    const net = fakeSupabase({ "rpc:list_my_categories": networkThrow });
    expect(await listMyCategories(net.supabase)).toEqual({ ok: false, error: "NETWORK_ERROR" });
  });
});
