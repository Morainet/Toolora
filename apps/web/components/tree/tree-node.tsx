"use client";

import * as React from "react";
import { ChevronRight, Copy, Clipboard } from "lucide-react";
import { useTranslations } from "next-intl";
import type { TreeNode, JsonType } from "@/lib/tree";
import { useCopy } from "@/hooks/use-copy";
import { useTreeStore } from "@/store/tree-store";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

/** Color tokens per JSON value type, as Tailwind text-color classes. */
const TYPE_COLORS: Record<JsonType, string> = {
  object: "text-primary",
  array: "text-primary",
  string: "text-success",
  number: "text-warning",
  boolean: "text-primary",
  null: "text-muted-foreground",
};

/** Render a leaf value with light type-based styling. */
function ValuePreview({ node }: { node: TreeNode }) {
  if (node.type === "string") {
    return <span className={cn("font-mono", TYPE_COLORS.string)}>"{node.value}"</span>;
  }
  if (node.type === "null") {
    return <span className={cn("italic", TYPE_COLORS.null)}>null</span>;
  }
  return <span className={cn("font-mono", TYPE_COLORS[node.type])}>{String(node.value)}</span>;
}

/** Highlight the part of `text` that matches `query` (case-insensitive). */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(q.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-warning/30 px-0.5 text-foreground">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}

interface TreeNodeViewProps {
  node: TreeNode;
  /** True for non-root nodes (affects indentation + key display). */
  isRoot?: boolean;
  /** Depth from root (for aria-level). Root's children are depth 1. */
  depth?: number;
}

/**
 * Renders one tree node and (recursively) its children when expanded.
 * Each node row: chevron (containers) + type dot + key + value/size,
 * with hover-revealed copy actions.
 *
 * Performance: subscribes to *per-node* booleans (not the whole expanded/matches
 * Sets) so toggling one node only re-renders that node + its children, not the
 * entire tree. Wrapped in React.memo for the same reason.
 */
export const TreeNodeView = React.memo(function TreeNodeView({
  node,
  isRoot = false,
  depth = 1,
}: TreeNodeViewProps) {
  const t = useTranslations("tree");
  // Select per-node booleans so only affected nodes re-render on store changes.
  const isOpen = useTreeStore((s) => s.expanded.has(node.path));
  const isMatch = useTreeStore((s) => s.matches.has(node.path));
  const query = useTreeStore((s) => s.query);
  const toggle = useTreeStore((s) => s.toggle);
  const { copy } = useCopy();

  const isContainer = node.type === "object" || node.type === "array";

  const handleCopyPath = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await copy(node.path);
    toast.success(ok ? t("copiedPath") : t("copyFailed"));
  };

  const handleCopyValue = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Containers don't carry a copyable value on the node (their `value` is
    // null by design); only leaves have a primitive to copy.
    if (node.type === "object" || node.type === "array") return;
    // For leaves, node.value is a primitive (never null in practice).
    const text = String(node.value);
    const ok = await copy(text);
    toast.success(ok ? t("copiedValue") : t("copyFailed"));
  };

  return (
    <li
      role="treeitem"
      aria-expanded={isContainer ? isOpen : undefined}
      aria-level={depth}
      className="leading-7"
    >
      <div
        className={cn(
          "group flex items-center gap-1 rounded px-1 hover:bg-accent/60",
          isMatch && "bg-warning/10 hover:bg-warning/15",
        )}
        style={{ paddingLeft: isRoot ? 0 : undefined }}
      >
        {/* Expand/collapse chevron (containers only; spacer for leaves) */}
        {isContainer ? (
          <button
            type="button"
            onClick={() => toggle(node.path)}
            aria-label={isOpen ? t("collapse") : t("expand")}
            className="grid h-5 w-5 shrink-0 place-items-center rounded text-muted-foreground transition-transform hover:bg-accent hover:text-foreground"
          >
            <ChevronRight
              className={cn("h-3.5 w-3.5 transition-transform", isOpen && "rotate-90")}
            />
          </button>
        ) : (
          <span className="h-5 w-5 shrink-0" aria-hidden />
        )}

        {/* Type dot */}
        <span
          className={cn("h-2 w-2 shrink-0 rounded-full", TYPE_COLORS[node.type].replace("text-", "bg-"))}
          aria-hidden
        />

        {/* Key (non-root only) */}
        {!isRoot && (
          <span className="font-mono text-sm text-foreground/90">
            <Highlight text={node.key} query={query} />
          </span>
        )}
        {!isRoot && <span className="text-muted-foreground">:</span>}

        {/* Value / size summary */}
        {isContainer ? (
          <span className="text-xs text-muted-foreground">
            {node.type === "array" ? "[" : "{"}
            {isOpen ? null : (
              <span className="ml-0.5">
                {node.size} {node.size === 1 ? t("item") : t("items")}
                {node.type === "array" ? "]" : "}"}
              </span>
            )}
          </span>
        ) : (
          <span className="ml-1 truncate text-sm">
            <ValuePreview node={node} />
          </span>
        )}

        {/* Hover actions */}
        <span className="ml-auto flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={handleCopyPath}
                aria-label={t("copyPath")}
                className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{t("copyPath")}</TooltipContent>
          </Tooltip>
          {/* Copy value only for leaf nodes (containers have no copyable primitive) */}
          {!isContainer && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={handleCopyValue}
                  aria-label={t("copyValue")}
                  className="grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-background hover:text-foreground"
                >
                  <Clipboard className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>{t("copyValue")}</TooltipContent>
            </Tooltip>
          )}
        </span>
      </div>

      {/* Children (rendered when expanded) */}
      {isContainer && isOpen && node.children && node.children.length > 0 && (
        <ul role="group" className="ml-4 border-l border-border/60 pl-2">
          {node.children.map((child) => (
            <TreeNodeView key={child.path} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
});
