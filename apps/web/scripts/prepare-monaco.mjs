import { cp, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Serve the installed runtime locally, including its CSS, fonts and workers.
// The versioned URL stays in sync with lib/monaco.ts after dependency upgrades.
const require = createRequire(import.meta.url);
const packagePath = require.resolve("monaco-editor/package.json");
const { version } = JSON.parse(await readFile(packagePath, "utf8"));
const webRoot = fileURLToPath(new URL("../", import.meta.url));
const destination = join(webRoot, "public", "monaco", version, "vs");

await mkdir(destination, { recursive: true });
await cp(join(dirname(packagePath), "min", "vs"), destination, { recursive: true });
console.log(`Local Monaco ${version} ready`);
