"use client";

import {
  Copy,
  Check,
  Download,
  Trash2,
  AlignLeft,
  Minimize2,
  Settings2,
  FileText,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
import type { IndentOption, ToolMode } from "@/store/json-store";
import { cn } from "@/lib/utils";

interface ToolbarProps {
  mode: ToolMode;
  /** Whether the primary action is currently running. */
  processing: boolean;
  /** Whether there's input to act on. */
  hasInput: boolean;
  /** Whether there's output that can be copied/downloaded. */
  hasOutput: boolean;
  indent: IndentOption;
  onIndentChange: (indent: IndentOption) => void;

  onFormat: () => void;
  onMinify: () => void;
  onValidate: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onClear: () => void;
  onLoadSample: () => void;

  copied: boolean;
}

/**
 * Action toolbar above the editor panes. All labels are localized via the
 * `tool.toolbar` namespace. The primary Format/Minify/Validate buttons are
 * contextual but each always invokes its dedicated handler.
 */
export function Toolbar({
  mode,
  processing,
  hasInput,
  hasOutput,
  indent,
  onIndentChange,
  onFormat,
  onMinify,
  onValidate,
  onCopy,
  onDownload,
  onClear,
  onLoadSample,
  copied,
}: ToolbarProps) {
  const t = useTranslations("tool.toolbar");
  const tWorkspace = useTranslations("jsonWorkspace");

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-3 py-2.5 shadow-soft">
      <ToolButton
        label={t(mode)}
        tip={`${t(mode === "format" ? "formatTip" : mode === "minify" ? "minifyTip" : "validateTip")} · ${tWorkspace("shortcut")}`}
        icon={mode === "format" ? <AlignLeft className="h-4 w-4" /> : mode === "minify" ? <Minimize2 className="h-4 w-4" /> : <Check className="h-4 w-4" />}
        onClick={mode === "format" ? onFormat : mode === "minify" ? onMinify : onValidate}
        disabled={processing || !hasInput}
        variant="default"
      />

      <Separator orientation="vertical" className="mx-0.5 h-6" />

      <ToolButton
        label={copied ? t("copied") : t("copy")}
        tip={t("copy")}
        icon={copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        onClick={onCopy}
        disabled={!hasOutput}
        variant="ghost"
      />
      <ToolButton
        label={t("download")}
        tip={t("download")}
        icon={<Download className="h-4 w-4" />}
        onClick={onDownload}
        disabled={!hasOutput}
        variant="ghost"
      />
      <ToolButton
        label={t("clear")}
        tip={t("clear")}
        icon={<Trash2 className="h-4 w-4" />}
        onClick={onClear}
        disabled={!hasInput}
        variant="ghost"
      />
      <ToolButton
        label={t("sample")}
        tip={t("sample")}
        icon={<FileText className="h-4 w-4" />}
        onClick={onLoadSample}
        variant="ghost"
      />

      {mode === "format" && <div className="ml-auto flex items-center gap-2 pl-2">
        <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <Settings2 className="h-3.5 w-3.5" />
          <span>{t("indent")}</span>
        </div>
        <Select
          value={String(indent)}
          onValueChange={(v) => onIndentChange(parseIndent(v))}
        >
          <SelectTrigger className="h-8 w-[100px]" aria-label={t("indentLabel")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2">{t("indent2")}</SelectItem>
            <SelectItem value="4">{t("indent4")}</SelectItem>
            <SelectItem value="tab">{t("indentTab")}</SelectItem>
          </SelectContent>
        </Select>
      </div>}
    </div>
  );
}

function ToolButton({
  label,
  tip,
  icon,
  onClick,
  disabled,
  variant,
}: {
  label: string;
  tip: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant: React.ComponentProps<typeof Button>["variant"];
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={variant}
          size="sm"
          onClick={onClick}
          disabled={disabled}
          className="gap-1.5"
        >
          {icon}
          <span className={cn(variant !== "default" && "hidden sm:inline")}>{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{tip}</TooltipContent>
    </Tooltip>
  );
}

function parseIndent(value: string): IndentOption {
  if (value === "tab") return "\t";
  const n = Number(value);
  return n === 4 ? 4 : 2;
}
