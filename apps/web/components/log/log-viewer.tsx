"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, ChevronDown, ChevronRight, Clipboard, Download, FileSearch2, LockKeyhole, PanelLeftClose, PanelLeftOpen, Search, Upload, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { filterLogEntries, levelGroup, parseLog, type LogEntry, type LogFilterLevel } from "@/lib/log-parser";
import { cn } from "@/lib/utils";

const MAX_FILE_BYTES = 8 * 1024 * 1024;
const PAGE_SIZE = 200;
const FILTERS: LogFilterLevel[] = ["ALL", "ERROR", "WARN", "INFO", "DEBUG", "OTHER"];
const SAMPLE = `2026-10-12 09:41:02.105 INFO [gateway] Server started on port 3000
2026-10-12 09:41:03.211 DEBUG [auth] Checking session for user 1842
2026-10-12 09:41:03.502 WARN [cache] Redis timeout; using local fallback
2026-10-12 09:41:04.016 ERROR [api] GET /orders failed with 503
    at fetchOrders (/app/orders.ts:42)
Caused by: upstream connection reset
2026-10-12 09:41:04.224 INFO [gateway] Request completed in 719ms
{"timestamp":"2026-10-12T09:41:05.001Z","level":"error","service":"payments","message":"Charge declined","requestId":"req_82a"}`;

function levelTone(level: LogEntry["level"]): string {
  switch (levelGroup(level)) {
    case "ERROR": return "border-destructive/20 bg-destructive/10 text-destructive";
    case "WARN": return "border-warning/25 bg-warning/10 text-warning";
    case "INFO": return "border-primary/20 bg-primary/10 text-primary";
    case "DEBUG": return "border-border bg-muted text-muted-foreground";
    default: return "border-border bg-card text-muted-foreground";
  }
}

function Highlight({ text, query }: { text: string; query: string }) {
  const needle = query.trim();
  if (!needle) return <>{text}</>;
  const lower = text.toLocaleLowerCase();
  const target = needle.toLocaleLowerCase();
  const pieces: React.ReactNode[] = [];
  let cursor = 0;
  let match = lower.indexOf(target);
  while (match !== -1) {
    pieces.push(text.slice(cursor, match));
    pieces.push(<mark key={match} className="rounded-sm bg-warning/30 text-inherit">{text.slice(match, match + needle.length)}</mark>);
    cursor = match + needle.length;
    match = lower.indexOf(target, cursor);
  }
  pieces.push(text.slice(cursor));
  return <>{pieces}</>;
}

