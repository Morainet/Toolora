"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import type { editor } from "monaco-editor";

// Import the DiffEditor directly here (this whole file is client-only).
import { DiffEditor } from "@monaco-editor/react";

/**
 * Thin client-only wrapper around Monaco's DiffEditor.
 *
 * Lives in its own module so the parent can lazy-load it via `next/dynamic`
 * with `ssr: false` (Monaco touches `window` at module load). Also registers
 * the shared `parsy-light` / `parsy-dark` themes so the diff view matches the
 * rest of the app.
 */

/** Default diff-editor options — same typography scale as the regular editor. */
const DEFAULT_OPTIONS: editor.IDiffEditorConstructionOptions = {
  readOnly: true,
  renderSideBySide: true,
  minimap: { enabled: false },
  fontSize: 14,
  lineHeight: 21,
  fontFamily:
    "'JetBrains Mono', 'Fira Code', var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
  scrollBeyondLastLine: false,
  smoothScrolling: true,
  padding: { top: 14, bottom: 14 },
  guides: { indentation: true, bracketPairs: true },
  bracketPairColorization: { enabled: true },
  scrollbar: {
    verticalScrollbarSize: 10,
    horizontalScrollbarSize: 10,
    useShadows: false,
  },
  automaticLayout: true,
  renderOverviewRuler: false,
};

export interface TooloraDiffEditorProps {
  original: string;
  modified: string;
  /** Side-by-side (default) or inline diff rendering. */
  sideBySide?: boolean;
}

export default function TooloraDiffEditor({
  original,
  modified,
  sideBySide = true,
}: TooloraDiffEditorProps) {
  const { resolvedTheme } = useTheme();

  const handleBeforeMount = (monaco: Parameters<
    NonNullable<React.ComponentProps<typeof DiffEditor>["beforeMount"]>
  >[0]) => {
    // Define the shared themes (idempotent — Monaco ignores re-defines).
    monaco.editor.defineTheme("parsy-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "string.key.json", foreground: "4338ca" },
        { token: "string.value.json", foreground: "047857" },
        { token: "number.json", foreground: "b45309" },
        { token: "keyword.json", foreground: "7c3aed", fontStyle: "italic" },
      ],
      colors: {
        "editor.background": "#fcfcfd",
        "editor.foreground": "#1e293b",
        "editorLineNumber.foreground": "#cbd5e1",
        "editorLineNumber.activeForeground": "#64748b",
        "editor.selectionBackground": "#e0e7ff",
        "editor.lineHighlightBackground": "#f8fafc",
        "editorCursor.foreground": "#4f46e5",
        "editorIndentGuide.background1": "#eef2f7",
        "editorIndentGuide.activeBackground1": "#cbd5e1",
      },
    });
    monaco.editor.defineTheme("parsy-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "string.key.json", foreground: "a5b4fc" },
        { token: "string.value.json", foreground: "6ee7b7" },
        { token: "number.json", foreground: "fcd34d" },
        { token: "keyword.json", foreground: "c4b5fd", fontStyle: "italic" },
      ],
      colors: {
        "editor.background": "#0f1729",
        "editor.foreground": "#e2e8f0",
        "editorLineNumber.foreground": "#334155",
        "editorLineNumber.activeForeground": "#94a3b8",
        "editor.selectionBackground": "#312e81",
        "editor.lineHighlightBackground": "#111c33",
        "editorCursor.foreground": "#818cf8",
        "editorIndentGuide.background1": "#1e293b",
        "editorIndentGuide.activeBackground1": "#475569",
      },
    });
  };

  return (
    <DiffEditor
      original={original}
      modified={modified}
      language="json"
      theme={resolvedTheme === "dark" ? "parsy-dark" : "parsy-light"}
      beforeMount={handleBeforeMount}
      options={{ ...DEFAULT_OPTIONS, renderSideBySide: sideBySide }}
      loading={
        <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
          Loading…
        </div>
      }
    />
  );
}
