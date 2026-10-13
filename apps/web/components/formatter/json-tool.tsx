"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ArrowRight, CircleCheck, TriangleAlert, FileText } from "lucide-react";
import type { JsonErrorCode } from "@parsy/json-core";
import { Toolbar } from "@/components/formatter/toolbar";
import { StatusBar } from "@/components/formatter/status-bar";
import { useJsonWorker } from "@/hooks/use-json-worker";
import { useCopy } from "@/hooks/use-copy";
import { useHotkey } from "@/hooks/use-hotkey";
import { useJsonStore, type ToolMode } from "@/store/json-store";
import { SAMPLE_JSON } from "@/lib/sample-json";
import { embeddedWorkspaceClass, focusedWorkspaceClass } from "@/lib/workspace-layout";
import { cn, byteLength, formatBytes } from "@/lib/utils";

// Monaco is client-only; load it lazily.
const MonacoEditor = dynamic(() => import("@/components/editor/monaco-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  ),
});

interface JsonToolProps {
  /** Which mode the page opens in — also drives the default active tab. */
  initialMode: ToolMode;
  /** Localized heading shown above the editor (per-page). */
  title: string;
  description: string;
  showModeSwitch?: boolean;
  embedded?: boolean;
  focused?: boolean;
}

/**
 * Map a stable {@link JsonErrorCode} to its localized message via the
 * `errors.*` dictionary. Falls back to the generic `errors.unknown` if a code
 * is somehow missing from the dictionary.
 */
function useLocalizedErrorMessage() {
  const tErrors = useTranslations("errors");
  return React.useCallback(
    (code: string | undefined) => {
      const key = (code ?? "unknown") as JsonErrorCode;
      try {
        return tErrors(key);
      } catch {
        return tErrors("unknown");
      }
    },
    [tErrors],
  );
}

/**
 * The shared engine behind the formatter, validator, and minifier pages.
 * Same component, different default tab + localized copy.
 *
 * Data flow:
 *   user input → worker (or main-thread fallback) → output editor
 *   + live, debounced validation → status bar + error line highlight
 */
