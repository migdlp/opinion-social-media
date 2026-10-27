import { defineConfig } from "vitest/config";

// Suite de ataques contra la pila Supabase local (scripts/check-security-local.sh).
export default defineConfig({
  test: {
    include: ["tests/security/**/*.test.ts"],
    testTimeout: 30_000,
    fileParallelism: false,
  },
});
