/** Local, browser-only file extraction. No Office, PDF reader, or server is required. */

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
}

function detectKind(file: File): SupportedFileKind {
  const name = file.name.toLowerCase();
  if (name.endsWith(".docx") || file.type.includes("wordprocessingml")) return "word";
  if (name.endsWith(".xlsx") || name.endsWith(".xls") || file.type.includes("spreadsheet")) return "excel";
  if (name.endsWith(".pdf") || file.type === "application/pdf") return "pdf";
  throw new Error("Unsupported file type. Use DOCX, XLSX/XLS, or PDF.");
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

/** Export the edited sheet model without needing Excel installed. */
export async function exportExcel(sheets: ParsedSheet[], filename = "toolora-edited.xlsx"): Promise<void> {
  const XLSX = await import("xlsx");
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const worksheet = XLSX.utils.aoa_to_sheet(sheet.rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet.name.slice(0, 31) || "Sheet1");
  }
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function parsePdf(file: File): Promise<Pick<ParsedFile, "text" | "sheets" | "pageCount">> {
  // disableWorker keeps this usable in Next.js and in a plain browser without
  // a separately hosted worker file or a desktop PDF application.
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const source = { data: new Uint8Array(await file.arrayBuffer()), disableWorker: true } as never;
  const pdf = await pdfjs.getDocument(source).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => ("str" in item ? item.str : "")).join(" ").trim());
  }
  return { text: pages.map((page, index) => `## Page ${index + 1}\n${page}`).join("\n\n"), sheets: [], pageCount: pdf.numPages };
}

/** Extracts a local file in the browser. The file bytes never leave the page. */
export async function parseFile(file: File, options: ParseFileOptions = {}): Promise<ParsedFile> {
  const kind = options.kind ?? detectKind(file);
  const parsed = kind === "word" ? await parseWord(file) : kind === "excel" ? await parseExcel(file) : await parsePdf(file);
  return { kind, name: file.name, mimeType: file.type, size: file.size, ...parsed };
}
