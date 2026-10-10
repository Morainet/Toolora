"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { ArrowLeftRight, FileText, Trash2, Columns2, Rows2 } from "lucide-react";
import { DiffInput } from "@/components/diff/diff-input";
import { useJsonWorker } from "@/hooks/use-json-worker";
import { useJsonStore } from "@/store/json-store";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, byteLength, formatBytes } from "@/lib/utils";

// Monaco DiffEditor is client-only; lazy-load the wrapper with ssr disabled.
const TooloraDiffEditor = dynamic(() => import("./diff-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  ),
});

/** Two sample JSON documents with intentional differences. */
const SAMPLE_ORIGINAL = `{
  "name": "Toolora",
  "version": "1.0.0",
  "author": "Morainet",
  "features": ["format", "minify", "validate"],
  "config": {
    "theme": "light",
    "fontSize": 13
  },
  "active": true
}`;

const SAMPLE_MODIFIED = `{
  "name": "Toolora",
  "version": "1.1.0",
  "author": "Morainet",
  "features": ["format", "minify", "validate", "diff", "tree"],
  "config": {
    "theme": "dark",
    "fontSize": 14,
    "wordWrap": true
  },
  "active": true,
  "license": "MIT"
}`;

interface JsonDiffProps {
  title: string;
  description: string;
  embedded?: boolean;
}

/**
 * JSON Diff page: two source inputs on top, a full-width Monaco DiffEditor
 * below showing the live differences. Validation runs in the worker so the UI
 * stays responsive on big documents.
 */
