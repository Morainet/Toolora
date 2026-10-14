"use client";

import { useRef, useState } from "react";
import { Upload } from "lucide-react";
import { FileTypeError, parseFile, type ParsedFile, type SupportedFileKind } from "@parsy/file-parser";
import { Button } from "@/components/ui/button";
import { ExcelGrid } from "@/components/file-parser/excel-grid";
import { useToolFocus } from "@/components/layout/tool-focus-context";
import { parseExcelInWorker } from "@/lib/parse-excel-worker";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";

type EditableFileKind = Exclude<SupportedFileKind, "pdf">;

const ACCEPT: Record<EditableFileKind, string> = {
  word: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  excel: ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel",
};

export function FileParser({ kind, title, description }: { kind: EditableFileKind; title: string; description: string }) {
  const t = useTranslations("fileParser");
  const focused = useToolFocus();
  const inputRef = useRef<HTMLInputElement>(null);
  const parsingRef = useRef(false);
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [fileVersion, setFileVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(selected: File | undefined) {
    if (!selected || parsingRef.current) return;
    parsingRef.current = true;
    setBusy(true); setError(null);
    try { setFile(await (kind === "excel" ? parseExcelInWorker(selected) : parseFile(selected, { kind }))); setFileVersion(version => version + 1); }
    catch (cause) {
      if (cause instanceof FileTypeError) setError(t("wrongType", { format: t(`${kind}Hint`) }));
      else setError(t("failedHint"));
    }
    finally { parsingRef.current = false; setBusy(false); }
  }

  return (
    <main className={cn("flex min-h-[calc(100svh-7rem)] w-full min-w-0 flex-col gap-4 px-3 py-4 sm:px-4 lg:px-5", focused && "min-h-[calc(100svh-3rem)]")}>
      <header className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="text-sm text-muted-foreground">{description}</p></div><p className="shrink-0 text-xs text-muted-foreground">{t("privacy")}</p></header>
      <input ref={inputRef} id={`${kind}-file`} type="file" accept={ACCEPT[kind]} aria-label={t("choose")} className="sr-only" disabled={busy} onChange={(event) => {
        const selected = event.target.files?.[0];
        event.target.value = ""; // Allow retrying the same file after a failure.
        void onChange(selected);
      }} />
      {!file && <section aria-busy={busy} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void onChange(event.dataTransfer.files[0]); }} className={cn("flex min-h-[calc(100svh-14rem)] flex-col items-center justify-center rounded-2xl border border-dashed border-primary/35 bg-primary/[0.035] p-8 text-center transition-colors hover:bg-primary/[0.06]", focused && "min-h-[calc(100svh-10rem)]")}><div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary"><Upload className="h-7 w-7" /></div><h2 className="text-xl font-semibold">{busy ? t("parsing") : t(`${kind}DropTitle`)}</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">{t(`${kind}Hint`)} · {t("dropHint")}</p><Button className="mt-6 rounded-xl px-5" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? t("parsing") : t("choose")}</Button></section>}
      {error && <p role="alert" className="rounded-xl border border-destructive/50 p-4 text-sm text-destructive">{error}</p>}
      {file && <div className="flex items-center justify-between gap-3"><p className="hidden text-sm text-muted-foreground sm:block">{t(`${kind}Hint`)}</p><Button variant="outline" className="h-10 sm:h-9" disabled={busy} onClick={() => inputRef.current?.click()}>{busy ? t("parsing") : t("replaceFile")}</Button></div>}
      {file && kind === "excel" && <ExcelGrid key={fileVersion} file={file} setFile={setFile} />}
      {file && kind !== "excel" && <section className="flex min-w-0 flex-1 flex-col rounded-2xl border border-border/80 bg-card p-3 shadow-soft sm:p-4"><div className="mb-3 flex items-center justify-between gap-3"><h2 className="min-w-0 truncate text-sm font-medium sm:text-base">{file.name}</h2><Button variant="outline" className="h-10 sm:h-9" disabled={!file.text} onClick={() => void navigator.clipboard.writeText(file.text)}>{t("copy")}</Button></div><article tabIndex={0} aria-label={t("result")} className={cn("h-[calc(100svh-15rem)] min-h-[360px] w-full flex-1 overflow-auto whitespace-pre-wrap break-words rounded-xl border bg-background p-4 text-base leading-7 outline-none sm:min-h-[480px] sm:p-5 sm:text-sm sm:leading-6", focused && "h-[calc(100svh-11rem)]")}>{file.text}</article></section>}
    </main>
  );
}
