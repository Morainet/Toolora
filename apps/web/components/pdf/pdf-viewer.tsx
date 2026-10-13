"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BookOpen, ChevronLeft, ChevronRight, Download, FileUp, Maximize2, RotateCw, Upload, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { FileTypeError, openPdf, type PDFDocumentProxy, type RenderTask } from "@parsy/file-parser";
import { Button } from "@/components/ui/button";

type OpenedPdf = Awaited<ReturnType<typeof openPdf>>;

function PdfPage({ document, pageNumber, width, zoom, rotation, onError, onScale }: {
  document: PDFDocumentProxy;
  pageNumber: number;
  width: number;
  zoom: number | null;
  rotation: number;
  onError: () => void;
  onScale: (scale: number) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let task: RenderTask | undefined;
    let cleanupPage: (() => void) | undefined;
    setRendering(true);

    async function draw() {
      const page = await document.getPage(pageNumber);
      cleanupPage = () => { page.cleanup(); };
      if (cancelled) { cleanupPage(); return; }
      const natural = page.getViewport({ scale: 1, rotation });
      const scale = zoom ?? Math.max(0.25, Math.min(2, (width - 48) / natural.width));
      onScale(scale);
      const viewport = page.getViewport({ scale, rotation });
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      task = page.render({ canvas, viewport, transform: [ratio, 0, 0, ratio, 0, 0] });
      await task.promise;
      if (!cancelled) setRendering(false);
    }

    void draw().catch((error: unknown) => {
      if (!cancelled && !(error instanceof Error && error.name === "RenderingCancelledException")) onError();
    });
    return () => {
      cancelled = true;
      task?.cancel();
      if (task) void task.promise.catch(() => undefined).finally(() => cleanupPage?.());
      else cleanupPage?.();
    };
  }, [document, pageNumber, width, zoom, rotation, onError, onScale]);

  return <div className="relative inline-block min-h-32 bg-white shadow-xl shadow-slate-900/20">
    {rendering && <span className="absolute inset-0 grid place-items-center text-sm text-slate-500">…</span>}
    <canvas ref={canvasRef} className="block max-w-none" aria-label={`PDF page ${pageNumber}`} />
  </div>;
}

