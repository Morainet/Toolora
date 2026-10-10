"use client";

import { useMemo, useRef, useState } from "react";
import { Download, FileSpreadsheet, Plus, Upload } from "lucide-react";
import { exportExcel, parseFile, sheetsToText, type ParsedFile, type ParsedSheet, type SupportedFileKind } from "@parsy/file-parser";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

const ACCEPT: Record<SupportedFileKind, string> = {
  word: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  excel: ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
  pdf: ".pdf,application/pdf",
};

function updateSheet(file: ParsedFile, sheetIndex: number, update: (sheet: ParsedSheet) => ParsedSheet): ParsedFile {
  const sheets = file.sheets.map((sheet, index) => index === sheetIndex ? update(sheet) : sheet);
  return { ...file, sheets, text: sheetsToText(sheets) };
}

function ExcelGrid({ file, setFile }: { file: ParsedFile; setFile: (file: ParsedFile) => void }) {
  const t = useTranslations("fileParser");
  const [activeSheet, setActiveSheet] = useState(0);
  const [selected, setSelected] = useState({ row: 0, column: 0 });
  const sheet = file.sheets[activeSheet];
  const columnCount = useMemo(() => Math.max(1, ...(sheet?.rows.map((row) => row.length) ?? [1])), [sheet]);

  if (!sheet) return null;
  const selectedValue = sheet.rows[selected.row]?.[selected.column] ?? "";
  const cellAddress = `${String.fromCharCode(65 + selected.column)}${selected.row + 1}`;

  function setCell(rowIndex: number, columnIndex: number, value: string) {
    setFile(updateSheet(file, activeSheet, (current) => ({
      ...current,
      rows: current.rows.map((row, index) => {
        if (index !== rowIndex) return row;
        const next = [...row];
        while (next.length <= columnIndex) next.push("");
        next[columnIndex] = value;
        return next;
      }),
    })));
  }

  function addRow() {
    setFile(updateSheet(file, activeSheet, (current) => ({ ...current, rows: [...current.rows, Array(columnCount).fill("")] })));
  }

  function addSheet() {
    const sheets = [...file.sheets, { name: `Sheet${file.sheets.length + 1}`, rows: [[""]] }];
    setFile({ ...file, sheets, text: sheetsToText(sheets) });
    setActiveSheet(file.sheets.length);
  }

  function setSelectedValue(value: string) {
    setCell(selected.row, selected.column, value);
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl shadow-slate-900/[0.06]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/80 px-4 py-3 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-600"><FileSpreadsheet className="h-5 w-5" /></span>
          <div className="min-w-0"><h2 className="truncate text-sm font-semibold">{file.name}</h2><p className="text-xs text-muted-foreground">{t("localOnly")} · {file.sheets.length} {t("sheets")}</p></div>
        </div>
        <div className="flex gap-2"><Button size="sm" variant="outline" onClick={addRow}><Plus className="mr-1.5 h-4 w-4" />{t("addRow")}</Button><Button size="sm" onClick={() => void exportExcel(file.sheets)}><Download className="mr-1.5 h-4 w-4" />{t("export")}</Button></div>
      </div>

      <div className="flex items-center gap-2 border-b border-border/80 bg-muted/25 px-4 py-2">
        <span className="w-14 rounded-md border border-border bg-background px-2 py-1 text-center font-mono text-xs text-muted-foreground">{cellAddress}</span>
        <span className="text-xs text-muted-foreground">fx</span>
        <input value={selectedValue} onChange={(event) => setSelectedValue(event.target.value)} aria-label={t("formulaBar")} className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-1 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15" />
      </div>

      <div className="max-h-[min(64vh,640px)] min-h-[360px] overflow-auto">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20">
            <tr className="bg-muted/90 text-xs text-muted-foreground backdrop-blur">
              <th className="sticky left-0 z-30 w-12 border-b border-r border-border/80 px-3 py-2 text-right font-medium">#</th>
              {Array.from({ length: columnCount }, (_, columnIndex) => <th key={columnIndex} className="min-w-40 border-b border-r border-border/80 px-3 py-2 text-left font-medium last:border-r-0">{String.fromCharCode(65 + columnIndex)}</th>)}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, rowIndex) => <tr key={rowIndex} className="group hover:bg-primary/[0.035]">
              <td className="sticky left-0 z-10 w-12 border-b border-r border-border/80 bg-muted/65 px-3 py-2 text-right text-xs text-muted-foreground group-hover:bg-primary/[0.08]">{rowIndex + 1}</td>
              {Array.from({ length: columnCount }, (_, columnIndex) => {
                const active = selected.row === rowIndex && selected.column === columnIndex;
                return <td key={columnIndex} className={`min-w-40 border-b border-r border-border/80 p-0 last:border-r-0 ${active ? "relative z-10 ring-2 ring-inset ring-primary" : ""}`}>
                  <input value={row[columnIndex] ?? ""} onFocus={() => setSelected({ row: rowIndex, column: columnIndex })} onChange={(event) => setCell(rowIndex, columnIndex, event.target.value)} aria-label={`${sheet.name} ${rowIndex + 1}:${columnIndex + 1}`} className="w-full bg-transparent px-3 py-2.5 outline-none" />
                </td>;
              })}
            </tr>)}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-t border-border/80 bg-muted/25 px-3 pt-2">
        {file.sheets.map((item, index) => <button key={item.name} type="button" onClick={() => { setActiveSheet(index); setSelected({ row: 0, column: 0 }); }} className={`whitespace-nowrap rounded-t-lg border border-b-0 px-4 py-2 text-sm transition-colors ${index === activeSheet ? "border-border/80 bg-card font-medium text-primary" : "border-transparent text-muted-foreground hover:bg-muted"}`}>{item.name}</button>)}
        <button type="button" onClick={addSheet} className="ml-1 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-muted" aria-label={t("addSheet")}><Plus className="h-4 w-4" /></button>
      </div>
      <div className="flex items-center justify-between border-t border-border/80 px-4 py-2 text-xs text-muted-foreground"><span>{sheet.rows.length} {t("rows")} · {columnCount} {t("columns")}</span><span>{t("editableHint")}</span></div>
    </section>
  );
}

