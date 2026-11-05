"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FileUp, Info, Maximize, Network, Search, Upload, X, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { openXmind, XmindFormatError, type XmindTopic, type XmindWorkbook } from "@parsy/file-parser";
import { Button } from "@/components/ui/button";
import { useToolFocus } from "@/components/layout/tool-focus-context";
import { layoutXmindSheet, topicTitleLines } from "@/lib/xmind-layout";
import { searchXmindTopics, type XmindSearchResult } from "@/lib/xmind-search";
import { cn } from "@/lib/utils";

const ZOOM_STEPS = [0.1, 0.2, 0.35, 0.5, 0.75, 1, 1.25, 1.5, 2];

export function XmindViewer({ title, description }: { title: string; description: string }) {
  const t = useTranslations("xmindViewer");
  const focused = useToolFocus();
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const focusSequenceRef = useRef(0);
  const requestRef = useRef(0);
  const [workbook, setWorkbook] = useState<XmindWorkbook | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState<number | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [focusRequest, setFocusRequest] = useState<{ id: string; sheetIndex: number; sequence: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sheet = workbook?.sheets[sheetIndex];
  const map = useMemo(() => sheet ? layoutXmindSheet(sheet, collapsed) : null, [sheet, collapsed]);
  const fitZoom = map && canvasSize.width && canvasSize.height
    ? Math.max(0.1, Math.min(1.5, (canvasSize.width - 24) / map.width, (canvasSize.height - 24) / map.height))
    : 1;
  const effectiveZoom = zoom ?? fitZoom;
  const nodeById = useMemo(() => new Map(map?.nodes.map((node) => [node.topic.id, node]) ?? []), [map]);
  const selected = selectedId ? nodeById.get(selectedId)?.topic : undefined;
  const matches = useMemo(() => workbook ? searchXmindTopics(workbook, query) : [], [workbook, query]);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setCanvasSize({ width: element.clientWidth, height: element.clientHeight }));
    observer.observe(element);
    setCanvasSize({ width: element.clientWidth, height: element.clientHeight });
    return () => observer.disconnect();
  }, [workbook]);

  useEffect(() => { if (searchOpen) searchRef.current?.focus(); }, [searchOpen]);

  useEffect(() => {
    if (!focusRequest || focusRequest.sheetIndex !== sheetIndex) return;
    const element = canvasRef.current;
    const node = nodeById.get(focusRequest.id);
    if (!element || !node) return;
    element.scrollTo({
      left: Math.max(0, (node.x + 110) * effectiveZoom - element.clientWidth / 2),
      top: Math.max(0, (node.y + 31) * effectiveZoom - element.clientHeight / 2),
      behavior: "smooth",
    });
  }, [focusRequest, sheetIndex, nodeById, effectiveZoom]);

  async function selectFile(file?: File) {
    if (!file) return;
    const request = ++requestRef.current;
    setBusy(true); setError(null);
    try {
      const result = await openXmind(file);
      if (request !== requestRef.current) return;
      setWorkbook(result); setSheetIndex(0); setSelectedId(result.sheets[0].root.id); setCollapsed(new Set()); setZoom(null); setDetailsOpen(false); setSearchOpen(false); setQuery(""); setFocusRequest(null);
    } catch (cause) {
      if (request !== requestRef.current) return;
      setError(cause instanceof XmindFormatError && cause.message === "Choose a .xmind file" ? t("wrongType") : cause instanceof XmindFormatError && /too large|exceeds/.test(cause.message) ? t("tooLarge") : t("openFailed"));
    } finally { if (request === requestRef.current) setBusy(false); }
  }

  function switchSheet(index: number) {
    if (!workbook) return;
    setSheetIndex(index); setSelectedId(workbook.sheets[index].root.id); setCollapsed(new Set()); setZoom(null); setDetailsOpen(false); setFocusRequest(null);
  }

  function selectMatch(result: XmindSearchResult) {
    if (result.sheetIndex !== sheetIndex) {
      setSheetIndex(result.sheetIndex);
      setCollapsed(new Set());
    } else {
      setCollapsed((current) => {
        const next = new Set(current);
        result.ancestorIds.forEach((id) => next.delete(id));
        return next;
      });
    }
    setZoom(Math.max(0.75, result.sheetIndex === sheetIndex ? effectiveZoom : 0.75));
    setSelectedId(result.topic.id);
    setDetailsOpen(false);
    setSearchOpen(false);
    setFocusRequest({ id: result.topic.id, sheetIndex: result.sheetIndex, sequence: ++focusSequenceRef.current });
  }

  function toggleCollapse(topic: XmindTopic) {
    if (!topic.children.length) return;
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(topic.id)) next.delete(topic.id); else next.add(topic.id);
      return next;
    });
  }

  function changeZoom(direction: -1 | 1) {
    const next = direction > 0
      ? ZOOM_STEPS.find((step) => step > effectiveZoom + 0.01)
      : [...ZOOM_STEPS].reverse().find((step) => step < effectiveZoom - 0.01);
    if (next !== undefined) setZoom(next);
  }

  return <main className={cn("flex h-[calc(100svh-3.5rem)] min-h-0 min-w-0 flex-col gap-2 p-2 sm:p-3", focused && "h-[calc(100svh-3rem)]")}>
    <h1 className="sr-only">{title}</h1>
    <p className="sr-only">{description}</p>
    <input ref={inputRef} type="file" accept=".xmind,application/vnd.xmind.workbook" className="sr-only" aria-label={t("choose")} disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void selectFile(file); }} />
    {error && <p role="alert" className="rounded-xl border border-destructive/50 p-4 text-sm text-destructive">{error}</p>}
    {!workbook ? <section aria-busy={busy} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void selectFile(event.dataTransfer.files[0]); }} className="flex min-h-0 flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card/70 p-6 text-center">
      <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-primary/10 text-primary"><Network className="h-6 w-6" /></div>
      <h2 className="text-lg font-semibold">{busy ? t("opening") : t("dropTitle")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("dropHint")}</p>
      <Button className="mt-4" onClick={() => inputRef.current?.click()} disabled={busy}><Upload className="h-4 w-4" />{t("choose")}</Button>
    </section> : <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-border px-2 sm:px-3">
        <div className="min-w-0"><h2 className="truncate text-sm font-semibold" title={workbook.name}>{workbook.name}</h2></div>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("zoomOut")} disabled={effectiveZoom <= ZOOM_STEPS[0]} onClick={() => changeZoom(-1)}><ZoomOut className="h-4 w-4" /></Button>
          <span className="w-10 text-center text-[11px] tabular-nums text-muted-foreground">{Math.round(effectiveZoom * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("zoomIn")} disabled={effectiveZoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]} onClick={() => changeZoom(1)}><ZoomIn className="h-4 w-4" /></Button>
          <Button variant={zoom === null ? "secondary" : "ghost"} size="icon" className="h-8 w-8" aria-label={t("fitView")} title={t("fitView")} onClick={() => setZoom(null)}><Maximize className="h-4 w-4" /></Button>
          <span className="mx-1 h-4 w-px bg-border" />
          <Button variant={searchOpen ? "secondary" : "ghost"} size="icon" className="h-8 w-8" aria-label={t("search")} aria-expanded={searchOpen} onClick={() => setSearchOpen((open) => !open)}><Search className="h-4 w-4" /></Button>
          <Button variant={detailsOpen ? "secondary" : "ghost"} size="icon" className="h-8 w-8" aria-label={t("details")} aria-expanded={detailsOpen} onClick={() => setDetailsOpen((open) => !open)}><Info className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={t("replace")} title={t("replace")} onClick={() => inputRef.current?.click()} disabled={busy}><FileUp className="h-4 w-4" /></Button>
        </div>
      </div>
      {workbook.sheets.length > 1 && <div role="tablist" aria-label={t("sheets")} className="flex h-10 shrink-0 gap-1 overflow-x-auto border-b border-border px-2 py-1 sm:px-3">{workbook.sheets.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={index === sheetIndex} onClick={() => switchSheet(index)} className={cn("shrink-0 rounded-md px-3 text-xs", index === sheetIndex ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{item.title}</button>)}</div>}
      {sheet && map && <div className="relative min-h-0 flex-1">
        {searchOpen && <div className="absolute left-2 right-2 top-2 z-20 max-h-[min(55svh,440px)] overflow-hidden rounded-xl border border-border bg-card shadow-xl sm:left-3 sm:right-auto sm:top-3 sm:w-[340px]">
          <div className="flex items-center gap-2 border-b border-border px-3"><Search className="h-4 w-4 shrink-0 text-muted-foreground" /><input ref={searchRef} type="search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape") setSearchOpen(false); else if (event.key === "Enter" && matches[0]) selectMatch(matches[0]); }} placeholder={t("searchPlaceholder")} aria-label={t("search")} className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /><button type="button" onClick={() => setSearchOpen(false)} aria-label={t("closeSearch")} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button></div>
          {query.trim() && <div aria-label={t("searchResults")} className="max-h-[min(45svh,360px)] overflow-y-auto p-1.5">{matches.length ? matches.map((result, index) => <button key={`${result.sheetIndex}-${result.topic.id}-${index}`} type="button" onClick={() => selectMatch(result)} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-muted focus-visible:bg-muted"><span className="block truncate text-sm font-medium">{result.topic.title}</span><span className="block truncate text-xs text-muted-foreground">{result.sheetTitle}{result.path.length ? ` / ${result.path.join(" / ")}` : ""}</span></button>) : <p className="px-3 py-5 text-center text-sm text-muted-foreground">{t("noResults")}</p>}</div>}
        </div>}
        <div ref={canvasRef} tabIndex={0} role="region" aria-label={t("mapRegion")} className="absolute inset-0 overflow-auto bg-muted/20 p-2 outline-none sm:p-3">
          <svg width={map.width * effectiveZoom} height={map.height * effectiveZoom} viewBox={`0 0 ${map.width} ${map.height}`} role="group" aria-label={`${sheet.title}: ${sheet.root.title}`} className="max-w-none">
            {map.nodes.filter((node) => node.parentId).map((node) => {
              const parent = nodeById.get(node.parentId!);
              if (!parent) return null;
              const startX = parent.x + 220;
              const endX = node.x;
              const startY = parent.y + 31;
              const endY = node.y + 31;
              return <path key={`${node.parentId}-${node.topic.id}`} d={`M ${startX} ${startY} C ${startX + 45} ${startY}, ${endX - 45} ${endY}, ${endX} ${endY}`} fill="none" stroke="var(--color-primary)" strokeOpacity="0.45" strokeWidth="2" />;
            })}
            {map.nodes.map((node) => <g key={node.topic.id} role="button" tabIndex={0} aria-label={`${node.topic.title}${node.childCount ? `, ${node.childCount}` : ""}`} onClick={() => { setSelectedId(node.topic.id); setDetailsOpen(true); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(node.topic.id); setDetailsOpen(true); } }} className="cursor-pointer outline-none">
              <title>{node.topic.title}</title>
              <rect x={node.x} y={node.y} width="220" height="62" rx="12" fill={selectedId === node.topic.id ? "var(--color-primary-soft)" : "var(--color-card)"} stroke={selectedId === node.topic.id ? "var(--color-primary)" : "var(--color-border)"} strokeWidth={selectedId === node.topic.id ? "2" : "1"} />
              <TopicTitle x={node.x + 14} y={node.y + 26} title={node.topic.title} hasChildren={node.childCount > 0} strong={!node.parentId} />
              {node.childCount > 0 && <g role="button" tabIndex={0} aria-label={collapsed.has(node.topic.id) ? t("expand") : t("collapse")} onClick={(event) => { event.stopPropagation(); toggleCollapse(node.topic); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); toggleCollapse(node.topic); } }}><rect x={node.x + 181} y={node.y + 34} width="27" height="19" rx="9" fill="var(--color-muted)" /><text x={node.x + 194.5} y={node.y + 48} textAnchor="middle" fill="var(--color-muted-foreground)" fontSize="12">{collapsed.has(node.topic.id) ? "+" : "−"}</text></g>}
            </g>)}
          </svg>
        </div>
        {detailsOpen && <aside className="absolute bottom-2 left-2 right-2 z-10 max-h-[45%] overflow-auto rounded-xl border border-border bg-card p-4 shadow-xl sm:bottom-auto sm:left-auto sm:right-3 sm:top-3 sm:w-72" aria-label={t("details")}><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold text-muted-foreground">{t("details")}</p><button type="button" onClick={() => setDetailsOpen(false)} aria-label={t("closeDetails")} className="rounded-md p-1 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button></div><h3 className="mt-2 break-words font-semibold">{selected?.title ?? sheet.root.title}</h3><p className="mt-1 text-xs text-muted-foreground">{t("children", { count: selected?.children.length ?? sheet.root.children.length })}</p>{selected?.note && <p className="mt-3 whitespace-pre-wrap break-words border-t border-border pt-3 text-sm leading-6">{selected.note}</p>}</aside>}
      </div>}
    </section>}
  </main>;
}

function TopicTitle({ x, y, title, hasChildren, strong }: { x: number; y: number; title: string; hasChildren: boolean; strong: boolean }) {
  const lines = topicTitleLines(title, hasChildren);
  return <text x={x} y={y} fill="var(--color-foreground)" fontSize="14" fontWeight={strong ? "700" : "500"}>
    {lines.map((line, index) => <tspan key={index} x={x} dy={index === 0 ? 0 : 18}>{line}</tspan>)}
  </text>;
}
