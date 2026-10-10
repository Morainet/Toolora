"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import {
  Code2,
  Copy,
  Check,
  Download,
  Trash2,
  FileText,
  FileCode,
} from "lucide-react";
import { convertJSON, type TargetLanguage } from "@parsy/converter";
import { useCopy } from "@/hooks/use-copy";
import { useHotkey } from "@/hooks/use-hotkey";
import { useJsonStore } from "@/store/json-store";
import { SAMPLE_JSON } from "@/lib/sample-json";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

interface JsonConverterProps {
  title: string;
  description: string;
  embedded?: boolean;
}

/** File extension + Monaco language per target. */
const LANG_META: Record<TargetLanguage, { ext: string; mono: string }> = {
  typescript: { ext: "ts", mono: "typescript" },
  go: { ext: "go", mono: "go" },
  java: { ext: "java", mono: "java" },
  kotlin: { ext: "kt", mono: "kotlin" },
  swift: { ext: "swift", mono: "swift" },
  rust: { ext: "rs", mono: "rust" },
  csharp: { ext: "cs", mono: "csharp" },
  dart: { ext: "dart", mono: "dart" },
};

/**
 * JSON → Code converter. Left: JSON input. Right: generated type definitions.
 * Conversion runs on the main thread (the converter is fast, synchronous
 * type inference — no need for a worker).
 */
export function JsonConverter({ title, description, embedded = false }: JsonConverterProps) {
  const t = useTranslations("converter");
  const tEditor = useTranslations("editor");
  const tStatus = useTranslations("tool.status");

  const { input, output, setInput, setOutput, reset } = useJsonStore();
  const { copied, copy } = useCopy();

  const [language, setLanguage] = React.useState<TargetLanguage>("typescript");
  const [error, setError] = React.useState<string | null>(null);

  const handleConvert = React.useCallback(() => {
    if (!input.trim()) return;
    const result = convertJSON(input, { language, rootName: "Root" });
    if (result.ok) {
      setOutput(result.output);
      setError(null);
      toast.success(t("converted"));
    } else {
      setOutput("");
      setError(result.error || t("convertFailed"));
      toast.error(t("convertFailed"));
    }
  }, [input, language, setOutput, t]);

  const handleCopy = React.useCallback(async () => {
    if (!output) return;
    const ok = await copy(output);
    toast.success(ok ? t("copied") : "Copy failed");
  }, [output, copy, t]);

  const handleDownload = React.useCallback(() => {
    if (!output) return;
    const meta = LANG_META[language];
    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `root.${meta.ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded root.${meta.ext}`);
  }, [output, language]);

  const handleClear = React.useCallback(() => {
    reset();
    setError(null);
  }, [reset]);

  const handleLoadSample = React.useCallback(() => {
    setInput(SAMPLE_JSON);
    setOutput("");
    setError(null);
    setTimeout(() => {
      const result = convertJSON(SAMPLE_JSON, { language, rootName: "Root" });
      if (result.ok) {
        setOutput(result.output);
        toast.success(t("converted"));
      }
    }, 0);
  }, [setInput, setOutput, language, t]);

  // Keyboard shortcut: Cmd/Ctrl+Enter runs conversion.
  useHotkey({ key: "Enter", mod: true }, handleConvert);

  const hasInput = input.trim().length > 0;
  const hasOutput = output.length > 0;

  return (
    <div className={cn("flex min-w-0 flex-col", embedded ? "min-h-[700px] p-4 sm:p-5 xl:h-[calc(100svh-16rem)] xl:min-h-[650px]" : "mx-auto min-h-[calc(100svh-4rem)] max-w-[1600px] overflow-y-auto px-4 py-5 md:h-[calc(100svh-4rem)] md:overflow-hidden sm:px-6")}>
      {/* Header */}
      <div className={cn("mb-4 flex flex-wrap items-end gap-3", embedded ? "justify-end" : "justify-between")}>
        {!embedded && <div>
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight sm:text-2xl">
            {title}
            <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-normal text-muted-foreground sm:inline-flex">
              <span className="text-xs">⌘</span>Enter
            </kbd>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>}

        {/* Language selector */}
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          <Select value={language} onValueChange={(v) => setLanguage(v as TargetLanguage)}>
            <SelectTrigger className="h-9 w-[150px]" aria-label={t("language")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="typescript">{t("typescript")}</SelectItem>
              <SelectItem value="go">{t("go")}</SelectItem>
              <SelectItem value="java">{t("java")}</SelectItem>
              <SelectItem value="kotlin">{t("kotlin")}</SelectItem>
              <SelectItem value="swift">{t("swift")}</SelectItem>
              <SelectItem value="rust">{t("rust")}</SelectItem>
              <SelectItem value="csharp">{t("csharp")}</SelectItem>
              <SelectItem value="dart">{t("dart")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-soft">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button size="sm" onClick={handleConvert} disabled={!hasInput} className="gap-1.5">
              <Code2 className="h-4 w-4" />
              <span>{t("convert")}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t("convert")}</TooltipContent>
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
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 py-4 md:grid-cols-2">
        {/* Input */}
        <Pane label={t("input")} badge={input ? "input" : undefined}>
          <MonacoEditor
            value={input}
            onChange={setInput}
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
              language={LANG_META[language].mono}
              loadingLabel={tEditor("loading")}
              ariaLabel={tEditor("outputAria")}
            />
          ) : (
            <EmptyState error={error} />
          )}
        </Pane>
      </div>

      {/* Status bar */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 rounded-xl border border-border bg-card/80 px-4 py-2.5 text-xs text-muted-foreground shadow-soft backdrop-blur">
        {error ? (
          <Badge variant="destructive" className="gap-1">
            {t("convertFailed")}
          </Badge>
        ) : hasOutput ? (
          <Badge variant="success" className="gap-1">
            <Check className="h-3 w-3" /> {t("converted")}
          </Badge>
        ) : (
          <Badge variant="outline">{tStatus("idle")}</Badge>
        )}
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
            <Metric label={t("language")}>
              {t(language)}
            </Metric>
          </>
        )}
      </div>
    </div>
  );
}

/** Card-style editor pane with a floating label chip. */
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

function EmptyState({ error }: { error: string | null }) {
  const t = useTranslations("converter");
  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center animate-scale-in">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <FileCode className="h-7 w-7" />
        </div>
        <p className="max-w-sm text-sm text-destructive">{error}</p>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-muted-foreground animate-fade-in">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-muted text-muted-foreground/70">
        <FileCode className="h-7 w-7" />
      </div>
      <p className="font-medium">{t("placeholder")}</p>
      <p className="max-w-xs text-xs">{t("placeholderHint")}</p>
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
