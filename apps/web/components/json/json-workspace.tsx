"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { AlignLeft, ArrowLeftRight, Braces, CircleCheck, Code2, ListTree, LockKeyhole, Minimize2, Wrench } from "lucide-react";
import { useJsonStore, type ToolMode } from "@/store/json-store";
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

const modeIcons = {
  format: AlignLeft,
  minify: Minimize2,
  validate: CircleCheck,
  tree: ListTree,
  diff: ArrowLeftRight,
  repair: Wrench,
  converter: Code2,
} satisfies Record<JsonWorkspaceMode, typeof AlignLeft>;

export function JsonWorkspace({ initialMode = "format" }: { initialMode?: JsonWorkspaceMode }) {
  const [mode, setMode] = useState<JsonWorkspaceMode>(initialMode);
  const activeModeRef = useRef<HTMLButtonElement>(null);
  const tTools = useTranslations("tools");
  const tModes = useTranslations("tool.modes");
  const t = useTranslations("jsonWorkspace");

  useEffect(() => {
    activeModeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [mode]);

  function selectMode(next: JsonWorkspaceMode) {
    if (next === mode) return;
    const store = useJsonStore.getState();
    store.setOutput("");
    store.setStatus({ state: "idle", error: null, durationMs: null });
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
  const ActiveIcon = modeIcons[mode];

  return (
    <div className="mx-auto w-full max-w-[1720px] px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-5">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary/10"><Braces className="h-4 w-4" /></span>
            {t("eyebrow")}
          </div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.25rem]">{tTools("json.title")}</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{tTools("json.description")}</p>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium">
          <span className="rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground">{t("toolCount", { count: JSON_MODES.length })}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/20 bg-success/10 px-3 py-1.5 text-success"><LockKeyhole className="h-3.5 w-3.5" />{t("localOnly")}</span>
        </div>
      </header>

      <section aria-label={title} className="min-w-0 overflow-hidden rounded-[22px] border border-border/80 bg-card shadow-[0_16px_48px_-24px_rgba(15,23,42,0.25)] dark:shadow-[0_16px_48px_-24px_rgba(0,0,0,0.65)]">
          <nav aria-label={t("modeNavigation")} className="flex gap-1 overflow-x-auto border-b border-border/80 bg-muted/20 px-3 py-2.5 sm:px-4">
            {JSON_MODES.map((value) => {
              const Icon = modeIcons[value];
              return (
                <button key={value} ref={mode === value ? activeModeRef : undefined} type="button" aria-current={mode === value ? "page" : undefined} title={t(`hints.${value}`)} onClick={() => selectMode(value)} className={cn("inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors", mode === value ? "bg-card text-primary shadow-sm ring-1 ring-border/80" : "text-muted-foreground hover:bg-card/70 hover:text-foreground")}>
                  <Icon className="h-4 w-4" />{label(value)}
                </button>
              );
            })}
          </nav>
            <div className="flex flex-wrap items-center gap-3 border-b border-border/80 bg-muted/25 px-4 py-4 sm:px-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-primary/15 bg-primary/10 text-primary"><ActiveIcon className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-semibold leading-6 text-foreground">{title}</h2>
                <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-sm">{description}</p>
              </div>
              {mode !== "tree" && mode !== "diff" && <span className="hidden rounded-lg border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground sm:inline-flex">{t("shortcut")}</span>}
            </div>

            {mode === "format" || mode === "minify" || mode === "validate" ? (
              <JsonTool key={mode} initialMode={mode as ToolMode} title={title} description={description} showModeSwitch={false} embedded />
            ) : mode === "tree" ? (
              <JsonTree title={title} description={description} embedded />
            ) : mode === "diff" ? (
              <JsonDiff title={title} description={description} embedded />
            ) : mode === "repair" ? (
              <JsonRepair title={title} description={description} embedded />
            ) : (
              <JsonConverter title={title} description={description} embedded />
            )}
      </section>
    </div>
  );
}
