"use client";

import { useLayoutEffect, useRef, useState, type Dispatch, type SetStateAction, type UIEvent } from "react";
import { ArrowLeftRight, Download, FileSpreadsheet, Plus } from "lucide-react";
import { toast } from "sonner";
import { type ParsedFile, type ParsedSheet } from "@parsy/file-parser";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToolFocus } from "@/components/layout/tool-focus-context";
import { columnLabel, visibleRange } from "@/lib/excel-virtualization";
import { exportExcelInWorker } from "@/lib/parse-excel-worker";
import { cn } from "@/lib/utils";

const HEADER_HEIGHT = 36;
const ROW_HEIGHT = 42;
const ROW_NUMBER_WIDTH = 48;
const MIN_COLUMN_WIDTH = 160;
const ROW_OVERSCAN = 10;
const COLUMN_OVERSCAN = 2;

type Viewport = { width: number; height: number; top: number; left: number };
type SetFile = Dispatch<SetStateAction<ParsedFile | null>>;

function updateSheet(file: ParsedFile, index: number, update: (sheet: ParsedSheet) => ParsedSheet): ParsedFile {
  const sheets = [...file.sheets];
  sheets[index] = update(sheets[index]);
  // For Excel, the sheets are the editable source of truth. Rebuilding the
  // whole-workbook text on every keystroke makes large files unresponsive.
  return { ...file, sheets };
}

