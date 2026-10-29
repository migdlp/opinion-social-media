// Comprobación de sólo lectura: detecta frontend desplegado contra esquema ausente.
// Usa exclusivamente URL y clave publicable; no crea usuarios ni encuestas.
import assert from "node:assert/strict";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
assert(url && key, "Configura URL y Publishable key del mismo proyecto.");
assert(key.startsWith("sb_publishable_"), "Se requiere una clave publicable, no administrativa.");

async function request(path, body) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { apikey: key, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  return { status: response.status, data: await response.json() };
}

const feed = await request("rpc/get_feed", {
  p_mode: "recientes",
  p_category: null,
  p_cursor: null,
});
assert.equal(feed.status, 200, `get_feed no disponible (${feed.data.code ?? feed.status}).`);
assert(Array.isArray(feed.data), "El feed debe devolver una lista.");

const categories = await request("categories?select=slug,name&limit=20");
assert.equal(categories.status, 200, "No se pueden cargar categorías.");
assert(Array.isArray(categories.data) && categories.data.length > 0, "Faltan categorías.");

const profile = await request("profiles?select=username&limit=0");
assert.equal(profile.status, 200, "No está disponible el contrato de perfiles públicos.");

const results = await request("rpc/get_feed_results", { p_poll_ids: [] });
assert.equal(results.status, 200, "No está disponible la lectura segura de resultados.");
assert.deepEqual(results.data, []);

const following = await request("rpc/get_feed", { p_mode: "siguiendo" });
assert.equal(following.data.message, "AUTH_REQUIRED", "Siguiendo debe exigir sesión.");
assert(following.status >= 400);

const votes = await request("votes?select=id&limit=0");
assert(votes.status >= 400, "Los votos no deben estar disponibles al visitante.");

console.log("Contrato público OK: feed, categorías, perfiles y RPC; Siguiendo/votos protegidos.");
