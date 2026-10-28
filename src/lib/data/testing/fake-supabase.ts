// Cliente Supabase falso para tests: registra la cadena de llamadas de cada
// consulta o RPC y responde lo configurado. No hace peticiones de red.
import type { SupabaseClient } from "@supabase/supabase-js";

export type Call = [method: string, ...args: unknown[]];
export type FakeResponse = { data: unknown; error: unknown } | (() => never);
export type FakeQuery = { target: string; calls: Call[] };

const CHAIN = [
  "select",
  "order",
  "limit",
  "or",
  "eq",
  "in",
  "maybeSingle",
  "single",
  "insert",
  "upsert",
  "delete",
];

// responses: por tabla («polls») o RPC («rpc:vote_poll»). Un array se consume en orden.
export function fakeSupabase(responses: Record<string, FakeResponse | FakeResponse[]>) {
  const queries: FakeQuery[] = [];
  const next = (target: string): FakeResponse => {
    const r = responses[target];
    if (Array.isArray(r)) return r.shift() ?? { data: null, error: null };
    return r ?? { data: null, error: null };
  };
  const builder = (target: string, first: Call) => {
    const query = { target, calls: [first] };
    queries.push(query);
    const b: Record<string, unknown> = {};
    for (const method of CHAIN) {
      b[method] = (...args: unknown[]) => {
        query.calls.push([method, ...args]);
        return b;
      };
    }
    b.then = (resolve: (r: unknown) => unknown, reject: (e: unknown) => unknown) => {
      const r = next(target);
      return (
        typeof r === "function" ? Promise.reject(new TypeError("fetch failed")) : Promise.resolve(r)
      ).then(resolve, reject);
    };
    return b;
  };
  const client = {
    from: (table: string) => builder(table, ["from", table]),
    rpc: (name: string, args: unknown) => builder(`rpc:${name}`, ["rpc", name, args]),
  };
  return { supabase: client as unknown as SupabaseClient, queries };
}

// Respuesta que simula que fetch lanza (caída de red fuera de supabase-js).
export const networkThrow = (() => {
  throw new TypeError("fetch failed");
}) as () => never;