export function ExcelGrid({ file, setFile }: { file: ParsedFile; setFile: SetFile }) {
  const t = useTranslations("fileParser");
  const focused = useToolFocus();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const scrollPositions = useRef(new Map<number, { top: number; left: number }>());
  const columnCounts = useRef(new Map<number, number>());
  const [viewport, setViewport] = useState<Viewport>({ width: 0, height: 0, top: 0, left: 0 });
  const [activeSheet, setActiveSheet] = useState(0);
  const [selected, setSelected] = useState({ row: 0, column: 0 });
  const [showSwipeHint, setShowSwipeHint] = useState(true);
  const [exporting, setExporting] = useState(false);
  const sheet = file.sheets[activeSheet];
  let columnCount = columnCounts.current.get(activeSheet) ?? 1;
  if (sheet && !columnCounts.current.has(activeSheet)) {
    columnCount = sheet.rows.reduce((max, row) => Math.max(max, row.length), 1);
    columnCounts.current.set(activeSheet, columnCount);
  }

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const measure = () => setViewport({
      width: scroller.clientWidth,
      height: scroller.clientHeight,
      top: scroller.scrollTop,
      left: scroller.scrollLeft,
    });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(scroller);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const saved = scrollPositions.current.get(activeSheet);
    scroller.scrollTo({ top: saved?.top ?? 0, left: saved?.left ?? 0 });
    setViewport((previous) => ({ ...previous, top: scroller.scrollTop, left: scroller.scrollLeft }));
  }, [activeSheet]);

  if (!sheet) return null;

  const rowCount = sheet.rows.length;
  const columnWidth = Math.max(MIN_COLUMN_WIDTH, (viewport.width - ROW_NUMBER_WIDTH) / columnCount);
  const totalWidth = ROW_NUMBER_WIDTH + columnCount * columnWidth;
  const rows = visibleRange(Math.max(0, viewport.top - HEADER_HEIGHT), viewport.height || 420, ROW_HEIGHT, rowCount, ROW_OVERSCAN);
  const columns = visibleRange(Math.max(0, viewport.left - ROW_NUMBER_WIDTH), viewport.width || 600, columnWidth, columnCount, COLUMN_OVERSCAN);
  const selectedValue = sheet.rows[selected.row]?.[selected.column] ?? "";
  const cellAddress = `${columnLabel(selected.column)}${selected.row + 1}`;

  function setCell(rowIndex: number, columnIndex: number, value: string) {
    setFile((previous) => {
      if (!previous || previous.sheets[activeSheet]?.rows[rowIndex]?.[columnIndex] === value) return previous;
      return updateSheet(previous, activeSheet, (current) => {
        const rows = [...current.rows];
        const row = [...rows[rowIndex]];
        while (row.length <= columnIndex) row.push("");
        row[columnIndex] = value;
        rows[rowIndex] = row;
        return { ...current, rows };
      });
    });
  }

  function addRow() {
    setFile((previous) => previous && updateSheet(previous, activeSheet, (current) => ({
      ...current,
      rows: [...current.rows, Array(columnCount).fill("")],
    })));
  }

  function addSheet() {
    const index = file.sheets.length;
    setFile((previous) => previous && { ...previous, sheets: [...previous.sheets, { name: `Sheet${index + 1}`, rows: [[""]] }] });
    columnCounts.current.set(index, 1);
    setActiveSheet(index);
    setSelected({ row: 0, column: 0 });
  }

  function selectSheet(index: number) {
    if (index === activeSheet) return;
    const scroller = scrollerRef.current;
    if (scroller) scrollPositions.current.set(activeSheet, { top: scroller.scrollTop, left: scroller.scrollLeft });
    const saved = scrollPositions.current.get(index);
    setViewport((previous) => ({ ...previous, top: saved?.top ?? 0, left: saved?.left ?? 0 }));
    setActiveSheet(index);
    setSelected({ row: 0, column: 0 });
  }

  function onScroll(event: UIEvent<HTMLDivElement>) {
    const { scrollTop: top, scrollLeft: left } = event.currentTarget;
    scrollPositions.current.set(activeSheet, { top, left });
    setViewport((previous) => previous.top === top && previous.left === left ? previous : { ...previous, top, left });
    if (left > 8) setShowSwipeHint(false);
  }

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      await exportExcelInWorker(file.sheets);
    } catch {
      toast.error(t("exportFailed"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl shadow-slate-900/[0.06]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600"><FileSpreadsheet className="h-5 w-5" /></span>
          <div className="min-w-0"><h2 className="truncate text-sm font-semibold">{file.name}</h2><p className="text-xs text-muted-foreground">{t("localOnly")} · {file.sheets.length} {t("sheets")}</p></div>
        </div>
        <div className="flex gap-2"><Button size="sm" className="h-10 sm:h-8" variant="outline" onClick={addRow}><Plus className="mr-1.5 h-4 w-4" />{t("addRow")}</Button><Button size="sm" className="h-10 sm:h-8" disabled={exporting} onClick={() => void handleExport()}><Download className="mr-1.5 h-4 w-4" />{exporting ? t("exporting") : t("export")}</Button></div>
      </div>

      <div className="flex items-center gap-2 border-b border-border/80 bg-muted/25 px-4 py-2">
        <span className="w-14 rounded-md border border-border bg-background px-2 py-1 text-center font-mono text-xs text-muted-foreground">{cellAddress}</span>
        <span className="text-xs text-muted-foreground">fx</span>
        <input value={selectedValue} onChange={(event) => setCell(selected.row, selected.column, event.target.value)} aria-label={t("formulaBar")} className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 sm:py-1 sm:text-sm" />
      </div>

      {columnCount > 1 && showSwipeHint && <p className="flex items-center justify-center gap-2 border-b border-border/80 bg-primary/[0.04] px-3 py-2 text-xs text-muted-foreground sm:hidden"><ArrowLeftRight className="h-4 w-4" />{t("swipeColumns")}</p>}
      <div ref={scrollerRef} onScroll={onScroll} className={cn("h-[calc(100svh-16rem)] min-h-[420px] overflow-auto overscroll-contain", focused && "h-[calc(100svh-12rem)]")}>
        <div role="grid" aria-label={sheet.name} aria-rowcount={rowCount + 1} aria-colcount={columnCount + 1} className="relative" style={{ width: totalWidth, height: HEADER_HEIGHT + rowCount * ROW_HEIGHT, minHeight: "100%" }}>
          <div role="row" aria-rowindex={1} className="sticky top-0 z-20 bg-muted text-xs text-muted-foreground" style={{ width: totalWidth, height: HEADER_HEIGHT }}>
            <div role="columnheader" aria-colindex={1} className="sticky left-0 z-30 flex h-full items-center justify-end border-b border-r border-border/80 bg-muted px-3" style={{ width: ROW_NUMBER_WIDTH }}>#</div>
            {Array.from({ length: columns.end - columns.start }, (_, offset) => {
              const columnIndex = columns.start + offset;
              return <div key={columnIndex} role="columnheader" aria-colindex={columnIndex + 2} className="absolute top-0 flex h-full items-center border-b border-r border-border/80 bg-muted px-3" style={{ left: ROW_NUMBER_WIDTH + columnIndex * columnWidth, width: columnWidth }}>{columnLabel(columnIndex)}</div>;
            })}
          </div>
          {Array.from({ length: rows.end - rows.start }, (_, offset) => {
            const rowIndex = rows.start + offset;
            const row = sheet.rows[rowIndex];
            return <div key={rowIndex} role="row" aria-rowindex={rowIndex + 2} className="group absolute left-0 hover:bg-primary/[0.035]" style={{ top: HEADER_HEIGHT + rowIndex * ROW_HEIGHT, width: totalWidth, height: ROW_HEIGHT }}>
              <div role="rowheader" aria-colindex={1} className="sticky left-0 z-10 flex h-full items-center justify-end border-b border-r border-border/80 bg-muted px-3 text-xs text-muted-foreground" style={{ width: ROW_NUMBER_WIDTH }}>{rowIndex + 1}</div>
              {Array.from({ length: columns.end - columns.start }, (_, columnOffset) => {
                const columnIndex = columns.start + columnOffset;
                const active = selected.row === rowIndex && selected.column === columnIndex;
                return <div key={columnIndex} role="gridcell" aria-colindex={columnIndex + 2} className={cn("absolute top-0 h-full border-b border-r border-border/80", active && "z-10 ring-2 ring-inset ring-primary")} style={{ left: ROW_NUMBER_WIDTH + columnIndex * columnWidth, width: columnWidth }}>
                  <input value={row[columnIndex] ?? ""} onFocus={() => setSelected({ row: rowIndex, column: columnIndex })} onChange={(event) => setCell(rowIndex, columnIndex, event.target.value)} aria-label={`${sheet.name} ${rowIndex + 1}:${columnIndex + 1}`} className="h-full w-full bg-transparent px-3 text-base outline-none sm:text-sm" />
                </div>;
              })}
            </div>;
          })}
        </div>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-t border-border/80 bg-muted/25 px-3 pt-2">
        {file.sheets.map((item, index) => <button key={item.name} type="button" onClick={() => selectSheet(index)} className={cn("whitespace-nowrap rounded-t-lg border border-b-0 px-4 py-2 text-sm transition-colors", index === activeSheet ? "border-border/80 bg-card font-medium text-primary" : "border-transparent text-muted-foreground hover:bg-muted")}>{item.name}</button>)}
        <button type="button" onClick={addSheet} className="ml-1 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted" aria-label={t("addSheet")}><Plus className="h-4 w-4" /></button>
      </div>
      <div className="flex items-center justify-between border-t border-border/80 px-4 py-2 text-xs text-muted-foreground"><span>{rowCount} {t("rows")} · {columnCount} {t("columns")}</span><span>{t("editableHint")}</span></div>
    </section>
  );
}
