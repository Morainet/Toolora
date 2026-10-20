import type JSZip from "jszip";

export interface XmindTopic {
  id: string;
  title: string;
  note?: string;
  children: XmindTopic[];
}

export interface XmindSheet {
  id: string;
  title: string;
  root: XmindTopic;
  floating: XmindTopic[];
}

export interface XmindWorkbook {
  name: string;
  sheets: XmindSheet[];
  topicCount: number;
}

export class XmindFormatError extends Error {
  constructor(message = "Invalid or unsupported XMind file") {
    super(message);
    this.name = "XmindFormatError";
  }
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const MAX_CONTENT_SIZE = 10 * 1024 * 1024;
const MAX_TOPICS = 3000;
const MAX_DEPTH = 80;

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function string(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function jsonNote(value: unknown): string | undefined {
  const notes = record(value);
  const plain = record(notes.plain);
  const content = string(plain.content) || string(notes.content);
  return content || undefined;
}

/** Normalize current XMind content.json sheets into a small, renderer-neutral tree. */
export function parseXmindJson(value: unknown): XmindSheet[] {
  if (!Array.isArray(value) || value.length === 0) throw new XmindFormatError();
  let count = 0;
  const topic = (value: unknown, depth: number): XmindTopic => {
    if (depth > MAX_DEPTH || ++count > MAX_TOPICS) throw new XmindFormatError("XMind map is too large");
    const data = record(value);
    if (!Object.keys(data).length) throw new XmindFormatError();
    const children = record(data.children);
    const attached = Array.isArray(children.attached) ? children.attached : [];
    const detached = Array.isArray(children.detached) ? children.detached : [];
    return {
      id: string(data.id) || `topic-${count}`,
      title: string(data.title).trim() || "Untitled",
      note: jsonNote(data.notes),
      children: [...attached, ...detached].map((child) => topic(child, depth + 1)),
    };
  };
  return value.map((value, index) => {
    const sheet = record(value);
    if (!sheet.rootTopic) throw new XmindFormatError();
    const root = topic(sheet.rootTopic, 0);
    const floating = Array.isArray(sheet.floatingTopics) ? sheet.floatingTopics.map((item) => topic(item, 0)) : [];
    return { id: string(sheet.id) || `sheet-${index}`, title: string(sheet.title).trim() || `Sheet ${index + 1}`, root, floating };
  });
}

function childrenByName(element: Element, name: string): Element[] {
  return Array.from(element.children).filter((child) => child.localName === name);
}

function firstByName(element: Element, name: string): Element | undefined {
  return childrenByName(element, name)[0];
}

/** Parse XMind 8 and older content.xml without evaluating DTDs or external entities. */
export function parseXmindXml(xml: string): XmindSheet[] {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new XmindFormatError();
  if (typeof DOMParser === "undefined") throw new XmindFormatError("XML preview requires a browser");
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.getElementsByTagName("parsererror").length) throw new XmindFormatError();
  let count = 0;
  const topic = (element: Element, depth: number): XmindTopic => {
    if (depth > MAX_DEPTH || ++count > MAX_TOPICS) throw new XmindFormatError("XMind map is too large");
    const groups = firstByName(element, "children");
    const childTopics = groups ? childrenByName(groups, "topics").flatMap((group) => childrenByName(group, "topic")) : [];
    const notes = firstByName(element, "notes");
    const plain = notes && firstByName(notes, "plain");
    return {
      id: element.getAttribute("id") || `topic-${count}`,
      title: firstByName(element, "title")?.textContent?.trim() || "Untitled",
      note: plain?.textContent?.trim() || undefined,
      children: childTopics.map((child) => topic(child, depth + 1)),
    };
  };
  const sheets = Array.from(document.documentElement.children).filter((element) => element.localName === "sheet");
  if (!sheets.length) throw new XmindFormatError();
  return sheets.map((sheet, index) => {
    const root = firstByName(sheet, "topic");
    if (!root) throw new XmindFormatError();
    return {
      id: sheet.getAttribute("id") || `sheet-${index}`,
      title: firstByName(sheet, "title")?.textContent?.trim() || `Sheet ${index + 1}`,
      root: topic(root, 0),
      floating: [],
    };
  });
}

function countTopics(topic: XmindTopic): number {
  return 1 + topic.children.reduce((sum, child) => sum + countTopics(child), 0);
}

/** Read a .xmind ZIP entirely in memory; no bytes are sent to a server. */
export async function openXmind(file: File): Promise<XmindWorkbook> {
  if (!file.name.toLowerCase().endsWith(".xmind")) throw new XmindFormatError("Choose a .xmind file");
  if (file.size > MAX_FILE_SIZE) throw new XmindFormatError("XMind file exceeds 25 MB");
  const { default: JSZipRuntime } = await import("jszip");
  let zip: JSZip;
  try { zip = await JSZipRuntime.loadAsync(await file.arrayBuffer()); }
  catch { throw new XmindFormatError(); }
  if (Object.keys(zip.files).length > 1000) throw new XmindFormatError("XMind archive is too large");
  const entry = zip.file("content.json") ?? zip.file("content.xml");
  if (!entry) throw new XmindFormatError();
  // JSZip exposes the stored uncompressed size on its ZIP entry data.
  const size = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize;
  if (size !== undefined && size > MAX_CONTENT_SIZE) throw new XmindFormatError("XMind content is too large");
  const source = await entry.async("string");
  if (source.length > MAX_CONTENT_SIZE) throw new XmindFormatError("XMind content is too large");
  let sheets: XmindSheet[];
  try { sheets = entry.name.endsWith(".json") ? parseXmindJson(JSON.parse(source)) : parseXmindXml(source); }
  catch (error) { if (error instanceof XmindFormatError) throw error; throw new XmindFormatError(); }
  return { name: file.name, sheets, topicCount: sheets.reduce((sum, sheet) => sum + countTopics(sheet.root) + sheet.floating.reduce((subtotal, item) => subtotal + countTopics(item), 0), 0) };
}