export function JsonTool({ initialMode, title, description, showModeSwitch = true, embedded = false, focused = false }: JsonToolProps) {
  const t = useTranslations("tool");
  const tEditor = useTranslations("editor");
  const localizeError = useLocalizedErrorMessage();

  const {
    input,
    output,
    indent,
    wordWrap,
    status,
    setInput,
    setOutput,
    setIndent,
    setStatus,
    reset,
  } = useJsonStore();

  const [localMode, setLocalMode] = React.useState<ToolMode>(initialMode);
  // The workspace controls its mode directly; changing it must not remount
  // Monaco or lose the input's cursor, scroll position and undo history.
  const mode = showModeSwitch ? localMode : initialMode;
  const activeMode = React.useRef<ToolMode | null>(mode);
  React.useEffect(() => {
    activeMode.current = mode;
    return () => { activeMode.current = null; };
  }, [mode]);
  const [outputMounted, setOutputMounted] = React.useState(false);
  React.useEffect(() => {
    if (output) setOutputMounted(true);
  }, [output]);

  const { process } = useJsonWorker();
  const { copied, copy } = useCopy();

  // ---- live validation (debounced) -----------------------------------
  const validateTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const runValidation = React.useCallback(
    async (text: string, { silent }: { silent: boolean }) => {
      if (text.trim().length === 0) {
        setStatus({ state: "idle", error: null });
        return;
      }
      if (!silent) setStatus({ state: "processing" });

      const result = await process("validate", { json: text });
      if (!activeMode.current || useJsonStore.getState().input !== text) return;
      if (result.valid) {
        setStatus({ state: "valid", error: null });
      } else {
        // Keep the structured error (line/column/code) for highlighting; the
        // localized message is rendered at display time.
        setStatus({ state: "invalid", error: result.error });
      }
    },
    [process, setStatus],
  );

  React.useEffect(() => {
    if (validateTimer.current) clearTimeout(validateTimer.current);
    validateTimer.current = setTimeout(() => {
      void runValidation(input, { silent: true });
    }, 250);
    return () => {
      if (validateTimer.current) clearTimeout(validateTimer.current);
    };
  }, [input, mode, runValidation]);

  // ---- primary actions -----------------------------------------------
  const handleFormat = React.useCallback(async () => {
    if (!input.trim()) return;
    setStatus({ state: "processing" });
    const start = performance.now();
    const result = await process("format", { json: input, indent });
    if (activeMode.current !== "format" || useJsonStore.getState().input !== input) return;
    const durationMs = performance.now() - start;

    if (result.ok) {
      setOutput(result.output);
      setStatus({ state: "valid", error: null, durationMs });
      toast.success(t("toast.formatted"));
    } else {
      setOutput("");
      setStatus({ state: "invalid", error: result.error, durationMs });
      toast.error(t("toast.formatFailed"), {
        description: localizeError(result.error?.code),
      });
    }
  }, [input, indent, process, setOutput, setStatus, t, localizeError]);

  const handleMinify = React.useCallback(async () => {
    if (!input.trim()) return;
    setStatus({ state: "processing" });
    const start = performance.now();
    const result = await process("minify", { json: input });
    if (activeMode.current !== "minify" || useJsonStore.getState().input !== input) return;
    const durationMs = performance.now() - start;

    if (result.ok) {
      const before = byteLength(input);
      const after = byteLength(result.output);
      setOutput(result.output);
      setStatus({ state: "valid", error: null, durationMs });
      toast.success(t("toast.minified"), {
        description: t("toast.minifiedDetail", {
          before: formatBytes(before),
          after: formatBytes(after),
        }),
      });
    } else {
      setOutput("");
      setStatus({ state: "invalid", error: result.error, durationMs });
      toast.error(t("toast.minifyFailed"), {
        description: localizeError(result.error?.code),
      });
    }
  }, [input, process, setOutput, setStatus, t, localizeError]);

  const handleValidate = React.useCallback(async () => {
    if (!input.trim()) return;
    setStatus({ state: "processing" });
    const start = performance.now();
    const result = await process("validate", { json: input });
    if (activeMode.current !== "validate" || useJsonStore.getState().input !== input) return;
    const durationMs = performance.now() - start;

    if (result.valid) {
      setStatus({ state: "valid", error: null, durationMs });
      toast.success(t("toast.valid"), {
        description: t("toast.validDetail", { count: input.length }),
      });
    } else {
      setStatus({ state: "invalid", error: result.error, durationMs });
      toast.error(t("toast.invalid"), {
        description: t("toast.invalidDetail", {
          line: result.error!.line,
          column: result.error!.column,
        }),
      });
    }
  }, [input, process, setStatus, t]);

  const handlePrimary = React.useCallback(() => {
    if (mode === "format") void handleFormat();
    else if (mode === "minify") void handleMinify();
    else void handleValidate();
  }, [mode, handleFormat, handleMinify, handleValidate]);

  // ---- secondary actions ---------------------------------------------
  const handleCopy = React.useCallback(async () => {
    if (!output) return;
    const ok = await copy(output);
    if (ok) toast.success(t("toast.copied"));
    else toast.error(t("toast.copyFailed"));
  }, [output, copy, t]);

  const handleDownload = React.useCallback(() => {
    if (!output) return;
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = t("downloadFilename");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t("toast.downloaded"));
  }, [output, t]);

  const handleClear = React.useCallback(() => {
    reset();
    toast.success(t("toast.cleared"));
  }, [reset, t]);

  const handleLoadSample = React.useCallback(() => {
    setInput(SAMPLE_JSON);
    setOutput("");
    setStatus({ state: "idle", error: null, durationMs: null });
  }, [setInput, setOutput, setStatus]);

  const handleModeChange = React.useCallback((next: ToolMode) => {
    setLocalMode(next);
  }, []);

  // Keyboard shortcut: Cmd/Ctrl+Enter runs the primary action.
  useHotkey({ key: "Enter", mod: true }, handlePrimary);

  const hasInput = input.trim().length > 0;
  const hasOutput = output.length > 0;
  const errorLine =
    status.state === "invalid" && status.error ? status.error.line : null;

  return (
    <div className={cn("flex min-w-0 flex-col", embedded ? focused ? focusedWorkspaceClass : embeddedWorkspaceClass : "mx-auto min-h-[calc(100svh-4rem)] max-w-[1600px] overflow-y-auto px-4 py-5 md:h-[calc(100svh-4rem)] md:overflow-hidden sm:px-6")}>
      {/* Header */}
      {!embedded && <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
            <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted-foreground sm:inline-flex">
              <span className="text-xs">⌘</span>Enter
            </kbd>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {showModeSwitch && <ModeSwitch mode={mode} onChange={handleModeChange} />}
      </div>}

      {/* Toolbar */}
      <Toolbar
        mode={mode}
        processing={status.state === "processing"}
        hasInput={hasInput}
        hasOutput={hasOutput}
        indent={indent}
        onIndentChange={setIndent}
        onFormat={handleFormat}
        onMinify={handleMinify}
        onValidate={handleValidate}
        onCopy={handleCopy}
        onDownload={handleDownload}
        onClear={handleClear}
        onLoadSample={handleLoadSample}
        copied={copied}
      />

      {/* Editors */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 py-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <Pane
          label={t("panes.input")}
          badge={input ? "input" : undefined}
          className="min-h-[260px]"
        >
          <MonacoEditor
            value={input}
            onChange={setInput}
            wordWrap={wordWrap}
            loadingLabel={tEditor("loading")}
            ariaLabel={tEditor("inputAria")}
          />
        </Pane>

        <div className="hidden items-center justify-center md:flex">
          <button
            type="button"
            onClick={handlePrimary}
            disabled={!hasInput}
            aria-label={t("run")}
            className="group grid h-10 w-10 place-items-center rounded-full border border-border bg-card text-muted-foreground shadow-soft transition-all hover:scale-110 hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100 disabled:hover:border-border disabled:hover:bg-card disabled:hover:text-muted-foreground"
          >
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>

        <Pane
          label={t("panes.output")}
          badge={hasOutput ? "output" : undefined}
          className="min-h-[260px]"
        >
          {(hasOutput || outputMounted) && <div className={cn("h-full", !hasOutput && "hidden")} aria-hidden={!hasOutput}>
            <MonacoEditor
              value={output}
              readOnly
              wordWrap={wordWrap}
              loadingLabel={tEditor("loading")}
              ariaLabel={tEditor("outputAria")}
            />
          </div>}
          {!hasOutput && (
            <EmptyOutput
              mode={mode}
              errorLine={errorLine}
              status={status}
              errorMessage={localizeError(status.error?.code)}
            />
          )}
        </Pane>
      </div>

      {/* Status bar */}
      <StatusBar
        status={status}
        input={input}
        output={output}
        errorMessage={localizeError(status.error?.code)}
      />
    </div>
  );
}

