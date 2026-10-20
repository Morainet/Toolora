"use client";

import { useMemo, useRef, useState } from "react";
import { FileUp, Network, Upload, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { openXmind, XmindFormatError, type XmindTopic, type XmindWorkbook } from "@parsy/file-parser";
import { Button } from "@/components/ui/button";
import { useToolFocus } from "@/components/layout/tool-focus-context";
import { layoutXmindSheet } from "@/lib/xmind-layout";
import { cn } from "@/lib/utils";

const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export function XmindViewer({ title, description }: { title: string; description: string }) {
  const t = useTranslations("xmindViewer");
  const focused = useToolFocus();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestRef = useRef(0);
  const [workbook, setWorkbook] = useState<XmindWorkbook | null>(null);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sheet = workbook?.sheets[sheetIndex];
  const map = useMemo(() => sheet ? layoutXmindSheet(sheet, collapsed) : null, [sheet, collapsed]);
  const nodeById = useMemo(() => new Map(map?.nodes.map((node) => [node.topic.id, node]) ?? []), [map]);
  const selected = selectedId ? nodeById.get(selectedId)?.topic : undefined;

  async function selectFile(file?: File) {
    if (!file) return;
    const request = ++requestRef.current;
    setBusy(true); setError(null);
    try {
      const result = await openXmind(file);
      if (request !== requestRef.current) return;
      setWorkbook(result); setSheetIndex(0); setSelectedId(result.sheets[0].root.id); setCollapsed(new Set()); setZoom(1);
    } catch (cause) {
      if (request !== requestRef.current) return;
      setError(cause instanceof XmindFormatError && cause.message === "Choose a .xmind file" ? t("wrongType") : cause instanceof XmindFormatError && /too large|exceeds/.test(cause.message) ? t("tooLarge") : t("openFailed"));
    } finally { if (request === requestRef.current) setBusy(false); }
  }

  function switchSheet(index: number) {
    if (!workbook) return;
    setSheetIndex(index); setSelectedId(workbook.sheets[index].root.id); setCollapsed(new Set()); setZoom(1);
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
    const index = ZOOM_STEPS.findIndex((step) => step >= zoom);
    setZoom(ZOOM_STEPS[Math.max(0, Math.min(ZOOM_STEPS.length - 1, index + direction))]);
  }

  return <main className={cn("flex min-h-[calc(100svh-7rem)] min-w-0 flex-col gap-4 px-3 py-4 sm:px-4 lg:px-5", focused && "min-h-[calc(100svh-3rem)]")}>
    <header className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><p className="text-xs text-muted-foreground">{t("privacy")}</p></header>
    <input ref={inputRef} type="file" accept=".xmind,application/vnd.xmind.workbook" className="sr-only" aria-label={t("choose")} disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; event.target.value = ""; void selectFile(file); }} />
    {error && <p role="alert" className="rounded-xl border border-destructive/50 p-4 text-sm text-destructive">{error}</p>}
    {!workbook ? <section aria-busy={busy} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void selectFile(event.dataTransfer.files[0]); }} className="flex min-h-[calc(100svh-15rem)] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/70 p-8 text-center">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary"><Network className="h-7 w-7" /></div>
      <h2 className="text-xl font-semibold">{busy ? t("opening") : t("dropTitle")}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("dropHint")}</p>
      <Button className="mt-6" onClick={() => inputRef.current?.click()} disabled={busy}><Upload className="h-4 w-4" />{t("choose")}</Button>
    </section> : <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-3 sm:px-4">
        <div className="min-w-0"><h2 className="truncate text-sm font-semibold" title={workbook.name}>{workbook.name}</h2><p className="text-xs text-muted-foreground">{t("summary", { sheets: workbook.sheets.length, topics: workbook.topicCount })}</p></div>
        <div className="flex items-center gap-1 sm:gap-2"><Button variant="ghost" size="icon" aria-label={t("zoomOut")} disabled={zoom === ZOOM_STEPS[0]} onClick={() => changeZoom(-1)}><ZoomOut className="h-4 w-4" /></Button><span className="w-11 text-center text-xs tabular-nums text-muted-foreground">{Math.round(zoom * 100)}%</span><Button variant="ghost" size="icon" aria-label={t("zoomIn")} disabled={zoom === ZOOM_STEPS[ZOOM_STEPS.length - 1]} onClick={() => changeZoom(1)}><ZoomIn className="h-4 w-4" /></Button><Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={busy}><FileUp className="h-4 w-4" /><span className="hidden sm:inline">{t("replace")}</span></Button></div>
      </div>
      {workbook.sheets.length > 1 && <div role="tablist" aria-label={t("sheets")} className="flex gap-1 overflow-x-auto border-b border-border px-3 py-2 sm:px-4">{workbook.sheets.map((item, index) => <button key={item.id} type="button" role="tab" aria-selected={index === sheetIndex} onClick={() => switchSheet(index)} className={cn("shrink-0 rounded-lg px-3 py-1.5 text-sm", index === sheetIndex ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{item.title}</button>)}</div>}
      {sheet && map && <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_240px] lg:grid-rows-1">
        <div tabIndex={0} role="region" aria-label={t("mapRegion")} className={cn("h-[calc(100svh-19rem)] min-h-[360px] min-w-0 overflow-auto bg-muted/30 p-3 outline-none sm:p-5", focused && "h-[calc(100svh-15rem)]") }>
          <svg width={map.width * zoom} height={map.height * zoom} viewBox={`0 0 ${map.width} ${map.height}`} role="group" aria-label={`${sheet.title}: ${sheet.root.title}`} className="max-w-none">
            {map.nodes.filter((node) => node.parentId).map((node) => {
              const parent = nodeById.get(node.parentId!);
              if (!parent) return null;
              const startX = parent.x + 220;
              const endX = node.x;
              const startY = parent.y + 31;
              const endY = node.y + 31;
              return <path key={`${node.parentId}-${node.topic.id}`} d={`M ${startX} ${startY} C ${startX + 45} ${startY}, ${endX - 45} ${endY}, ${endX} ${endY}`} fill="none" stroke="var(--color-primary)" strokeOpacity="0.45" strokeWidth="2" />;
            })}
            {map.nodes.map((node) => <g key={node.topic.id} role="button" tabIndex={0} aria-label={`${node.topic.title}${node.childCount ? `, ${node.childCount}` : ""}`} onClick={() => setSelectedId(node.topic.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(node.topic.id); } }} className="cursor-pointer outline-none">
              <rect x={node.x} y={node.y} width="220" height="62" rx="12" fill={selectedId === node.topic.id ? "var(--color-primary-soft)" : "var(--color-card)"} stroke={selectedId === node.topic.id ? "var(--color-primary)" : "var(--color-border)"} strokeWidth={selectedId === node.topic.id ? "2" : "1"} />
              <text x={node.x + 14} y={node.y + 27} fill="var(--color-foreground)" fontSize="14" fontWeight={node.parentId ? "500" : "700"}>{node.topic.title.length > 22 ? `${node.topic.title.slice(0, 21)}…` : node.topic.title}</text>
              {node.childCount > 0 && <g role="button" tabIndex={0} aria-label={collapsed.has(node.topic.id) ? t("expand") : t("collapse")} onClick={(event) => { event.stopPropagation(); toggleCollapse(node.topic); }} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); event.stopPropagation(); toggleCollapse(node.topic); } }}><rect x={node.x + 181} y={node.y + 34} width="27" height="19" rx="9" fill="var(--color-muted)" /><text x={node.x + 194.5} y={node.y + 48} textAnchor="middle" fill="var(--color-muted-foreground)" fontSize="12">{collapsed.has(node.topic.id) ? "+" : "−"}</text></g>}
            </g>)}
          </svg>
        </div>
        <aside className="max-h-48 overflow-auto border-t border-border bg-card p-4 lg:max-h-none lg:border-l lg:border-t-0" aria-label={t("details")}><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t("details")}</p><h3 className="mt-3 break-words font-semibold">{selected?.title ?? sheet.root.title}</h3><p className="mt-2 text-xs text-muted-foreground">{t("children", { count: selected?.children.length ?? sheet.root.children.length })}</p>{selected?.note && <p className="mt-4 whitespace-pre-wrap break-words border-t border-border pt-4 text-sm leading-6">{selected.note}</p>}<p className="mt-5 text-xs leading-5 text-muted-foreground">{t("hint")}</p></aside>
      </div>}
    </section>}
  </main>;
}
