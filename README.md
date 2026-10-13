# Toolora

> A local-first workspace for JSON and everyday file tools.

Work with JSON, Word, Excel, and PDF files in your browser. Your data stays on
your device.

Built with **Next.js 15 · React 19 · TypeScript · Tailwind CSS v4 · Monaco
Editor**, organized as a **pnpm + Turborepo monorepo**.

---

## Tools

The JSON workspace groups related operations on one page:

| Tool | Route | What it does |
| :--- | :--- | :--- |
| **JSON workspace** | `/json` | Format, minify, validate, inspect as a tree, compare, repair, and convert JSON |
| **Word parser** | `/word-parser` | Extract text from DOCX files |
| **Excel editor** | `/excel-parser` | Read, edit, and export workbook data |
| **PDF reader** | `/pdf-parser` | Open and read PDF pages, including scanned documents |

JSON tools include:

- **Monaco Editor** input + output panes with syntax highlighting
- **Web Worker** processing — the UI stays responsive even on multi-MB JSON
- **Main-thread fallback** — if a Worker can't be created, it still works
- **Copy / Download / Clear / Load sample** actions
- **Live validation** with the offending line highlighted in the gutter
- **Dark / light theme** with system preference
- **Privacy by design** — no uploads, no telemetry; only UI preferences are
  persisted locally (never your JSON)

Older JSON tool URLs redirect to the matching mode under `/json`.

---

## 🏗️ Architecture

```
Browser
  └── Next.js App (apps/web)
        ├── Monaco Editor (client-only, code-split)
        ├── JSON Engine   ← @parsy/json-core (pure functions)
        ├── Web Worker    ← offloads parse/stringify from the UI thread
        └── UI primitives ← shadcn-style components + Tailwind v4
```

**Design principles**

- **Local First** — all processing happens in the browser.
- **Data never uploaded** — there is no backend that stores user JSON.
- **Fast on big JSON** — heavy work runs in a Web Worker with graceful fallback.

### Monorepo layout

```
toolora/
├── apps/
│   └── web/                      # Next.js 15 application
│       ├── app/                  # routes: /, /json, /word-parser, …
│       ├── components/           # ui (shadcn), layout, editor, formatter
│       ├── hooks/                # use-json-worker, use-copy
│       ├── workers/              # json.worker.ts
│       ├── store/                # zustand (preferences only)
│       └── lib/                  # utils, sample JSON
└── packages/
    ├── json-core/                # framework-agnostic JSON primitives ⭐
    ├── toolkit/                  # framework-agnostic tool registry + extension API ⭐
    ├── file-parser/              # local DOCX/XLSX/XLS extraction + PDF.js viewer API ⭐
    ├── ui/                       # shared UI compatibility view + design tokens
    └── converter/                # JSON→code generation
```

Internal packages ship **raw TypeScript** and are transpiled on the fly by
Next.js (`transpilePackages`) — no per-package build step needed.

## 🧰 Adding a tool

Tool metadata lives in `packages/toolkit/src/index.ts`. Add one
`ToolDefinition` there with a stable `id`, URL `slug`, `renderer`, category,
status, and translation namespaces. The web navigation, homepage, and sitemap
read the same registry, so they update automatically. Add the matching page
renderer under `apps/web/components` and localized `tools.<slug>` messages.

For app-specific integrations, use `createToolRegistry([...definitions])` to
compose a separate registry. Duplicate ids and slugs fail immediately instead
of producing broken routes.

## 📄 Local file tools

`@parsy/file-parser` provides browser-side Word (`.docx`) and Excel
(`.xlsx`/`.xls`) parsing, plus `openPdf(file)` for PDF page rendering. The
selected file stays in the browser; no Microsoft Office, PDF reader, backend,
or upload is required. The web app exposes them at:

- `/word-parser` — extract DOCX text
- `/excel-parser` — edit worksheet cells and export an XLSX file
- `/pdf-parser` — view PDF pages, navigate, zoom, rotate, and download the original

The PDF reader renders page graphics, including scanned or image-only PDFs; it
does not need a text layer. Password-protected PDFs must be unlocked before
opening them here. The package still offers `parseFile(file, { kind: "pdf" })`
for consumers that explicitly need text extraction.