/** A bordered, card-style editor pane with a small floating label chip. */
function Pane({
  label,
  badge,
  className,
  children,
}: {
  label: string;
  badge?: "input" | "output";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft", className)}>
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border/70 bg-muted/25 px-3.5">
        <span className="text-xs font-semibold tracking-wide text-foreground">{label}</span>
        {badge && (
          <span
            className={cn(
              "ml-auto h-1.5 w-1.5 rounded-full",
              badge === "input" ? "bg-primary/70" : "bg-success",
            )}
            aria-hidden
          />
        )}
      </div>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

/** Pill switch for Format / Minify / Validate. */
function ModeSwitch({
  mode,
  onChange,
}: {
  mode: ToolMode;
  onChange: (m: ToolMode) => void;
}) {
  const t = useTranslations("tool.modes");
  const items: Array<{ id: ToolMode; label: string }> = [
    { id: "format", label: t("format") },
    { id: "minify", label: t("minify") },
    { id: "validate", label: t("validate") },
  ];
  return (
    <div
      role="radiogroup"
      aria-label={t("format") + " / " + t("minify") + " / " + t("validate")}
      className="inline-flex rounded-xl border border-border bg-muted/60 p-1 text-sm shadow-soft"
    >
      {items.map((it) => {
        const active = mode === it.id;
        return (
          <button
            key={it.id}
            role="radio"
            aria-checked={active}
            type="button"
            onClick={() => onChange(it.id)}
            className={cn(
              "relative rounded-lg px-3.5 py-1.5 font-medium transition-all",
              active
                ? "bg-card text-foreground shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/** Placeholder shown in the output pane before any operation runs. */
function EmptyOutput({
  mode,
  errorLine,
  status,
  errorMessage,
}: {
  mode: ToolMode;
  errorLine: number | null;
  status: { state: string; error: { line: number; column: number } | null };
  errorMessage: string;
}) {
  const t = useTranslations("tool.empty");

  if (mode === "validate") {
    if (status.state === "valid") {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground animate-scale-in">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-success/10 text-success">
            <CircleCheck className="h-7 w-7" />
          </div>
          <p className="font-medium text-foreground">{t("validJson")}</p>
          <p className="text-xs">{t("validHint")}</p>
        </div>
      );
    }
    if (status.state === "invalid" && status.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center animate-scale-in">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
            <TriangleAlert className="h-7 w-7" />
          </div>
          <p className="font-medium text-destructive">{t("invalidJson")}</p>
          <p className="max-w-md text-sm text-muted-foreground">{errorMessage}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {status.error.line}, {status.error.column}
            {errorLine ? t("seeLine", { line: errorLine }) : ""}
          </p>
        </div>
      );
    }
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground animate-fade-in">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground/70">
        <FileText className="h-7 w-7" />
      </div>
      <p className="font-medium">{t("outputHere")}</p>
      <p className="max-w-xs text-xs">{mode === "format" ? t("formatHint") : mode === "minify" ? t("minifyHint") : t("validateHint")}</p>
    </div>
  );
}
