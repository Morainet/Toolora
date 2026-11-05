import type { XmindTopic, XmindWorkbook } from "@parsy/file-parser";

export interface XmindSearchResult {
  sheetIndex: number;
  sheetTitle: string;
  topic: XmindTopic;
  ancestorIds: string[];
  path: string[];
}

/** Search all sheets, including floating trees, while retaining the path needed to reveal a match. */
export function searchXmindTopics(workbook: XmindWorkbook, query: string, limit = 40): XmindSearchResult[] {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle || limit <= 0) return [];
  const results: XmindSearchResult[] = [];

  for (const [sheetIndex, sheet] of workbook.sheets.entries()) {
    const stack = [sheet.root, ...sheet.floating].reverse().map((topic) => ({ topic, ancestors: [] as XmindTopic[] }));
    while (stack.length > 0 && results.length < limit) {
      const item = stack.pop()!;
      const { topic, ancestors } = item;
      if (`${topic.title}\n${topic.note ?? ""}`.toLocaleLowerCase().includes(needle)) {
        results.push({
          sheetIndex,
          sheetTitle: sheet.title,
          topic,
          ancestorIds: ancestors.map((ancestor) => ancestor.id),
          path: ancestors.map((ancestor) => ancestor.title),
        });
      }
      for (let index = topic.children.length - 1; index >= 0; index--) {
        stack.push({ topic: topic.children[index], ancestors: [...ancestors, topic] });
      }
    }
    if (results.length >= limit) break;
  }

  return results;
}
