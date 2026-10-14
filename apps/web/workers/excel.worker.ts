/// <reference lib="webworker" />

import { createExcelBlob, FileTypeError, parseFile } from "@parsy/file-parser";
import type { ExcelWorkerRequest, ExcelWorkerResponse } from "@/lib/excel-worker-protocol";

self.onmessage = async (event: MessageEvent<ExcelWorkerRequest>) => {
  const request = event.data;
  let response: ExcelWorkerResponse;
  try {
    response = request.op === "parse"
      ? { op: "parse", ok: true, file: await parseFile(request.file, { kind: "excel" }) }
      : { op: "export", ok: true, blob: await createExcelBlob(request.sheets) };
  } catch (error) {
    response = { op: request.op, ok: false, wrongType: error instanceof FileTypeError };
  }
  (self as DedicatedWorkerGlobalScope).postMessage(response);
};
