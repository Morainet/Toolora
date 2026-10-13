"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Wrench,
  Copy,
  Check,
  Download,
  Trash2,
  FileText,
  CircleCheck,
  TriangleAlert,
} from "lucide-react";
import { useJsonWorker } from "@/hooks/use-json-worker";
import { useCopy } from "@/hooks/use-copy";
import { useHotkey } from "@/hooks/use-hotkey";
import { useJsonStore } from "@/store/json-store";
import { SAMPLE_BROKEN_JSON } from "@/lib/sample-broken-json";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, byteLength, formatBytes } from "@/lib/utils";
import { embeddedWorkspaceClass, focusedWorkspaceClass } from "@/lib/workspace-layout";

// Monaco is client-only; load it lazily.
const MonacoEditor = dynamic(() => import("@/components/editor/monaco-editor"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
      Loading…
    </div>
  ),
});

interface JsonRepairProps {
  title: string;
  description: string;
  embedded?: boolean;
  focused?: boolean;
}

/**
 * JSON Repair page: left input (broken/lenient JSON) + right output (repaired
 * valid JSON). Uses the jsonrepair library via the worker pipeline so big
 * inputs don't block the UI.
 */
export function JsonRepair({ title, description, embedded = false, focused = false }: JsonRepairProps) {
  const t = useTranslations("repair");
  const tEditor = useTranslations("editor");
  const tErrors = useTranslations("errors");
  const tStatus = useTranslations("tool.status");

  const { input, output, status, setInput, setOutput, setStatus, reset } =
    useJsonStore();
  const { process } = useJsonWorker();
  const { copied, copy } = useCopy();

  const [repairState, setRepairState] = React.useState<
    "idle" | "processing" | "success" | "error"
  >("idle");
  const [errorLine, setErrorLine] = React.useState<number | null>(null);

  const handleRepair = React.useCallback(async () => {
    if (!input.trim()) return;
    setRepairState("processing");
    setStatus({ state: "processing" });
    const start = performance.now();
    const result = await process("repair", { json: input });
    const durationMs = performance.now() - start;

    if (result.ok) {
      setOutput(result.output);
      setRepairState("success");
      setStatus({ state: "valid", error: null, durationMs });
      setErrorLine(null);
      toast.success(t("repaired"));
    } else {
      setOutput("");
      setRepairState("error");
      setStatus({ state: "invalid", error: result.error, durationMs });
      setErrorLine(result.error?.line ?? null);
      toast.error(t("repairFailed"), {
        description: result.error ? tErrors(result.error.code) : undefined,
      });
    }
  }, [input, process, setOutput, setStatus, t, tErrors]);

  const handleCopy = React.useCallback(async () => {
    if (!output) return;
    const ok = await copy(output);
    toast.success(ok ? t("copied") : t("copyFailed"));
  }, [output, copy, t]);

  const handleDownload = React.useCallback(() => {
    if (!output) return;
    const blob = new Blob([output], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "repaired.json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t("downloaded"));
  }, [output]);

  const handleClear = React.useCallback(() => {
    reset();
    setRepairState("idle");
    setErrorLine(null);
    toast.success(tStatus("idle"));
  }, [reset, tStatus]);

  const handleLoadSample = React.useCallback(() => {
    setInput(SAMPLE_BROKEN_JSON);
    setOutput("");
    setRepairState("idle");
    setErrorLine(null);
    // Auto-run repair after loading the sample.
    setTimeout(() => void handleRepair(), 0);
  }, [setInput, setOutput, handleRepair]);

  // Keyboard shortcut: Cmd/Ctrl+Enter runs repair.
  useHotkey({ key: "Enter", mod: true }, handleRepair);

  const hasInput = input.trim().length > 0;
  const hasOutput = output.length > 0;
  const processing = repairState === "processing";

  return (
    <div className={cn("flex min-w-0 flex-col", embedded ? focused ? focusedWorkspaceClass : embeddedWorkspaceClass : "mx-auto min-h-[calc(100svh-4rem)] max-w-[1600px] overflow-y-auto px-4 py-5 md:h-[calc(100svh-4rem)] md:overflow-hidden sm:px-6")}>
      {/* Header */}
      {!embedded && <div className="mb-4">
        <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
          {title}
          <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted-foreground sm:inline-flex">
            <span className="text-xs">⌘</span>Enter
          </kbd>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>}

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-soft">
        {/* Primary repair action */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="sm"
              onClick={handleRepair}
              disabled={processing || !hasInput}
              className="gap-1.5"
            >
              <Wrench className="h-4 w-4" />
              <span>{t("repair")}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("repair")}</TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="mx-0.5 h-6" />

        <ToolButton
          label={copied ? t("copied") : t("copy")}
          icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          onClick={handleCopy}
          disabled={!hasOutput}
        />
        <ToolButton
          label={t("download")}
          icon={<Download className="h-4 w-4" />}
          onClick={handleDownload}
          disabled={!hasOutput}
        />
        <ToolButton
          label={t("sample")}
          icon={<FileText className="h-4 w-4" />}
          onClick={handleLoadSample}
        />
        <ToolButton
          label={t("clear")}
          icon={<Trash2 className="h-4 w-4" />}
          onClick={handleClear}
          disabled={!hasInput}
        />
      </div>

      {/* Editors */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 py-3 md:grid-cols-2">
        {/* Input */}
        <Pane label={t("input")} badge={input ? "input" : undefined}>
          <MonacoEditor
            value={input}
            onChange={setInput}
            wordWrap={false}
            errorLine={errorLine ?? undefined}
            loadingLabel={tEditor("loading")}
            ariaLabel={tEditor("inputAria")}
          />
        </Pane>

        {/* Output */}
        <Pane label={t("output")} badge={hasOutput ? "output" : undefined}>
          {hasOutput ? (
            <MonacoEditor
              value={output}
              readOnly
              wordWrap={false}
              loadingLabel={tEditor("loading")}
              ariaLabel={tEditor("outputAria")}
            />
          ) : (
            <EmptyState state={repairState} errorLine={errorLine} />
          )}
        </Pane>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border border-border bg-card/80 px-4 py-2.5 text-xs text-muted-foreground shadow-soft backdrop-blur">
        <StatusPill state={repairState} />

        {input && (
          <>
            <span aria-hidden className="hidden h-3 w-px bg-border sm:block" />
            <Metric label={tStatus("input")}>
              {input.length.toLocaleString()} {tStatus("chars")} ·{" "}
              {formatBytes(byteLength(input))}
            </Metric>
            {hasOutput && (
              <Metric label={tStatus("output")}>
                {output.length.toLocaleString()} {tStatus("chars")} ·{" "}
                {formatBytes(byteLength(output))}
              </Metric>
            )}
            {status.durationMs != null && (
              <Metric label={tStatus("time")}>
                {Math.round(status.durationMs)} ms
              </Metric>
            )}
          </>
        )}
      </div>
    </div>
  );
}

/** Card-style editor pane with a floating label chip (matches other tools). */
function Pane({
  label,
  badge,
  children,
}: {
  label: string;
  badge?: "input" | "output";
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-[260px] flex-col overflow-hidden rounded-xl border border-border bg-card shadow-soft">
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex items-center gap-2">
        <span className="select-none rounded-md bg-background/80 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground backdrop-blur">
          {label}
        </span>
        {badge && (
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              badge === "input" ? "bg-primary/70" : "bg-success",
            )}
            aria-hidden
          />
        )}
      </div>
      <div className="min-h-0 flex-1 pt-9">{children}</div>
    </div>
  );
}

