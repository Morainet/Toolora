import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const webRequire = createRequire(new URL("../package.json", import.meta.url));
const configRequire = createRequire(webRequire.resolve("eslint-config-next"));
const pluginRequire = createRequire(configRequire.resolve("@next/eslint-plugin-next"));
const { getRootDirs } = pluginRequire("./utils/get-root-dirs.js");
const root = fileURLToPath(new URL("../../../", import.meta.url));

describe("security dependency overrides", () => {
  it("keeps Next ESLint directory discovery working without the vulnerable braces chain", () => {
    const discovered: string[] = getRootDirs({ cwd: root, settings: { next: { rootDir: join(root, "{apps,packages}/*") } } });
    expect(discovered.map(path => resolve(path))).toEqual(expect.arrayContaining([
      join(root, "apps/web"), join(root, "packages/file-parser"),
    ]));
    expect(getRootDirs({ cwd: root, settings: {} })).toEqual([root]);
    const explicit = getRootDirs({ cwd: root, settings: { next: { rootDir: [join(root, "apps/*"), join(root, "packages/file-parser")] } } });
    expect(explicit.map((path: string) => resolve(path))).toEqual(expect.arrayContaining([
      join(root, "apps/web"), join(root, "packages/file-parser"),
    ]));
  });

  it("preserves Mammoth CLI argument handling after removing sprintf-js", () => {
    const parserRequire = createRequire(webRequire.resolve("@parsy/file-parser"));
    const mammothRoot = dirname(parserRequire.resolve("mammoth/package.json"));
    const help = execFileSync(process.execPath, [join(mammothRoot, "bin/mammoth"), "--help"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    expect(help).toContain("docx-path");
    expect(help).toContain("--output-format");
    expect(help).toContain("--style-map");
  });
});
