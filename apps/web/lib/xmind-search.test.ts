import { describe, expect, it } from "vitest";
import type { XmindWorkbook } from "@parsy/file-parser";
import { searchXmindTopics } from "./xmind-search";

const workbook: XmindWorkbook = {
  name: "test.xmind",
  topicCount: 5,
  sheets: [
    { id: "one", title: "规划", root: { id: "root", title: "产品", children: [{ id: "branch", title: "文档", children: [{ id: "leaf", title: "PDF 阅读", note: "本地预览", children: [] }] }] }, floating: [] },
    { id: "two", title: "待办", root: { id: "other", title: "任务", children: [] }, floating: [{ id: "float", title: "PDF 转换", children: [] }] },
  ],
};

describe("XMind topic search", () => {
  it("finds matches across sheets and floating trees", () => {
    const matches = searchXmindTopics(workbook, "pdf");
    expect(matches.map((item) => [item.sheetIndex, item.topic.id])).toEqual([[0, "leaf"], [1, "float"]]);
    expect(matches[0].ancestorIds).toEqual(["root", "branch"]);
    expect(matches[0].path).toEqual(["产品", "文档"]);
  });

  it("searches notes and respects an empty query and result limit", () => {
    expect(searchXmindTopics(workbook, "本地")[0].topic.id).toBe("leaf");
    expect(searchXmindTopics(workbook, "  ")).toEqual([]);
    expect(searchXmindTopics(workbook, "pdf", 1)).toHaveLength(1);
  });
});
