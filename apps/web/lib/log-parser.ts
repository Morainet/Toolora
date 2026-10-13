export type LogLevel = "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR" | "FATAL" | "UNKNOWN";
export type LogFilterLevel = "ALL" | "ERROR" | "WARN" | "INFO" | "DEBUG" | "OTHER";

export interface LogEntry {
  id: number;
  startLine: number;
  endLine: number;
  timestamp: string | null;
  level: LogLevel;
  source: string | null;
  message: string;
  raw: string;
}

const LEVEL = /^(TRACE|DEBUG|INFO|WARN(?:ING)?|ERROR|ERR|FATAL|CRITICAL)(?=\s|\]|:|-|$)/i;
const TIMESTAMP = /^(\d{4}[-/]\d{2}[-/]\d{2}[ T]\d{2}:\d{2}:\d{2}(?:[.,]\d+)?(?:Z|[+-]\d{2}:?\d{2})?|\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)/;
const LOGCAT = /^(\d{2}-\d{2} \d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+\d+\s+\d+\s+([VDIWEF])\s+([^:]+):\s*(.*)$/;
const STACK_LINE = /^(?:\s+|at\s+|Caused by:|Suppressed:|Traceback \(most recent call last\):|File "|\.\.\. \d+ more)/;

function normalizeLevel(value: unknown): LogLevel {
  if (typeof value !== "string") return "UNKNOWN";
  switch (value.trim().toUpperCase()) {
    case "TRACE": case "VERBOSE": case "V": return "TRACE";
    case "DEBUG": case "D": return "DEBUG";
    case "INFO": case "INFORMATION": case "I": return "INFO";
    case "WARN": case "WARNING": case "W": return "WARN";
    case "ERROR": case "ERR": case "E": return "ERROR";
    case "FATAL": case "CRITICAL": case "F": return "FATAL";
    default: return "UNKNOWN";
  }
}

function field(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) if (record[key] !== undefined && record[key] !== null) return record[key];
  return undefined;
}

function parseJsonLine(line: string): Pick<LogEntry, "timestamp" | "level" | "source" | "message"> | null {
  if (!line.trimStart().startsWith("{")) return null;
  try {
    const record: unknown = JSON.parse(line);
    if (!record || typeof record !== "object" || Array.isArray(record)) return null;
    const data = record as Record<string, unknown>;
    const time = field(data, ["timestamp", "time", "@timestamp", "datetime", "ts"]);
    const severity = field(data, ["level", "severity", "logLevel", "lvl"]);
    const content = field(data, ["message", "msg", "event", "error"]);
    if (time === undefined && severity === undefined && content === undefined) return null;
    const origin = field(data, ["logger", "source", "service", "component", "name"]);
    return {
      timestamp: time === undefined ? null : String(time),
      level: normalizeLevel(severity),
      source: typeof origin === "string" ? origin : null,
      message: typeof content === "string" ? content : content === undefined ? line : JSON.stringify(content),
    };
  } catch {
    return null;
  }
}

function parseLevel(value: string): { level: LogLevel; rest: string } | null {
  const trimmed = value.trimStart();
  const bracketed = trimmed.startsWith("[");
  const match = LEVEL.exec(bracketed ? trimmed.slice(1) : trimmed);
  if (!match) return null;
  let rest = trimmed.slice(match[0].length + (bracketed ? 1 : 0));
  if (bracketed && rest.startsWith("]")) rest = rest.slice(1);
  return { level: normalizeLevel(match[1]), rest: rest.replace(/^\s*[:\-]?\s*/, "") };
}

function parsePlainLine(line: string): Pick<LogEntry, "timestamp" | "level" | "source" | "message"> {
  const logcat = LOGCAT.exec(line);
  if (logcat) return { timestamp: logcat[1], level: normalizeLevel(logcat[2]), source: logcat[3].trim(), message: logcat[4] };

  let rest = line.trim();
  let timestamp: string | null = null;
  if (rest.startsWith("[")) {
    const match = TIMESTAMP.exec(rest.slice(1));
    if (match && rest[match[0].length + 1] === "]") {
      timestamp = match[0];
      rest = rest.slice(match[0].length + 2).trimStart();
    }
  }
  if (!timestamp) {
    const match = TIMESTAMP.exec(rest);
    if (match) {
      timestamp = match[0];
      rest = rest.slice(match[0].length).trimStart();
    }
  }

  let level = "UNKNOWN" as LogLevel;
  const parsedLevel = parseLevel(rest);
  if (parsedLevel) {
    level = parsedLevel.level;
    rest = parsedLevel.rest;
    // Some emitters put the level before the timestamp.
    if (!timestamp) {
      const match = TIMESTAMP.exec(rest);
      if (match) { timestamp = match[0]; rest = rest.slice(match[0].length).trimStart(); }
    }
  }

  let source: string | null = null;
  const bracketSource = /^\[([^\]]+)\]\s*/.exec(rest);
  const namedSource = /^([\w.$/:-]{2,80})\s+-\s+/.exec(rest);
  if (bracketSource) { source = bracketSource[1]; rest = rest.slice(bracketSource[0].length); }
  else if (namedSource) { source = namedSource[1]; rest = rest.slice(namedSource[0].length); }
  return { timestamp, level, source, message: rest || line.trim() };
}

