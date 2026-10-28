import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const script = fileURLToPath(new URL("../../../scripts/vercel-ignore-build.mjs", import.meta.url));
const configFile = fileURLToPath(new URL("../../../vercel.json", import.meta.url));
const directories: string[] = [];

afterEach(() => {
  directories.splice(0).forEach((directory) => rmSync(directory, { recursive: true, force: true }));
});

function decision(environment: string, branch: string, manifest: string | null = "{}") {
  const directory = mkdtempSync(join(tmpdir(), "opinion-build-"));
  directories.push(directory);
  if (manifest !== null) writeFileSync(join(directory, "package.json"), manifest);
  return spawnSync(process.execPath, [script], {
    cwd: directory,
    env: { ...process.env, VERCEL_ENV: environment, VERCEL_GIT_COMMIT_REF: branch },
    encoding: "utf8",
  });
}

describe("Ignored Build Step de Vercel (0 omite, 1 compila)", () => {
  it.each([
    ["production", "main", 0],
    ["production", "codex/example", 0],
    ["production", "", 0],
    ["production", "release", 1],
    ["preview", "main", 0],
    ["preview", "codex/example", 1],
    ["preview", "release", 1],
    ["preview", "", 1],
    ["development", "", 1],
  ])("%s desde %s devuelve %s", (environment, branch, status) => {
    const result = decision(environment as string, branch as string);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(status);
  });

  it("omite un checkout documental sin manifest", () => {
    const result = decision("production", "release", null);
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("deja que el build informe de un manifest inválido", () => {
    const result = decision("preview", "feature/example", "invalid json");
    expect(result.stderr).toBe("");
    expect(result.status).toBe(1);
  });

  it("conecta el script probado a vercel.json", () => {
    const config = JSON.parse(readFileSync(configFile, "utf8"));
    expect(config.ignoreCommand).toBe("node scripts/vercel-ignore-build.mjs");
  });
});