function StatusPill({ state }: { state: "idle" | "processing" | "success" | "error" }) {
  const t = useTranslations("repair");
  if (state === "processing") {
    return (
      <Badge variant="secondary" className="gap-1">
        <span className="h-3 w-3 animate-pulse rounded-full bg-muted-foreground/50" />
        {t("repair")}…
      </Badge>
    );
  }
  if (state === "success") {
    return (
      <Badge variant="success" className="gap-1">
        <Check className="h-3 w-3" /> {t("repaired")}
      </Badge>
    );
  }
  if (state === "error") {
    return (
      <Badge variant="destructive" className="gap-1">
        <TriangleAlert className="h-3 w-3" /> {t("repairFailed")}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      {t("idle")}
    </Badge>
  );
}

function EmptyState({
  state,
  errorLine,
}: {
  state: "idle" | "processing" | "success" | "error";
  errorLine: number | null;
}) {
  const tErrors = useTranslations("errors");
  const t = useTranslations("repair");
  if (state === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center animate-scale-in">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <TriangleAlert className="h-7 w-7" />
        </div>
        <p className="font-medium text-destructive">{tErrors("repair_failed")}</p>
        {errorLine && (
          <p className="font-mono text-xs text-muted-foreground">
            near line {errorLine}
          </p>
        )}
      </div>
    );
  }
  if (state === "success") {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground animate-scale-in">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-success/10 text-success">
          <CircleCheck className="h-7 w-7" />
        </div>
        <p className="font-medium text-foreground">{t("repaired")}</p>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground animate-fade-in">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground/70">
        <FileText className="h-7 w-7" />
      </div>
      <p className="font-medium">{t("emptyTitle")}</p>
      <p className="max-w-xs text-xs">{t("emptyHint")}</p>
    </div>
  );
}

function Metric({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono">
      <span className="text-muted-foreground/70">{label}</span>
      <span className="text-foreground/90">{children}</span>
    </span>
  );
}

function ToolButton({
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