function looksLikeEntryStart(line: string): boolean {
  const trimmed = line.trimStart();
  return trimmed.startsWith("{") || TIMESTAMP.test(trimmed) ||
    (trimmed.startsWith("[") && (TIMESTAMP.test(trimmed.slice(1)) || parseLevel(trimmed) !== null)) ||
    parseLevel(trimmed) !== null;
}

/** Keep the original line range when a .json file contains an array of log records. */
function parseJsonArray(text: string): LogEntry[] | null {
  if (!text.trimStart().startsWith("[")) return null;
  try {
    const value: unknown = JSON.parse(text);
    if (!Array.isArray(value) || !value.every((item) => item && typeof item === "object" && !Array.isArray(item))) return null;
  } catch {
    return null;
  }

  const entries: LogEntry[] = [];
  let depth = 0;
  let line = 1;
  let start = -1;
  let startLine = 1;
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (quoted) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === "{" || char === "[") {
      if (char === "{" && depth === 1) { start = index; startLine = line; }
      depth++;
    } else if (char === "}" || char === "]") {
      depth--;
      if (char === "}" && depth === 1 && start !== -1) {
        const raw = text.slice(start, index + 1);
        const parsed = parseJsonLine(raw) ?? parsePlainLine(raw);
        entries.push({ id: entries.length, startLine, endLine: line, raw, ...parsed });
        start = -1;
      }
    }
    if (char === "\n") line++;
  }
  return entries;
}

/** Parse common plain-text and JSONL logs while keeping stack traces attached. */
export function parseLog(text: string): LogEntry[] {
  if (!text.trim()) return [];
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const jsonArray = parseJsonArray(normalized);
  if (jsonArray) return jsonArray;
  const jsonObject = parseJsonLine(normalized);
  if (jsonObject) return [{ id: 0, startLine: 1, endLine: normalized.trimEnd().split("\n").length, raw: normalized.trimEnd(), ...jsonObject }];
  const lines = normalized.split("\n");
  if (lines.at(-1) === "") lines.pop();
  const entries: LogEntry[] = [];

  for (const [index, line] of lines.entries()) {
    const previous = entries.at(-1);
    if (previous && !looksLikeEntryStart(line) && (line === "" || STACK_LINE.test(line))) {
      previous.raw += `\n${line}`;
      previous.message += `\n${line}`;
      previous.endLine = index + 1;
      continue;
    }
    const parsed = parseJsonLine(line) ?? parsePlainLine(line);
    entries.push({ id: entries.length, startLine: index + 1, endLine: index + 1, raw: line, ...parsed });
  }
  return entries;
}

export function levelGroup(level: LogLevel): Exclude<LogFilterLevel, "ALL"> {
  if (level === "FATAL" || level === "ERROR") return "ERROR";
  if (level === "WARN") return "WARN";
  if (level === "INFO") return "INFO";
  if (level === "TRACE" || level === "DEBUG") return "DEBUG";
  return "OTHER";
}

export function filterLogEntries(entries: readonly LogEntry[], level: LogFilterLevel, query: string, source?: string): LogEntry[] {
  const needle = query.trim().toLocaleLowerCase();
  return entries.filter((entry) =>
    (level === "ALL" || levelGroup(entry.level) === level) &&
    (!source || entry.source === source) &&
    (!needle || entry.raw.toLocaleLowerCase().includes(needle)),
  );
}
