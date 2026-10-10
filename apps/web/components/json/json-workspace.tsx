"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import type { ToolMode } from "@/store/json-store";
import { cn } from "@/lib/utils";
import { JSON_MODES, type JsonWorkspaceMode } from "@/lib/json-modes";

const JsonTool = dynamic(() => import("@/components/formatter/json-tool").then((m) => m.JsonTool));
const JsonTree = dynamic(() => import("@/components/tree/json-tree").then((m) => m.JsonTree));
const JsonDiff = dynamic(() => import("@/components/diff/json-diff").then((m) => m.JsonDiff));
const JsonRepair = dynamic(() => import("@/components/repair/json-repair").then((m) => m.JsonRepair));
const JsonConverter = dynamic(() => import("@/components/converter/json-converter").then((m) => m.JsonConverter));

const toolKeys: Record<JsonWorkspaceMode, string> = {
  format: "json-formatter",
  minify: "json-minifier",
  validate: "json-validator",
  tree: "json-tree",
  diff: "json-diff",
  repair: "json-repair",
  converter: "json-converter",
};

export function JsonWorkspace({ initialMode = "format" }: { initialMode?: JsonWorkspaceMode }) {
  const [mode, setMode] = useState<JsonWorkspaceMode>(initialMode);
  const tTools = useTranslations("tools");
  const tModes = useTranslations("tool.modes");

  function selectMode(next: JsonWorkspaceMode) {
    setMode(next);
    const url = new URL(window.location.href);
    url.searchParams.set("mode", next);
    window.history.replaceState(window.history.state, "", url);
  }

  function label(value: JsonWorkspaceMode): string {
    if (value === "format" || value === "minify" || value === "validate") return tModes(value);
    return tTools(`${toolKeys[value]}.short`);
  }

  const title = tTools(`${toolKeys[mode]}.title`);
  const description = tTools(`${toolKeys[mode]}.description`);

  return (
    <div className="min-w-0">
      <nav aria-label={tTools("json.title")} className="sticky top-[4.5rem] z-20 flex gap-1 overflow-x-auto border-b border-border/70 bg-background/95 px-4 py-2 backdrop-blur sm:px-6">
        {JSON_MODES.map((value) => (
          <button
            key={value}
            type="button"
            aria-current={mode === value ? "page" : undefined}
            onClick={() => selectMode(value)}
            className={cn("shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors", mode === value ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}
          >
            {label(value)}
          </button>
        ))}
      </nav>
      {mode === "format" || mode === "minify" || mode === "validate" ? (
        <JsonTool key={mode} initialMode={mode as ToolMode} title={title} description={description} showModeSwitch={false} />
      ) : mode === "tree" ? (
        <JsonTree title={title} description={description} />
      ) : mode === "diff" ? (
        <JsonDiff title={title} description={description} />
      ) : mode === "repair" ? (
        <JsonRepair title={title} description={description} />
      ) : (
        <JsonConverter title={title} description={description} />
      )}
    </div>
  );
}
