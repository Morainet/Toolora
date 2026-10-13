# Dependency security maintenance

Reviewed on 2026-10-13. This documents the dependency changes, not a guarantee
that arbitrary uploaded documents are safe or that future advisories cannot occur.

## Runtime updates

- Next.js and its ESLint config stay on the 15.5 maintenance line, at least
  15.5.27, addressing the reported RCE and cache-poisoning advisories without
  migrating the application to Next.js 16.
- PDF.js is upgraded to 6.x (at least 6.2.108). The application only calls the
  text-extraction API; it does not initialize the PDF viewer's scripting manager.
  Worker and supporting assets are copied from the **installed** package, so
  their versions cannot diverge. Preparation removes stale generated version
  directories under `apps/web/public/pdfjs/` after the new assets are ready.
- `next-intl` is upgraded to 4.x (at least 4.9.2). Locale configuration already
  returns `locale` and awaits `requestLocale`; both `/zh` and `/en` must be tested.
- SheetJS uses the official versioned
  [0.20.3 package](https://docs.sheetjs.com/docs/getting-started/installation/nodejs/).
  The public npm `xlsx` release remains at 0.18.5 and lacks security fixes.
  The tarball checksum is locked in `pnpm-lock.yaml`; do not revert to `xlsx@latest`
  on npm. This change preserves both XLS and XLSX support.
- Vitest is upgraded to at least 4.1.11.

## Narrow dependency overrides

The root `package.json` holds overrides for indirect dependencies whose parents
still resolve vulnerable versions. Reassess each override after parent upgrades:

| Override | Reason and compatibility check |
| --- | --- |
| `next > postcss` → 8.5.23 | Fix source-map file disclosure and CSS serialization advisories; same PostCSS major, verified by production build. |
| `next > sharp` → 0.35.5 | Fix bundled native image-decoder vulnerabilities; verify an actual image optimization request, not just module loading. |
| Older `js-yaml` 4.x, `nanoid` 3.x, `source-map-js`, `brace-expansion` 1.x/5.x | Resolve to patched versions within their respective release lines. |
| `mammoth > argparse` → 2.0.1 | Remove the vulnerable `sprintf-js` dependency. Argparse 2 retains legacy v1 aliases; the regression test invokes Mammoth's actual CLI help. DOCX extraction uses Mammoth's browser bundle and is tested separately. |
| `@next/eslint-plugin-next > fast-glob` → `tinyglobby` 0.2.15 | Remove the unpatched `braces` chain. This is **only** for this plugin, not a global replacement: its sole call is `globSync(pattern, {onlyDirectories: true})`. Tests exercise the plugin's actual `getRootDirs` with default, wildcard, brace, and array settings. If future plugin code adds other fast-glob APIs, reassess the alias. |

No audit exclusions, ignored CVEs, or disabled lint rules are used to hide alerts.

## Verification

Use Node 22.13+ (22 LTS) or Node 24+; the PDF.js package requires it.

```sh
pnpm install --frozen-lockfile
pnpm audit
pnpm exec vitest run
pnpm typecheck
pnpm --filter @parsy/web build
```

Browser regression should cover multi-page PDF text and error recovery, DOCX
text, XLS/XLSX import-edit-export, JSON formatting, language switching, and an
image optimization request. GitHub Dependabot's repository-level status is
separate from local audit output and only refreshes after changes are pushed
and scanned. Do not claim the remote alerts are closed from a local audit alone.

### Verified result (2026-10-13)

- Installed: Next.js 15.5.27, PDF.js 6.4.299, next-intl 4.14.9,
  SheetJS 0.20.3, sharp 0.35.5, Vitest 4.1.11.
- Full local dependency audit: 0 advisories (previously 30).
- Frozen-lockfile install, 68 tests, all workspace type checks and production
  build passed using Node 24.19.0. Two pre-existing lint warnings remain in
  `json-repair.tsx` and `tree-node.tsx`; they are unrelated to dependency security.
- Production browser checks passed for multi-page PDF, DOCX, XLS/XLSX, Excel
  cell editing and exported workbook contents, JSON formatting, and language
  switching. Browser console had no warnings/errors in this run.
- Actual Next.js image optimization returned HTTP 200 with a resized 96-pixel
  WebP produced by sharp 0.35.5.
