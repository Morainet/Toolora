import { createExcelBlob, downloadExcelBlob, FileTypeError, parseFile, type ParsedFile, type ParsedSheet } from "@parsy/file-parser";
import type { ExcelWorkerRequest, ExcelWorkerResponse } from "@/lib/excel-worker-protocol";

/** Keep large workbook decoding off the UI thread when Web Workers are available. */
export async function parseExcelInWorker(file: File): Promise<ParsedFile> {
  if (typeof Worker === "undefined") return parseFile(file, { kind: "excel" });

  let worker: Worker;
  try {
    worker = new Worker(new URL("../workers/excel.worker.ts", import.meta.url), { type: "module" });
  } catch {
    return parseFile(file, { kind: "excel" });
  }

  return new Promise((resolve, reject) => {
    let settled = false;
    const fallback = () => {
      if (settled) return;
      settled = true;
      worker.terminate();
      // CSP or browser worker failures should not make the Excel tool unusable.
      void parseFile(file, { kind: "excel" }).then(resolve, reject);
    };
    worker.onmessage = (event: MessageEvent<ExcelWorkerResponse>) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      if (event.data.ok && event.data.op === "parse") resolve(event.data.file);
      else if (!event.data.ok) reject(event.data.wrongType ? new FileTypeError() : new Error("Failed to parse Excel file."));
      else reject(new Error("Unexpected Excel worker response."));
    };
    worker.onerror = fallback;
    worker.onmessageerror = fallback;
    try {
      worker.postMessage({ op: "parse", file } satisfies ExcelWorkerRequest);
    } catch {
      fallback();
    }
  });
}

/** Build large exports off the UI thread; only the final download runs here. */
export async function exportExcelInWorker(sheets: ParsedSheet[]): Promise<void> {
  if (typeof Worker === "undefined") {
    downloadExcelBlob(await createExcelBlob(sheets));
    return;
  }
  let worker: Worker;
  try {
    worker = new Worker(new URL("../workers/excel.worker.ts", import.meta.url), { type: "module" });
  } catch {
    downloadExcelBlob(await createExcelBlob(sheets));
    return;
  }

  const blob = await new Promise<Blob>((resolve, reject) => {
    let settled = false;
    const fallback = () => {
      if (settled) return;
      settled = true;
      worker.terminate();
      void createExcelBlob(sheets).then(resolve, reject);
    };
    worker.onmessage = (event: MessageEvent<ExcelWorkerResponse>) => {
      if (settled) return;
      settled = true;
      worker.terminate();
      if (event.data.ok && event.data.op === "export") resolve(event.data.blob);
      else reject(new Error("Failed to export Excel file."));
    };
    worker.onerror = fallback;
    worker.onmessageerror = fallback;
    try {
      worker.postMessage({ op: "export", sheets } satisfies ExcelWorkerRequest);
    } catch {
      fallback();
    }
  });
  downloadExcelBlob(blob);
}
