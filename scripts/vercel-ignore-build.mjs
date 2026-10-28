import { existsSync } from "node:fs";

// Vercel invierte el convenio habitual: 0 omite el build, 1 lo ejecuta.
const branch = process.env.VERCEL_GIT_COMMIT_REF;
const production = process.env.VERCEL_ENV === "production";

if (!existsSync("package.json")) {
  console.log("Omitir: checkout sin aplicación.");
  process.exit(0);
}

if (branch === "main" || (production && branch !== "release")) {
  console.log("Omitir: main no despliega; producción requiere la rama release.");
  process.exit(0);
}

console.log("Continuar: preview o versión procedente de release.");
process.exit(1);
