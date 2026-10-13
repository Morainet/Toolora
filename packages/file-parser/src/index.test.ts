import { beforeEach, describe, expect, it, vi } from "vitest";
import { FileTypeError, openPdf, parseFile } from "./index";

const pdfjs = vi.hoisted(() => ({
  version: "6.4.299",
  GlobalWorkerOptions: { workerSrc: "" },
  getDocument: vi.fn(),
}));
vi.mock("pdfjs-dist/legacy/build/pdf.mjs", () => pdfjs);

function pdfFile() {
  return new File(["%PDF-1.4"], "sample.pdf", { type: "application/pdf" });
}

function mockDocument(pages: Array<Array<{ str: string; hasEOL: boolean } | { type: string }>>) {
  const pageObjects = pages.map(items => ({ getTextContent: vi.fn().mockResolvedValue({ items }), cleanup: vi.fn() }));
  const document = { numPages: pages.length, getPage: vi.fn(async (number: number) => pageObjects[number - 1]) };
  const task = { promise: Promise.resolve(document), destroy: vi.fn().mockResolvedValue(undefined) };
  pdfjs.getDocument.mockReturnValue(task);
  return { task, document, pageObjects };
}

beforeEach(() => { vi.clearAllMocks(); pdfjs.GlobalWorkerOptions.workerSrc = ""; });

describe("PDF parsing", () => {
  it("opens a PDF for rendering without asking for any text", async () => {
    const { task, document, pageObjects } = mockDocument([[]]);
    const opened = await openPdf(pdfFile());
    expect(opened.document).toBe(document);
    expect(pageObjects[0].getTextContent).not.toHaveBeenCalled();
    expect(task.destroy).not.toHaveBeenCalled();
    await opened.destroy();
    expect(task.destroy).toHaveBeenCalledOnce();
  });

  it("rejects non-PDF files before opening the renderer", async () => {
    await expect(openPdf(new File(["x"], "wrong.xlsx"))).rejects.toBeInstanceOf(FileTypeError);
    expect(pdfjs.getDocument).not.toHaveBeenCalled();
  });

  it("releases a failed PDF open", async () => {
    const failure = new Error("corrupt");
    const task = { promise: Promise.reject(failure), destroy: vi.fn().mockResolvedValue(undefined) };
    pdfjs.getDocument.mockReturnValue(task);
    await expect(openPdf(pdfFile())).rejects.toBe(failure);
    expect(task.destroy).toHaveBeenCalledOnce();
  });

  it("configures a matching local worker and supporting assets", async () => {
    const { task } = mockDocument([[{ str: "Hello", hasEOL: false }]]);
    await parseFile(pdfFile());
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toBe(`/pdfjs/${pdfjs.version}/pdf.worker.min.mjs`);
    expect(pdfjs.getDocument).toHaveBeenCalledWith({
      data: expect.any(Uint8Array), cMapUrl: `/pdfjs/${pdfjs.version}/cmaps/`, cMapPacked: true,
      standardFontDataUrl: `/pdfjs/${pdfjs.version}/standard_fonts/`, wasmUrl: `/pdfjs/${pdfjs.version}/wasm/`,
    });
    expect(task.destroy).toHaveBeenCalledOnce();
  });

  it("lets other hosts provide their own assets directory", async () => {
    mockDocument([]);
    await parseFile(pdfFile(), { pdfAssetBaseUrl: "/custom/pdf" });
    expect(pdfjs.GlobalWorkerOptions.workerSrc).toBe("/custom/pdf/pdf.worker.min.mjs");
  });

  it("preserves page order, line breaks and Chinese text", async () => {
    const { pageObjects } = mockDocument([
      [{ str: "中文测试", hasEOL: false }, { str: "", hasEOL: true }, { str: "Second line", hasEOL: false }],
      [{ type: "beginMarkedContent" }, { str: "Page two", hasEOL: false }],
    ]);
    const file = await parseFile(pdfFile(), { kind: "pdf" });
    expect(file.text).toBe("## Page 1\n中文测试\nSecond line\n\n## Page 2\nPage two");
    expect(file.pageCount).toBe(2);
    expect(file.emptyTextPages).toEqual([]);
    for (const page of pageObjects) expect(page.cleanup).toHaveBeenCalledOnce();
  });

  it("does not mistake page headings for extracted text in image-only PDFs", async () => {
    mockDocument([[], [{ str: " ", hasEOL: true }]]);
    const file = await parseFile(pdfFile());
    expect(file.text).toBe("");
    expect(file.emptyTextPages).toEqual([1, 2]);
  });

  it("reports missing text pages without discarding other pages", async () => {
    mockDocument([[], [{ str: "Readable", hasEOL: false }]]);
    const file = await parseFile(pdfFile());
    expect(file.emptyTextPages).toEqual([1]);
    expect(file.text).toContain("## Page 2\nReadable");
  });

  it.each(["PasswordException", "InvalidPDFException"])("releases the worker after %s", async name => {
    const failure = Object.assign(new Error("Cannot open"), { name });
    const task = { promise: Promise.reject(failure), destroy: vi.fn().mockResolvedValue(undefined) };
    pdfjs.getDocument.mockReturnValue(task);
    await expect(parseFile(pdfFile())).rejects.toBe(failure);
    expect(task.destroy).toHaveBeenCalledOnce();
  });

  it("releases page and worker if text extraction fails", async () => {
    const { task, pageObjects } = mockDocument([[]]);
    pageObjects[0].getTextContent.mockRejectedValue(new Error("Bad content"));
    await expect(parseFile(pdfFile())).rejects.toThrow("Bad content");
    expect(pageObjects[0].cleanup).toHaveBeenCalledOnce();
    expect(task.destroy).toHaveBeenCalledOnce();
  });
});

describe("file type validation", () => {
  it.each(["wrong.xlsx", "wrong.docx", "wrong.txt"])("rejects %s in the PDF tool before reading it", async name => {
    await expect(parseFile(new File(["test"], name), { kind: "pdf" })).rejects.toBeInstanceOf(FileTypeError);
    expect(pdfjs.getDocument).not.toHaveBeenCalled();
  });
  it("uses the extension when the MIME type is incorrect", async () => {
    mockDocument([]);
    await expect(parseFile(new File(["test"], "SAMPLE.PDF", { type: "application/vnd.ms-excel" }), { kind: "pdf" })).resolves.toMatchObject({ kind: "pdf" });
  });
});