export function FileParser({ kind, title, description }: { kind: SupportedFileKind; title: string; description: string }) {
  const t = useTranslations("fileParser");
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(selected: File | undefined) {
    if (!selected) return;
    setBusy(true); setError(null);
    try { setFile(await parseFile(selected, { kind })); }
    catch (cause) { setFile(null); setError(cause instanceof Error ? cause.message : t("failed")); }
    finally { setBusy(false); }
  }

  return (
    <main className="mx-auto flex min-h-[calc(100vh-9rem)] w-full max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6">
      <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">Toolora workspace</p><h1 className="text-3xl font-semibold tracking-tight">{title}</h1><p className="mt-2 text-muted-foreground">{description}</p></div><p className="text-sm text-muted-foreground">{t("privacy")}</p></header>
      {!file && <section onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void onChange(event.dataTransfer.files[0]); }} className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-dashed border-primary/35 bg-primary/[0.035] p-8 text-center transition-colors hover:bg-primary/[0.06]"><div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary"><Upload className="h-7 w-7" /></div><h2 className="text-xl font-semibold">{busy ? t("parsing") : t("dropTitle")}</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">{t(`${kind}Hint`)} · {t("dropHint")}</p><input ref={inputRef} id={`${kind}-file`} type="file" accept={ACCEPT[kind]} className="sr-only" onChange={(event) => void onChange(event.target.files?.[0])} /><Button className="mt-6 rounded-xl px-5" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? t("parsing") : t("choose")}</Button></section>}
      {error && <p role="alert" className="rounded-xl border border-destructive/50 p-4 text-sm text-destructive">{error}</p>}
      {file && kind === "excel" && <ExcelGrid file={file} setFile={setFile} />}
      {file && kind !== "excel" && <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-xl shadow-slate-900/[0.06]"><div className="mb-3 flex items-center justify-between gap-4"><h2 className="text-lg font-medium">{file.name}</h2><Button variant="outline" onClick={() => void navigator.clipboard.writeText(file.text)}>{t("copy")}</Button></div><textarea readOnly value={file.text} aria-label={t("result")} className="min-h-[28rem] w-full rounded-xl border bg-muted/20 p-4 font-mono text-sm outline-none" /></section>}
    </main>
  );
}
