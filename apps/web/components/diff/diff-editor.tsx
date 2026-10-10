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
        { token: "string.key.json", foreground: "175cd3" },
        { token: "string.value.json", foreground: "087443" },
        { token: "number.json", foreground: "a15c10" },
        { token: "keyword.json", foreground: "475f9a", fontStyle: "italic" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#243247",
        "editorLineNumber.foreground": "#9aabbe",
        "editorLineNumber.activeForeground": "#526174",
        "editor.selectionBackground": "#d8e8ff",
        "editor.lineHighlightBackground": "#f5f8fc",
        "editorCursor.foreground": "#175cd3",
        "editorIndentGuide.background1": "#e4ebf3",
        "editorIndentGuide.activeBackground1": "#9aabbe",
      },
    });
    monaco.editor.defineTheme("parsy-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "string.key.json", foreground: "8db4ff" },
        { token: "string.value.json", foreground: "91d5aa" },
        { token: "number.json", foreground: "f0c182" },
        { token: "keyword.json", foreground: "b5c9ee", fontStyle: "italic" },
      ],
      colors: {
        "editor.background": "#202a3a",
        "editor.foreground": "#ecf2fb",
        "editorLineNumber.foreground": "#65778f",
        "editorLineNumber.activeForeground": "#aab8cc",
        "editor.selectionBackground": "#31558b",
        "editor.lineHighlightBackground": "#263244",
        "editorCursor.foreground": "#84adff",
        "editorIndentGuide.background1": "#384659",
        "editorIndentGuide.activeBackground1": "#65778f",
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
