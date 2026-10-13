import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import { exportExcel, parseFile, type ParsedSheet } from "./index";

// Use Mammoth's own ZIP dependency to build a small real DOCX fixture.
const require = createRequire(import.meta.url);
const mammothRequire = createRequire(require.resolve("mammoth"));
const JSZip = mammothRequire("jszip");

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("Office parser security-upgrade regression", () => {
  it.each(["xlsx", "xls"] as const)("reads Chinese text, multiple sheets and empty cells from %s", async extension => {
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["姓名", "数量", "备注"], ["测试", 42, ""]]), "数据");
    XLSX.utils.book_append_sheet(book, XLSX.utils.aoa_to_sheet([["第二页"]]), "汇总");
    const bytes = XLSX.write(book, { type: "array", bookType: extension === "xls" ? "biff8" : "xlsx" });
    const parsed = await parseFile(new File([bytes], `sample.${extension}`), { kind: "excel" });
    expect(parsed.sheets).toEqual([
      { name: "数据", rows: [["姓名", "数量", "备注"], ["测试", "42", ""]] },
      { name: "汇总", rows: [["第二页"]] },
    ]);
  });

  it("exports edited cells into a workbook that can be opened again", async () => {
    const sheets: ParsedSheet[] = [{ name: "编辑后", rows: [["名称", "值"], ["修改成功", "123"]] }];
    let output: Blob | undefined;
    vi.spyOn(URL, "createObjectURL").mockImplementation(blob => { output = blob as Blob; return "blob:test"; });
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const anchor = { href: "", download: "", click: vi.fn() };
    vi.stubGlobal("document", { createElement: () => anchor });
    await exportExcel(sheets, "edited.xlsx");
    expect(anchor.download).toBe("edited.xlsx");
    expect(anchor.click).toHaveBeenCalledOnce();
    expect(revoke).toHaveBeenCalledWith("blob:test");
    const parsed = await parseFile(new File([await output!.arrayBuffer()], "edited.xlsx"));
    expect(parsed.sheets).toEqual(sheets);
  });

  it("extracts DOCX text using the real browser bundle", async () => {
    const zip = new JSZip();
    zip.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
    zip.file("_rels/.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
    zip.file("word/document.xml", '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Word 中文测试</w:t></w:r></w:p><w:p><w:r><w:t>Second paragraph</w:t></w:r></w:p></w:body></w:document>');
    const bytes = await zip.generateAsync({ type: "arraybuffer" });
    const parsed = await parseFile(new File([bytes], "sample.docx"), { kind: "word" });
    expect(parsed.text).toBe("Word 中文测试\n\nSecond paragraph");
  });
});