export function LogViewer() {
  const t = useTranslations("logViewer");
  const inputRef = useRef<HTMLInputElement>(null);
  const [sourceText, setSourceText] = useState("");
  const [appliedText, setAppliedText] = useState("");
  const [sourceName, setSourceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<LogFilterLevel>("ALL");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [showSource, setShowSource] = useState(true);
  const [selectedSource, setSelectedSource] = useState("");

  const entries = useMemo(() => parseLog(appliedText), [appliedText]);
  const filtered = useMemo(() => filterLogEntries(entries, level, query, selectedSource), [entries, level, query, selectedSource]);
  const counts = useMemo(() => {
    const result: Record<LogFilterLevel, number> = { ALL: entries.length, ERROR: 0, WARN: 0, INFO: 0, DEBUG: 0, OTHER: 0 };
    for (const entry of entries) result[levelGroup(entry.level)]++;
    return result;
  }, [entries]);
  const sources = useMemo(() => {
    const totals = new Map<string, number>();
    for (const entry of entries) if (entry.source) totals.set(entry.source, (totals.get(entry.source) ?? 0) + 1);
    return [...totals].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  }, [entries]);
  const visible = filtered.slice(0, visibleCount);
  const hasResults = entries.length > 0;
  const draftChanged = hasResults && sourceText !== appliedText;

  useEffect(() => { setVisibleCount(PAGE_SIZE); setExpandedId(null); }, [level, query, selectedSource, appliedText]);

  function setDraft(value: string) {
    setSourceText(value);
    setError(null);
  }

  async function loadFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { setError(t("fileTooLarge")); setShowSource(true); return; }
    if (!/\.(log|txt|jsonl|ndjson|json)$/i.test(file.name)) { setError(t("unsupportedFile")); setShowSource(true); return; }
    try {
      const text = await file.text();
      setSourceText(text);
      setAppliedText(text);
      setSourceName(file.name);
      setError(null);
      setQuery("");
      setLevel("ALL");
      setSelectedSource("");
      setShowSource(false);
    } catch {
      setError(t("readFailed"));
      setShowSource(true);
    }
  }

  function runParse() {
    if (!sourceText.trim()) { setError(t("emptyInput")); return; }
    setError(null);
    setAppliedText(sourceText);
    setQuery("");
    setLevel("ALL");
    setSelectedSource("");
    setShowSource(false);
  }

  function clear() {
    setSourceText(""); setAppliedText(""); setSourceName(null); setError(null); setQuery(""); setLevel("ALL"); setSelectedSource(""); setShowSource(true);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function copyEntry(entry: LogEntry) {
    try { await navigator.clipboard.writeText(entry.raw); toast.success(t("copied")); }
    catch { toast.error(t("copyFailed")); }
  }

  function exportResults() {
    const blob = new Blob([filtered.map((entry) => entry.raw).join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "toolora-filtered-logs.log";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <div className="w-full min-w-0 px-3 pb-4 pt-3 sm:px-4 lg:px-5">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><FileSearch2 className="h-[18px] w-[18px]" /></span>
          <div className="min-w-0"><h1 className="text-xl font-semibold leading-6 tracking-tight">{t("title")}</h1><p className="truncate text-xs text-muted-foreground">{t("description")}</p></div>
        </div>
        <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"><LockKeyhole className="h-3.5 w-3.5" />{t("localOnly")}</span>
      </header>

      <input ref={inputRef} type="file" accept=".log,.txt,.jsonl,.ndjson,.json,text/plain,application/x-ndjson" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(event) => { void loadFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />

      <div className={cn("grid min-w-0 gap-4", hasResults && showSource && "lg:grid-cols-[minmax(300px,0.38fr)_minmax(0,1fr)] lg:items-start")} onDragOver={(event) => { if (event.dataTransfer.types.includes("Files")) event.preventDefault(); }} onDrop={(event) => { if (event.dataTransfer.files.length) { event.preventDefault(); void loadFile(event.dataTransfer.files[0]); } }}>
      <section id="log-source-panel" className={cn("flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft", hasResults && "lg:h-[calc(100svh-10rem)] lg:min-h-[520px]", hasResults && !showSource && "hidden")} aria-labelledby="log-source-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/20 px-4 py-3 sm:px-5">
          <div><h2 id="log-source-title" className="text-sm font-semibold">{t("sourceTitle")}</h2><p className="mt-0.5 text-xs text-muted-foreground">{sourceName ?? t("sourceHint")}</p></div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}><Upload className="mr-1.5 h-4 w-4" />{t("chooseFile")}</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => { setSourceText(SAMPLE); setAppliedText(SAMPLE); setSourceName(null); setError(null); setQuery(""); setLevel("ALL"); setSelectedSource(""); setShowSource(false); }}>{t("sample")}</Button>
            {sourceText && <Button type="button" variant="ghost" size="sm" onClick={clear}><X className="mr-1 h-4 w-4" />{t("clear")}</Button>}
          </div>
        </div>
        <div className="flex min-h-0 flex-1 flex-col p-4">
          <label htmlFor="log-source" className="sr-only">{t("pasteLabel")}</label>
          <textarea id="log-source" spellCheck={false} value={sourceText} onChange={(event) => setDraft(event.target.value)} placeholder={t("placeholder")} className={cn("min-h-60 w-full flex-1 resize-y rounded-xl border border-input bg-background px-4 py-3 font-mono text-xs leading-6 text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/10 sm:text-sm", entries.length > 0 ? "lg:min-h-0 lg:resize-none" : "lg:min-h-[min(48svh,480px)]")} />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{draftChanged ? t("draftChanged") : t("formatHint")}</p><Button type="button" onClick={runParse} disabled={!sourceText.trim()}>{draftChanged ? t("reparseButton") : t("parseButton")}</Button></div>
          {error && <p role="alert" className="mt-3 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"><AlertCircle className="h-4 w-4" />{error}</p>}
        </div>
      </section>

      {hasResults && <section className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-border/80 bg-card shadow-soft lg:h-[calc(100svh-10rem)] lg:min-h-[520px]" aria-labelledby="log-results-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5"><div><h2 id="log-results-title" className="text-base font-semibold">{t("resultsTitle")}</h2><p className="mt-0.5 text-xs text-muted-foreground">{t("summary", { entries: entries.length, lines: appliedText.replace(/\r\n?/g, "\n").trimEnd().split("\n").length })}{draftChanged && <span className="ml-2 font-medium text-warning">· {t("pendingChanges")}</span>}</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}><Upload className="mr-1.5 h-4 w-4" />{t("chooseFile")}</Button><Button type="button" variant="outline" size="sm" onClick={() => setShowSource((value) => !value)} aria-expanded={showSource} aria-controls="log-source-panel">{showSource ? <PanelLeftClose className="mr-1.5 h-4 w-4" /> : <PanelLeftOpen className="mr-1.5 h-4 w-4" />}{showSource ? t("hideSource") : t("editSource")}</Button><Button type="button" variant="outline" size="sm" onClick={exportResults} disabled={filtered.length === 0}><Download className="mr-1.5 h-4 w-4" />{t("export")}</Button></div></div>
        <div className="grid grid-cols-2 gap-2 border-b border-border/80 bg-muted/10 px-4 py-3 sm:grid-cols-4 sm:px-5">
          <Insight label={t("insights.total")} value={counts.ALL} onClick={() => setLevel("ALL")} active={level === "ALL"} />
          <Insight label={t("insights.errors")} value={counts.ERROR} onClick={() => setLevel("ERROR")} active={level === "ERROR"} tone="error" />
          <Insight label={t("insights.warnings")} value={counts.WARN} onClick={() => setLevel("WARN")} active={level === "WARN"} tone="warn" />
          <div className="min-w-0 rounded-lg border border-border/80 bg-card px-3 py-2"><p className="text-[11px] text-muted-foreground">{t("insights.sources")}</p><p className="truncate text-lg font-semibold tabular-nums">{sources.length}<span className="ml-2 text-xs font-normal text-muted-foreground">{sources[0]?.[0] ?? "—"}</span></p></div>
        </div>
        <div className="border-b border-border/80 bg-muted/10 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap gap-2"><div className="relative min-w-[220px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t("searchPlaceholder")} aria-label={t("searchLabel")} className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" /></div><select value={selectedSource} onChange={(event) => setSelectedSource(event.target.value)} aria-label={t("sourceFilter")} className="h-10 max-w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 sm:max-w-[220px]"><option value="">{t("allSources")}</option>{sources.map(([name, count]) => <option key={name} value={name}>{name} ({count})</option>)}</select></div>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label={t("levelFilter")}>
            {FILTERS.map((option) => <button key={option} type="button" onClick={() => setLevel(option)} aria-pressed={level === option} className={cn("shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors", level === option ? "border-primary/25 bg-primary/10 text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground")}>{t(`levels.${option}`)} <span className="ml-1 tabular-nums opacity-70">{counts[option]}</span></button>)}
          </div>
        </div>
        <div className="flex items-center justify-between border-b border-border/70 px-4 py-2.5 text-xs text-muted-foreground sm:px-5"><span>{t("matched", { count: filtered.length })}</span><span>{t("expandHint")}</span></div>
        {filtered.length === 0 ? <div className="flex flex-1 items-center justify-center px-5 py-16 text-center text-sm text-muted-foreground">{t("noMatches")}</div> : <div className="min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto">
          {visible.map((entry) => {
            const expanded = expandedId === entry.id;
            return <div key={entry.id}>
              <button type="button" onClick={() => setExpandedId(expanded ? null : entry.id)} aria-expanded={expanded} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/35 sm:px-5 lg:grid-cols-[52px_190px_76px_minmax(0,1fr)_auto] lg:gap-4">
                <span className="hidden pt-0.5 font-mono text-xs tabular-nums text-muted-foreground lg:block">{entry.startLine}</span>
                <span className="hidden pt-0.5 font-mono text-xs text-muted-foreground lg:block">{entry.timestamp ?? "—"}</span>
                <span className={cn("rounded-md border px-1.5 py-0.5 text-center font-mono text-[10px] font-semibold", levelTone(entry.level))}>{entry.level}</span>
                <span className="min-w-0"><span className="mb-1 block text-[11px] text-muted-foreground lg:hidden">{entry.timestamp ?? t("lineNumber", { line: entry.startLine })}</span>{entry.source && <span className="mr-2 font-mono text-xs text-muted-foreground">[{entry.source}]</span>}<span className="break-words font-mono text-xs leading-5"><Highlight text={entry.message.split("\n")[0]} query={query} /></span>{entry.endLine > entry.startLine && <span className="ml-2 whitespace-nowrap text-[11px] text-muted-foreground">+{entry.endLine - entry.startLine} {t("moreLines")}</span>}</span>
                {expanded ? <ChevronDown className="mt-0.5 h-4 w-4 text-muted-foreground" /> : <ChevronRight className="mt-0.5 h-4 w-4 text-muted-foreground" />}
              </button>
              {expanded && <div className="border-t border-border/60 bg-muted/25 px-4 py-4 sm:px-5 lg:pl-[calc(52px+2.5rem)]"><div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-medium text-muted-foreground">{t("rawEntry", { start: entry.startLine, end: entry.endLine })}</p><Button type="button" variant="ghost" size="sm" onClick={() => void copyEntry(entry)}><Clipboard className="mr-1.5 h-3.5 w-3.5" />{t("copy")}</Button></div><pre className="max-h-80 overflow-auto whitespace-pre-wrap break-all rounded-lg border border-border bg-background p-3 font-mono text-xs leading-5">{entry.raw}</pre><div className="mt-4"><p className="mb-2 text-xs font-medium text-muted-foreground">{t("context")}</p><div className="space-y-1 rounded-lg border border-border bg-background p-3 font-mono text-xs leading-5">{entries.slice(Math.max(0, entry.id - 2), Math.min(entries.length, entry.id + 3)).map((nearby) => <p key={nearby.id} className={cn("break-all", nearby.id === entry.id ? "text-primary" : "text-muted-foreground")}><span className="mr-3 inline-block w-9 text-right tabular-nums opacity-60">{nearby.startLine}</span>{nearby.raw.split("\n")[0]}</p>)}</div></div></div>}
            </div>;
          })}
          {visibleCount < filtered.length && <div className="p-4 text-center"><Button type="button" variant="outline" onClick={() => setVisibleCount((value) => value + PAGE_SIZE)}>{t("loadMore", { count: Math.min(PAGE_SIZE, filtered.length - visibleCount) })}</Button></div>}
        </div>}
      </section>}
      </div>
    </div>
  );
}

function Insight({ label, value, onClick, active, tone }: { label: string; value: number; onClick: () => void; active: boolean; tone?: "error" | "warn" }) {
  return <button type="button" onClick={onClick} aria-pressed={active} className={cn("min-w-0 rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:border-primary/40", active ? "border-primary/40" : "border-border/80")}><span className="text-[11px] text-muted-foreground">{label}</span><span className={cn("block text-lg font-semibold tabular-nums", tone === "error" && "text-destructive", tone === "warn" && "text-warning")}>{value}</span></button>;
}
