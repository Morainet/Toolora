"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import Editor, { type OnMount, type OnChange } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

/**
 * Monaco is strictly client-only (it touches `window` / workers at module
 * load). We gate it behind `next/dynamic` with `ssr: false` so it never
 * runs during server rendering.
 *
 * The outer `MonacoEditor` (the default export below) is a thin server-safe
 * wrapper that renders the dynamically-imported inner editor on the client.
 */

interface MonacoEditorProps {
  value: string;
  language?: string;
  readOnly?: boolean;
  wordWrap?: boolean;
  onChange?: (value: string) => void;
  /** 1-based line numbers to highlight as errors (e.g. from validation). */
  errorLine?: number | null;
  className?: string;
  /** Optional label for screen readers. */
  ariaLabel?: string;
  /** Localized "loading" text shown while Monaco boots. */
  loadingLabel?: string;
}

function MonacoEditorInner({
  value,
  language = "json",
  readOnly = false,
  wordWrap = false,
  onChange,
  errorLine,
  className,
  ariaLabel,
  loadingLabel,
}: MonacoEditorProps) {
  const { resolvedTheme } = useTheme();
  const monacoRef = React.useRef<Parameters<OnMount>[1] | null>(null);
  const editorRef = React.useRef<Parameters<OnMount>[0] | null>(null);
  const decorationsRef = React.useRef<string[]>([]);

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Define custom JSON-friendly themes tuned to our brand palette.
    // Editor colors follow the blue-white app palette.
    monaco.editor.defineTheme("parsy-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "string.key.json", foreground: "175cd3" },
        { token: "string.value.json", foreground: "087443" },
        { token: "number.json", foreground: "a15c10" },
        { token: "keyword.json", foreground: "475f9a" },
        { token: "keyword.json", fontStyle: "italic" },
        { token: "string.value.json", fontStyle: "" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#243247",
        "editorLineNumber.foreground": "#9aabbe",
        "editorLineNumber.activeForeground": "#526174",
        "editor.selectionBackground": "#d8e8ff",
        "editor.inactiveSelectionBackground": "#ecf3ff",
        "editor.lineHighlightBackground": "#f5f8fc",
        "editor.lineHighlightBorder": "#00000000",
        "editorCursor.foreground": "#175cd3",
        "editorIndentGuide.background1": "#e4ebf3",
        "editorIndentGuide.activeBackground1": "#9aabbe",
        "editorBracketMatch.background": "#d8e8ff80",
        "editorBracketMatch.border": "#7ca8ee",
      },
    });

    // Dark theme keeps syntax distinct without neon accents.
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
        "editor.inactiveSelectionBackground": "#263e63",
        "editor.lineHighlightBackground": "#263244",
        "editor.lineHighlightBorder": "#00000000",
        "editorCursor.foreground": "#84adff",
        "editorIndentGuide.background1": "#384659",
        "editorIndentGuide.activeBackground1": "#65778f",
        "editorBracketMatch.background": "#31558b88",
        "editorBracketMatch.border": "#84adff",
      },
    });

    // Apply the theme matching the current color mode.
    monaco.editor.setTheme(resolvedTheme === "dark" ? "parsy-dark" : "parsy-light");

    // Configure JSON-friendly defaults.
    monaco.languages.json?.jsonDefaults.setDiagnosticsOptions({
      validate: !readOnly,
      allowComments: false,
      schemaValidation: "error",
    });
  };

  // Re-apply the custom theme when the color mode changes.
  React.useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;
    monaco.editor.setTheme(resolvedTheme === "dark" ? "parsy-dark" : "parsy-light");
  }, [resolvedTheme]);

  // Re-apply the error-line decoration whenever it changes.
  React.useEffect(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;

    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      errorLine
        ? [
            {
              range: new monaco.Range(errorLine, 1, errorLine, 1),
              options: {
                isWholeLine: true,
                className: "jfp-error-line",
                glyphMarginClassName: "jfp-error-glyph",
              },
            },
          ]
        : [],
    );
  }, [errorLine]);

  const handleChange: OnChange = (val) => {
    onChange?.(val ?? "");
  };

  return (
    <div className={cn("h-full w-full overflow-hidden", className)}>
      <Editor
        language={language}
        value={value}
        theme={resolvedTheme === "dark" ? "parsy-dark" : "parsy-light"}
        onMount={handleMount}
        onChange={handleChange}
        loading={
          <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
            {loadingLabel ?? "Loading…"}
          </div>
        }
        options={{
          readOnly,
          minimap: { enabled: false },
          // Industry-standard code-editor values: 14px is the sweet spot
          // (matches VS Code / CodeMirror / jsoneditoronline defaults).
          // line-height 21 ≈ 1.5x for comfortable scanning.
          fontSize: 14,
          lineHeight: 21,
          // letterSpacing 0 — monospace fonts self-align; any tracking breaks
          // JSON indentation alignment.
          letterSpacing: 0,
          fontFamily:
            "'JetBrains Mono', 'Fira Code', var(--font-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
          fontLigatures: true,
          wordWrap: wordWrap ? "on" : "off",
          scrollBeyondLastLine: false,
          smoothScrolling: true,
          cursorSmoothCaretAnimation: "on",
          cursorBlinking: "smooth",
          tabSize: 2,
          insertSpaces: true,
          renderLineHighlight: "all",
          roundedSelection: true,
          padding: { top: 14, bottom: 14 },
          guides: {
            indentation: true,
            bracketPairs: true,
          },
          bracketPairColorization: {
            enabled: true,
          },
          scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
            useShadows: false,
          },
          automaticLayout: true,
          ariaLabel: ariaLabel ?? "JSON editor",
        }}
      />
    </div>
  );
}

// Server-safe wrapper: only mounts the real editor in the browser.
// We assert the dynamic component to a concrete React component type so the
// JSX parser and prop-checking have a stable signature to work against.
const MonacoEditor = dynamic<MonacoEditorProps>(
  async () => ({ default: MonacoEditorInner }),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
        Loading editor…
      </div>
    ),
  },
) as unknown as React.ComponentType<MonacoEditorProps>;

export default MonacoEditor;