PDF.js runs in a local worker. The web app prepares matching worker, CMap,
standard-font and WASM assets at `public/pdfjs/<version>/` during dev/build.
Other consumers of `@parsy/file-parser` must host the same assets from their
installed `pdfjs-dist` package at `/pdfjs/<version>/`, or pass
`pdfAssetBaseUrl` to `parseFile` to override that directory.

---

## 🚀 Getting started

### Prerequisites

- **Node.js 22.13+ (22 LTS), or 24+** — required by PDF.js; `.nvmrc` selects Node 22.
- **pnpm 10.7.0** (see the pinned `packageManager` version)

### Install & run

```bash
nvm use          # if you use nvm; install Node 22 first when needed
pnpm install
pnpm dev
```

Then open **http://localhost:3000**.

Development and build commands automatically copy the installed Monaco runtime
to `apps/web/public/monaco/<version>/vs`. Editors, language services, and workers
load from this local path rather than a CDN. These generated assets are ignored
by Git, included in the build cache, and must be deployed with the app's `public`
directory. The same applies to the generated PDF.js assets in
`apps/web/public/pdfjs/<version>/`.

For navigation performance checks, use a production build: development mode
compiles routes on demand and does not enable Next.js route prefetching.

### Other scripts

```bash
pnpm build        # production build (all packages, via Turborepo)
pnpm --filter @parsy/web start  # serve the production build
pnpm typecheck    # tsc --noEmit across the workspace
pnpm lint         # next lint
pnpm clean        # remove build artifacts + node_modules
```

---

## 🌍 Internationalization (i18n)

The app is fully localized for **中文 (`zh`, default)** and **English (`en`)**,
powered by [`next-intl`](https://next-intl.dev/) with locale-prefixed routing.

- **URLs**: `/zh/...` and `/en/...`. The bare root `/` 307-redirects to `/zh`.
- **Switch language**: the globe icon in the header — it preserves the current
  path and updates the URL.
- **SEO**: `sitemap.xml` emits one
  entry per (locale × route) with `hreflang` alternates; `<html lang>` and all
  metadata are localized.

### Adding a language

1. Add the code to `locales` in `apps/web/i18n/routing.ts`.
2. Create `apps/web/messages/<code>.json` (copy `zh.json` as a template).
3. (Optional) Add the locale label to the switcher in
   `apps/web/components/language-toggle.tsx`.

That's it — routing, sitemap, and metadata pick it up automatically.

### How strings are organized

- All UI text lives in `apps/web/messages/{zh,en}.json`, organized by namespace
  (`site`, `nav`, `tools`, `home`, `tool`, `errors`, `metadata`, …).
- Components read strings via `useTranslations("<namespace>")` (client) or
  `getTranslations(...)` (server).
- **Error messages from `@parsy/json-core`** (which runs in a Web
  Worker) are returned as **stable codes** (e.g. `"unexpected_token"`), then
  mapped to localized strings in the UI via the `errors.*` namespace. This keeps
  the core library locale-free.
- **`@parsy/ui`** contains no display strings — only route metadata.
  Tool titles/descriptions live in the message files and are looked up by slug.

---

## 🔒 Security & privacy

- **No backend storage.** There is no API route that receives or persists user
  JSON. The app is a static front end.
- **Local persistence only stores preferences** (indent size, word wrap) — never
  your JSON. See `apps/web/store/json-store.ts` (`partialize`).
- Output is rendered through Monaco / standard React escaping to avoid XSS.
- Dependency upgrades and compatibility overrides are documented in
  [docs/dependency-security.md](docs/dependency-security.md). Run `pnpm audit`
  after changing dependencies; do not suppress advisories to make the check pass.

---

## 🧩 Tech stack

| Area | Choice |
| :--- | :--- |
| Framework | Next.js 15 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui-style components |
| Editor | Monaco Editor (`@monaco-editor/react`) |
| i18n | next-intl (`zh` default + `en`, `/[locale]` routing) |
| State | Zustand (+ persist middleware) |
| Tooling | TypeScript 5, Turborepo, pnpm workspaces |
| Concurrency | Web Workers (`new Worker(new URL(...))`) |

---

## 📦 Project origin

Based on the _Toolora_ design document (v1.0). This repository
implements **Sprint 1** of the roadmap. Sprints 2–4 (Tree, Diff, Repair,
JSONPath, Schema, Converter, SEO sub-pages, CI, open-source docs) are planned.

---

## 📄 License

MIT © Morainet