export function PdfViewer({ title, description }: { title: string; description: string }) {
  const t = useTranslations("pdfViewer");
  const inputRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef(0);
  const currentScaleRef = useRef(1);
  const [file, setFile] = useState<File | null>(null);
  const [opened, setOpened] = useState<OpenedPdf | null>(null);
  const [page, setPage] = useState(1);
  const [pageInput, setPageInput] = useState("1");
  const [zoom, setZoom] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [width, setWidth] = useState(900);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const renderError = t("renderFailed");
  const showRenderError = useCallback(() => setError(renderError), [renderError]);
  const rememberScale = useCallback((scale: number) => { currentScaleRef.current = scale; }, []);

  useEffect(() => () => { requestRef.current++; }, []);
  useEffect(() => () => { if (opened) void opened.destroy(); }, [opened]);
  useEffect(() => {
    const reader = readerRef.current;
    if (!reader) return;
    const observer = new ResizeObserver(() => setWidth(reader.clientWidth));
    observer.observe(reader);
    setWidth(reader.clientWidth);
    return () => observer.disconnect();
  }, [opened]);

  function goToPage(value: number) {
    if (!opened) return;
    const next = Math.max(1, Math.min(opened.document.numPages, value));
    setPage(next);
    setPageInput(String(next));
    if (readerRef.current) readerRef.current.scrollTop = 0;
  }

  async function selectFile(selected?: File) {
    if (!selected) return;
    const request = ++requestRef.current;
    setBusy(true);
    setError(null);
    setOpened(null);
    setFile(null);
    try {
      const result = await openPdf(selected);
      if (request !== requestRef.current) { await result.destroy(); return; }
      setFile(selected);
      setOpened(result);
      setPage(1);
      setPageInput("1");
      setZoom(null);
      setRotation(0);
    } catch (cause) {
      if (request !== requestRef.current) return;
      if (cause instanceof FileTypeError) setError(t("wrongType"));
      else if (cause instanceof Error && cause.name === "PasswordException") setError(t("password"));
      else setError(t("openFailed"));
    } finally {
      if (request === requestRef.current) setBusy(false);
    }
  }

  function download() {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <main className="flex min-h-[calc(100svh-7rem)] min-w-0 flex-col gap-4 px-3 py-4 sm:px-4 lg:px-5">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-semibold tracking-tight">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
      <p className="text-xs text-muted-foreground">{t("privacy")}</p>
    </header>
    <input ref={inputRef} type="file" accept=".pdf,application/pdf" aria-label={t("choose")} className="sr-only" onChange={(event) => {
      const selected = event.target.files?.[0];
      event.target.value = "";
      void selectFile(selected);
    }} />
    {error && <p role="alert" className="rounded-xl border border-destructive/50 p-4 text-sm text-destructive">{error}</p>}
    {!opened ? <section aria-busy={busy} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); void selectFile(event.dataTransfer.files[0]); }} className="flex min-h-[calc(100svh-15rem)] flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/70 p-8 text-center">
      <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary"><BookOpen className="h-7 w-7" /></div>
      <h2 className="text-xl font-semibold">{busy ? t("opening") : t("dropTitle")}</h2>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{t("dropHint")}</p>
      <Button className="mt-6" onClick={() => inputRef.current?.click()} disabled={busy}><Upload />{t("choose")}</Button>
    </section> : <section className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg shadow-slate-900/[0.05]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-3 py-3 sm:px-4">
        <div className="min-w-0"><h2 className="max-w-[26rem] truncate text-sm font-semibold" title={file?.name}>{file?.name}</h2><p className="text-xs text-muted-foreground">{t("pageCount", { count: opened.document.numPages })}</p></div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button variant="ghost" size="icon" aria-label={t("previous")} disabled={page <= 1} onClick={() => goToPage(page - 1)}><ChevronLeft /></Button>
          <form className="flex items-center gap-1 text-sm text-muted-foreground" onSubmit={(event) => { event.preventDefault(); goToPage(Number(pageInput) || page); }}>
            <input aria-label={t("pageNumber")} inputMode="numeric" value={pageInput} onChange={(event) => setPageInput(event.target.value)} onBlur={() => goToPage(Number(pageInput) || page)} className="h-8 w-12 rounded-md border border-input bg-background text-center text-foreground outline-none focus:ring-2 focus:ring-ring" />
            <span>/ {opened.document.numPages}</span>
          </form>
          <Button variant="ghost" size="icon" aria-label={t("next")} disabled={page >= opened.document.numPages} onClick={() => goToPage(page + 1)}><ChevronRight /></Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button variant="ghost" size="icon" aria-label={t("zoomOut")} onClick={() => setZoom(Math.max(0.5, currentScaleRef.current - 0.25))}><ZoomOut /></Button>
          <Button variant={zoom === null ? "secondary" : "ghost"} size="sm" onClick={() => setZoom(null)}><Maximize2 />{zoom === null ? t("fitWidth") : `${Math.round(zoom * 100)}%`}</Button>
          <Button variant="ghost" size="icon" aria-label={t("zoomIn")} onClick={() => setZoom(Math.min(3, currentScaleRef.current + 0.25))}><ZoomIn /></Button>
          <Button variant="ghost" size="icon" aria-label={t("rotate")} onClick={() => setRotation((current) => (current + 90) % 360)}><RotateCw /></Button>
          <span className="mx-1 h-5 w-px bg-border" />
          <Button variant="ghost" size="icon" aria-label={t("download")} onClick={download}><Download /></Button>
          <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()}><FileUp />{t("replace")}</Button>
        </div>
      </div>
      <div ref={readerRef} tabIndex={0} aria-label={t("reader")} onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "ArrowRight" || event.key === "PageDown") { event.preventDefault(); goToPage(page + 1); }
        if (event.key === "ArrowLeft" || event.key === "PageUp") { event.preventDefault(); goToPage(page - 1); }
      }} className="flex h-[calc(100svh-14rem)] min-h-[480px] min-w-0 items-start justify-center overflow-auto bg-slate-200/70 p-6 outline-none dark:bg-slate-950/70">
        <PdfPage key={`${page}-${rotation}-${zoom ?? "fit"}`} document={opened.document} pageNumber={page} width={width} zoom={zoom} rotation={rotation} onError={showRenderError} onScale={rememberScale} />
      </div>
    </section>}
  </main>;
}
