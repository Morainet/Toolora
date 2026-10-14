/** Local, browser-only file extraction and PDF viewing. No Office app or server is required. */

import type { PDFDocumentProxy } from "pdfjs-dist";
export type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";

export type SupportedFileKind = "word" | "excel" | "pdf";

export interface ParsedFile {
  kind: SupportedFileKind;
  name: string;
  mimeType: string;
  size: number;
  /** Plain text suitable for copying, searching, or sending to another tool. */
  text: string;
  /** Workbook sheets when parsing Excel; empty for Word/PDF. */
  sheets: ParsedSheet[];
  pageCount?: number;
  /** One-based pages without extractable text (e.g. scans, drawings, or blank pages). */
  emptyTextPages?: number[];
}

export interface ParsedSheet {
  name: string;
  rows: string[][];
}

export function sheetsToText(sheets: ParsedSheet[]): string {
  return sheets
    .map((sheet) => `## ${sheet.name}\n${sheet.rows.map((row) => row.join("\t")).join("\n")}`)
    .join("\n\n");
}

export interface ParseFileOptions {
  kind?: SupportedFileKind;
  /** Locally hosted PDF.js assets, matching the installed pdfjs-dist version. */
  pdfAssetBaseUrl?: string;
}

export class FileTypeError extends Error {
  constructor() {
    super("Unsupported file type for this tool.");
    this.name = "FileTypeError";
  }
}

function detectKind(file: File): SupportedFileKind {
  const name = file.name.toLowerCase();
  // Prefer the extension: browser MIME types may be absent or inaccurate.
  if (name.endsWith(".docx")) return "word";
  if (name.endsWith(".xlsx") || name.endsWith(".xls")) return "excel";
  if (name.endsWith(".pdf")) return "pdf";
  if (file.type.includes("wordprocessingml")) return "word";
  if (file.type.includes("spreadsheet") || file.type === "application/vnd.ms-excel") return "excel";
  if (file.type === "application/pdf") return "pdf";
  throw new FileTypeError();
}

async function parseWord(file: File): Promise<Pick<ParsedFile, "text" | "sheets">> {
  // mammoth does not publish declarations for its browser subpath.
  // @ts-ignore -- the browser bundle is provided by the runtime dependency.
  const mammoth = await import("mammoth/mammoth.browser");
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return { text: result.value.trim(), sheets: [] };
}

async function parseExcel(file: File): Promise<Pick<ParsedFile, "text" | "sheets">> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheets = workbook.SheetNames.map((name) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
      header: 1,
      raw: false,
      defval: "",
    }).map((row) => row.map((cell) => String(cell ?? "")));
    return { name, rows };
  });
  return { text: sheetsToText(sheets), sheets };
}

/** Open a PDF for page rendering without extracting its text or uploading it. */
export async function openPdf(file: File, options: Pick<ParseFileOptions, "pdfAssetBaseUrl"> = {}): Promise<{ document: PDFDocumentProxy; destroy: () => Promise<void> }> {
  if (detectKind(file) !== "pdf") throw new FileTypeError();
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const assets = (options.pdfAssetBaseUrl ?? `/pdfjs/${pdfjs.version}/`).replace(/\/?$/, "/");
  pdfjs.GlobalWorkerOptions.workerSrc = `${assets}pdf.worker.min.mjs`;
  const task = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
    cMapUrl: `${assets}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assets}standard_fonts/`,
    wasmUrl: `${assets}wasm/`,
  });
  try {
    const document = await task.promise;
    return { document, destroy: () => task.destroy() };
  } catch (error) {
    await task.destroy();
    throw error;
  }
}

/** Export the edited sheet model without needing Excel installed. */
export async function createExcelBlob(sheets: ParsedSheet[]): Promise<Blob> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31) || "Sheet1");
  }
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  return new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export function downloadExcelBlob(blob: Blob, filename = "toolora-edited.xlsx"): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function exportExcel(sheets: ParsedSheet[], filename = "toolora-edited.xlsx"): Promise<void> {
  downloadExcelBlob(await createExcelBlob(sheets), filename);
}

async function parsePdf(file: File, options: ParseFileOptions): Promise<Pick<ParsedFile, "text" | "sheets" | "pageCount" | "emptyTextPages">> {
  const { document: pdf, destroy } = await openPdf(file, options);
  try {
    const pages: string[] = [];
    const emptyTextPages: number[] = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber);
      try {
        const content = await page.getTextContent();
        const text = content.items.map((item) => "str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : "").join("").replace(/[ \t]+\n/g, "\n").trim();
        pages.push(text);
        if (!text) emptyTextPages.push(pageNumber);
      } finally {
        page.cleanup();
      }
    }
    return {
      text: pages.some(Boolean) ? pages.map((page, index) => `## Page ${index + 1}\n${page}`).join("\n\n") : "",
      sheets: [],
      pageCount: pdf.numPages,
      emptyTextPages,
    };
  } finally {
    // Release the document and worker on success and on corrupt/encrypted files.
    await destroy();
  }
}

/** Extracts a local file in the browser. The file bytes never leave the page. */
export async function parseFile(file: File, options: ParseFileOptions = {}): Promise<ParsedFile> {
  const kind = detectKind(file);
  if (options.kind && options.kind !== kind) throw new FileTypeError();
  const parsed = kind === "word" ? await parseWord(file) : kind === "excel" ? await parseExcel(file) : await parsePdf(file, options);
  return { kind, name: file.name, mimeType: file.type, size: file.size, ...parsed };
}
