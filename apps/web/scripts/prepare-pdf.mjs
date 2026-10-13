import { cp, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// Resolve through the parser package so runtime and worker always match.
const require = createRequire(import.meta.url);
const parserRequire = createRequire(require.resolve("@parsy/file-parser"));
const packagePath = parserRequire.resolve("pdfjs-dist/package.json");
const { version } = JSON.parse(await readFile(packagePath, "utf8"));
const source = dirname(packagePath);
const destination = fileURLToPath(new URL(`../public/pdfjs/${version}/`, import.meta.url));
await mkdir(destination, { recursive: true });
await cp(join(source, "legacy/build/pdf.worker.min.mjs"), join(destination, "pdf.worker.min.mjs"));
await Promise.all(["cmaps", "standard_fonts", "wasm"].map(name =>
  cp(join(source, name), join(destination, name), { recursive: true }),
));
await cp(join(source, "LICENSE"), join(destination, "LICENSE"));

// These version directories are generated, never user documents. Do not ship
// old vulnerable workers left behind by a previous local dev/build run.
for (const entry of await readdir(dirname(destination), { withFileTypes: true })) {
  if (entry.isDirectory() && /^\d+\.\d+\.\d+$/.test(entry.name) && entry.name !== version) {
    await rm(join(dirname(destination), entry.name), { recursive: true });
  }
}
console.log(`Local PDF.js ${version} ready`);
