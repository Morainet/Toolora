"use client";

import {
  ChevronsDownUp,
  ChevronsUpDown,
  Search,
  Trash2,
  FileText,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface TreeToolbarProps {
  hasInput: boolean;
  query: string;
  matchCount: number;
  onQueryChange: (q: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onClear: () => void;
  onLoadSample: () => void;
}

/**
 * Toolbar for the tree viewer: search box (left, grows), and on the right a
 * group of icon buttons — expand all / collapse all / sample / clear.
 * All labels are localized via the `tree` namespace.
 */
export function TreeToolbar({
  hasInput,
  query,
  matchCount,
  onQueryChange,
  onExpandAll,
  onCollapseAll,
  onClear,
  onLoadSample,
}: TreeToolbarProps) {
  const t = useTranslations("tree");

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 py-2 shadow-soft">
      {/* Search box */}
      <div className="relative flex-1 min-w-[180px]">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          disabled={!hasInput}
          aria-label={t("search")}
          className={cn(
            "h-8 w-full rounded-md border border-input bg-background pl-8 pr-7 text-sm shadow-sm transition-colors",
            "placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange("")}
            aria-label={t("clearSearch")}
            className="absolute right-1.5 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
        {query && matchCount > 0 && (
          <span className="absolute -bottom-4 left-1 text-[10px] text-muted-foreground">
            {t("matchCount", { count: matchCount })}
          </span>
        )}
      </div>

      <Separator orientation="vertical" className="mx-0.5 h-6" />

      <ToolButton
        label={t("expandAll")}
        icon={<ChevronsUpDown className="h-4 w-4" />}
        onClick={onExpandAll}
        disabled={!hasInput}
      />
      <ToolButton
        label={t("collapseAll")}
        icon={<ChevronsDownUp className="h-4 w-4" />}
        onClick={onCollapseAll}
        disabled={!hasInput}
      />
      <ToolButton
        label={t("sample")}
        icon={<FileText className="h-4 w-4" />}
        onClick={onLoadSample}
      />
      <ToolButton
        label={t("clear")}
        icon={<Trash2 className="h-4 w-4" />}
        onClick={onClear}
        disabled={!hasInput}
      />
    </div>
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
