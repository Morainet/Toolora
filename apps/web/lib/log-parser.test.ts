import { describe, expect, it } from "vitest";
import { filterLogEntries, levelGroup, parseLog } from "./log-parser";

describe("parseLog", () => {
  it("recognizes timestamped levels, sources and stack traces", () => {
    const entries = parseLog("2026-10-12 10:20:30.123 ERROR [api] Request failed\n    at fetch (/app/api.ts:10)\nCaused by: timeout\n2026-10-12 10:20:31 INFO worker - recovered\n");
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ timestamp: "2026-10-12 10:20:30.123", level: "ERROR", source: "api", startLine: 1, endLine: 3 });
    expect(entries[0].message).toContain("Caused by: timeout");
    expect(entries[1]).toMatchObject({ level: "INFO", source: "worker", message: "recovered", startLine: 4 });
  });

  it("recognizes bracketed timestamps and level-first lines", () => {
    const entries = parseLog("[2026-10-12T10:20:30Z] [WARN] cache miss\nDEBUG 2026-10-12 10:20:31 retry\n");
    expect(entries.map((entry) => entry.level)).toEqual(["WARN", "DEBUG"]);
    expect(entries[0].timestamp).toBe("2026-10-12T10:20:30Z");
    expect(entries[1].timestamp).toBe("2026-10-12 10:20:31");
  });

  it("parses structured JSONL and retains searchable raw data", () => {
    const [entry] = parseLog('{"@timestamp":"2026-10-12T10:20:30Z","severity":"warning","service":"gateway","msg":"rate limited","requestId":"abc"}');
    expect(entry).toMatchObject({ level: "WARN", source: "gateway", message: "rate limited" });
    expect(filterLogEntries([entry], "WARN", "abc")).toHaveLength(1);
  });

  it("recognizes Android logcat entries and keeps unknown lines", () => {
    const entries = parseLog("10-12 10:20:30.123 1234 5678 E Network: failed\nplain text line");
    expect(entries[0]).toMatchObject({ level: "ERROR", source: "Network", message: "failed" });
    expect(entries[1]).toMatchObject({ level: "UNKNOWN", message: "plain text line" });
  });

  it("normalizes line endings and handles an empty input", () => {
    expect(parseLog("\n  ")).toEqual([]);
    expect(parseLog("INFO first\r\n  detail\r\nWARN second\r\n")).toMatchObject([
      { startLine: 1, endLine: 2 },
      { startLine: 3, endLine: 3 },
    ]);
  });
});

describe("log filtering", () => {
  it("groups related levels and filters case-insensitively", () => {
    expect(levelGroup("FATAL")).toBe("ERROR");
    expect(levelGroup("TRACE")).toBe("DEBUG");
    const entries = parseLog("FATAL database DOWN\nINFO database up\nTRACE retry");
    expect(filterLogEntries(entries, "ERROR", "down")).toHaveLength(1);
    expect(filterLogEntries(entries, "INFO", "down")).toHaveLength(0);
    expect(filterLogEntries(entries, "ALL", "database")).toHaveLength(2);
  });
});