export function JsonDiff({ title, description, embedded = false }: JsonDiffProps) {
  const t = useTranslations("diff");
  const tStatus = useTranslations("tool.status");
  const { process } = useJsonWorker();

  const [original, setOriginal] = React.useState(() => useJsonStore.getState().input);
  const [modified, setModified] = React.useState("");
  const [sideBySide, setSideBySide] = React.useState(true);

  // Per-side validation state.
  const [originalState, setOriginalState] = React.useState<"empty" | "valid" | "invalid">("empty");
  const [modifiedState, setModifiedState] = React.useState<"empty" | "valid" | "invalid">("empty");
  const [originalErr, setOriginalErr] = React.useState<{ line: number; column: number } | null>(null);
  const [modifiedErr, setModifiedErr] = React.useState<{ line: number; column: number } | null>(null);

  // Debounced validation for both sides.
  const validateTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(() => {
    if (validateTimer.current) clearTimeout(validateTimer.current);
    validateTimer.current = setTimeout(async () => {
      const validate = async (text: string) => {
        if (text.trim().length === 0) return { state: "empty" as const, err: null };
        const r = await process("validate", { json: text });
        if (r.valid) return { state: "valid" as const, err: null };
        return {
          state: "invalid" as const,
          err: { line: r.error!.line, column: r.error!.column },
        };
      };
      const a = await validate(original);
      const b = await validate(modified);
      setOriginalState(a.state);
      setOriginalErr(a.err);
      setModifiedState(b.state);
      setModifiedErr(b.err);
    }, 200);
    return () => {
      if (validateTimer.current) clearTimeout(validateTimer.current);
    };
  }, [original, modified, process]);

  const hasInput = original.trim().length > 0 || modified.trim().length > 0;
  const bothValid =
    (originalState === "valid" || originalState === "empty") &&
    (modifiedState === "valid" || modifiedState === "empty");
  const hasAnyInvalid = originalState === "invalid" || modifiedState === "invalid";

  // Actions.
  const handleSwap = () => {
    setOriginal(modified);
    setModified(original);
  };
  const handleClear = () => {
    setOriginal("");
    setModified("");
  };
  const handleSample = () => {
    setOriginal(SAMPLE_ORIGINAL);
    setModified(SAMPLE_MODIFIED);
  };

  // Status: identical vs differences (rough line-level estimate via diff line count).
  // We avoid recomputing the diff ourselves; instead we compare trimmed text.
  const identical =
    hasInput && original.trim() === modified.trim() && original.trim().length > 0;

  return (
    <div className={cn("flex min-w-0 flex-col", embedded ? "min-h-[700px] p-4 sm:p-5 xl:h-[calc(100svh-16rem)] xl:min-h-[650px]" : "mx-auto min-h-[calc(100svh-4rem)] max-w-[1600px] overflow-y-auto px-4 py-5 md:h-[calc(100svh-4rem)] md:overflow-hidden sm:px-6")}>
      {/* Header */}
      <div className={cn("mb-4 flex flex-wrap items-end gap-3", embedded ? "justify-end" : "justify-between")}>
        {!embedded && <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>}

        {/* View mode toggle + actions */}
        <div className="flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSideBySide((v) => !v)}
                className="gap-1.5"
              >
                {sideBySide ? (
                  <Rows2 className="h-4 w-4" />
                ) : (
                  <Columns2 className="h-4 w-4" />
                )}
                <span className="hidden sm:inline">
                  {sideBySide ? t("inline") : t("sideBySide")}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {sideBySide ? t("inline") : t("sideBySide")}
            </TooltipContent>
          </Tooltip>

          <Separator orientation="vertical" className="mx-0.5 h-6" />

          <ActionButton
            label={t("swap")}
            icon={<ArrowLeftRight className="h-4 w-4" />}
            onClick={handleSwap}
            disabled={!hasInput}
          />
          <ActionButton
            label={t("sample")}
            icon={<FileText className="h-4 w-4" />}
            onClick={handleSample}
          />
          <ActionButton
            label={t("clear")}
            icon={<Trash2 className="h-4 w-4" />}
            onClick={handleClear}
            disabled={!hasInput}
          />
        </div>
      </div>

      {/* Top: dual inputs */}
      <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <DiffInput
          value={original}
          onChange={setOriginal}
          side="original"
          state={originalState}
        />
        <DiffInput
          value={modified}
          onChange={setModified}
          side="modified"
          state={modifiedState}
        />
      </div>

      {/* Bottom: full-width diff editor */}
      <div className="relative flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft">
        <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2">
          <span className="select-none rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
            {t("result")}
          </span>
          {hasInput && (
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                identical ? "bg-success" : "bg-warning",
              )}
              aria-hidden
            />
          )}
        </div>

        <div className="h-full w-full pt-9">
          {hasInput ? (
            <TooloraDiffEditor
              original={original}
              modified={modified}
              sideBySide={sideBySide}
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-muted-foreground animate-fade-in">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground/70">
                <Columns2 className="h-7 w-7" />
              </div>
              <p className="max-w-sm text-sm">{t("empty")}</p>
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border border-border bg-card/80 px-4 py-2.5 text-xs text-muted-foreground shadow-soft backdrop-blur">
        {hasAnyInvalid ? (
          <span className="text-destructive">
            {originalState === "invalid" && originalErr
              ? t("originalError", {
                  message: "",
                  line: originalErr.line,
                  column: originalErr.column,
                }).replace("： (", "（")
              : null}
            {modifiedState === "invalid" && modifiedErr
              ? t("modifiedError", {
                  message: "",
                  line: modifiedErr.line,
                  column: modifiedErr.column,
                }).replace("： (", "（")
              : null}
          </span>
        ) : identical ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2 py-0.5 text-xs font-medium text-success">
            {t("identical")}
          </span>
        ) : hasInput ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 px-2 py-0.5 text-xs font-medium text-warning">
            {t("hasDifferences", { count: "•" })}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs">
            {tStatus("idle")}
          </span>
        )}

        {(original || modified) && (
          <>
            <span aria-hidden className="hidden h-3 w-px bg-border sm:block" />
            <span className="inline-flex items-center gap-1.5 font-mono">
              <span className="text-muted-foreground/70">{t("original")}</span>
              <span className="text-foreground/90">
                {original.length.toLocaleString()} {tStatus("chars")} ·{" "}
                {formatBytes(byteLength(original))}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-mono">
              <span className="text-muted-foreground/70">{t("modified")}</span>
              <span className="text-foreground/90">
                {modified.length.toLocaleString()} {tStatus("chars")} ·{" "}
                {formatBytes(byteLength(modified))}
              </span>
            </span>
            {bothValid && hasInput && (
              <span className="inline-flex items-center gap-1.5 font-mono text-success">
                {t("bothValid")}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className="gap-1.5"
        >
          {icon}
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
