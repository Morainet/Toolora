import type { ParsedFile, ParsedSheet } from "@parsy/file-parser";

export type ExcelWorkerRequest =
  | { op: "parse"; file: File }
  | { op: "export"; sheets: ParsedSheet[] };

export type ExcelWorkerResponse =
  | { op: "parse"; ok: true; file: ParsedFile }
  | { op: "export"; ok: true; blob: Blob }
  | { op: "parse" | "export"; ok: false; wrongType: boolean };
