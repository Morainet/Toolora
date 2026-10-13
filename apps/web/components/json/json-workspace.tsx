"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { AlignLeft, ArrowLeftRight, Braces, CircleCheck, Code2, ListTree, LockKeyhole, Maximize2, Minimize2, Wrench } from "lucide-react";
import { useJsonStore, type ToolMode } from "@/store/json-store";
import { cn } from "@/lib/utils";
import { JSON_MODES, type JsonWorkspaceMode } from "@/lib/json-modes";
import { JsonTool } from "@/components/formatter/json-tool";
import { preloadMonaco } from "@/lib/monaco";
import { embeddedWorkspaceClass } from "@/lib/workspace-layout";

const loadTree = () => import("@/components/tree/json-tree").then((m) => m.JsonTree);
const loadDiff = () => import("@/components/diff/json-diff").then((m) => m.JsonDiff);
const loadRepair = () => import("@/components/repair/json-repair").then((m) => m.JsonRepair);
const loadConverter = () => import("@/components/converter/json-converter").then((m) => m.JsonConverter);
const JsonTree = dynamic(loadTree, { loading: WorkspaceLoading });
const JsonDiff = dynamic(loadDiff, { loading: WorkspaceLoading });
const JsonRepair = dynamic(loadRepair, { loading: WorkspaceLoading });
const JsonConverter = dynamic(loadConverter, { loading: WorkspaceLoading });

function WorkspaceLoading() {
  const t = useTranslations("editor");
  return <div role="status" className={cn("flex flex-col gap-3", embeddedWorkspaceClass)}><span className="sr-only">{t("loading")}</span><div className="h-10 shrink-0 animate-pulse rounded-lg bg-muted/50" /><div className="grid min-h-0 flex-1 grid-cols-2 gap-3"><div className="animate-pulse rounded-lg bg-muted/30" /><div className="animate-pulse rounded-lg bg-muted/30" /></div></div>;
}

function preloadMode(mode: JsonWorkspaceMode) {
  // Hover/focus expresses intent; don't download every advanced tool up front.
  if (mode === "tree") void loadTree().catch(() => {});
  else if (mode === "diff") void loadDiff().catch(() => {});
  else if (mode === "repair") void loadRepair().catch(() => {});
  else if (mode === "converter") void loadConverter().catch(() => {});
}

function isBasicMode(mode: JsonWorkspaceMode) {
  return mode === "format" || mode === "minify" || mode === "validate";
}

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
  const [focused, setFocused] = useState(false);
  const activeModeRef = useRef<HTMLButtonElement>(null);
  const tTools = useTranslations("tools");
  const tModes = useTranslations("tool.modes");
  const t = useTranslations("jsonWorkspace");

  useEffect(() => {
    // Start the local runtime in parallel with the editor component chunk.
    void preloadMonaco().catch(() => {});
  }, []);

  useEffect(() => {
    activeModeRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [mode]);

  useEffect(() => {
    if (!focused) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setFocused(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onEscape);
    };
  }, [focused]);

  function selectMode(next: JsonWorkspaceMode) {
    if (next === mode) return;
    const store = useJsonStore.getState();
    store.setOutput("");
    store.setStatus(isBasicMode(mode) && isBasicMode(next)
      ? { state: store.status.state === "processing" ? "idle" : store.status.state, durationMs: null }
      : { state: "idle", error: null, durationMs: null });
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
    <div className={cn("w-full min-w-0 px-3 pb-4 pt-3 sm:px-4 lg:px-5", focused && "fixed inset-0 z-[60] flex flex-col overflow-hidden bg-background p-3 sm:p-4")}>
      <header className="mb-3 flex min-w-0 flex-wrap items-center justify-between gap-x-5 gap-y-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Braces className="h-[18px] w-[18px]" /></span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold leading-6 tracking-tight text-foreground">{tTools("json.title")}<span className="mx-2 font-normal text-muted-foreground/50" aria-hidden> / </span><span className="text-base font-medium text-muted-foreground">{label(mode)}</span></h1>
            <p className="truncate text-xs text-muted-foreground" title={description}>{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"><LockKeyhole className="h-3.5 w-3.5" />{t("localOnly")}</span>
          <button type="button" onClick={() => setFocused((value) => !value)} aria-pressed={focused} aria-label={focused ? t("exitFocus") : t("enterFocus")} title={focused ? t("exitFocus") : t("enterFocus")} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
            {focused ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">{focused ? t("exitFocus") : t("enterFocus")}</span>
          </button>
        </div>
      </header>

      <section aria-label={title} className={cn("min-w-0 overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft", focused && "flex min-h-0 flex-1 flex-col overflow-y-auto")}>
          <nav aria-label={t("modeNavigation")} className="flex gap-1 overflow-x-auto border-b border-border/80 bg-muted/20 px-2 py-2 sm:px-3">
            {JSON_MODES.map((value, index) => {
              const Icon = modeIcons[value];
              return (
                <Fragment key={value}>
                  {index === 0 && <span className="hidden shrink-0 self-center px-2 text-[11px] font-medium text-muted-foreground lg:inline">{t("editGroup")}</span>}
                  {index === 3 && <><span className="mx-1 hidden h-5 w-px shrink-0 self-center bg-border lg:block" aria-hidden /><span className="hidden shrink-0 self-center px-2 text-[11px] font-medium text-muted-foreground lg:inline">{t("analyzeGroup")}</span></>}
                  <button ref={mode === value ? activeModeRef : undefined} type="button" aria-current={mode === value ? "page" : undefined} title={t(`hints.${value}`)} onMouseEnter={() => preloadMode(value)} onFocus={() => preloadMode(value)} onClick={() => selectMode(value)} className={cn("inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors", mode === value ? "bg-card text-primary shadow-sm ring-1 ring-border/80" : "text-muted-foreground hover:bg-card/70 hover:text-foreground")}>
                    <Icon className="h-4 w-4" />{label(value)}
                  </button>
                </Fragment>
              );
            })}
          </nav>
            {mode === "format" || mode === "minify" || mode === "validate" ? (
              <JsonTool initialMode={mode as ToolMode} title={title} description={description} showModeSwitch={false} embedded focused={focused} />
            ) : mode === "tree" ? (
              <JsonTree title={title} description={description} embedded focused={focused} />
            ) : mode === "diff" ? (
              <JsonDiff title={title} description={description} embedded focused={focused} />
            ) : mode === "repair" ? (
              <JsonRepair title={title} description={description} embedded focused={focused} />
            ) : (
              <JsonConverter title={title} description={description} embedded focused={focused} />
            )}
      </section>
    </div>
  );
}
