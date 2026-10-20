import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { openXmind, parseXmindJson, XmindFormatError } from "./xmind";

describe("XMind preview parser", () => {
  it("reads real ZIP workbooks with sheets, branches, floating topics and notes", async () => {
    const zip = new JSZip();
    zip.file("content.json", JSON.stringify([
      { id: "sheet-a", title: "计划", rootTopic: { id: "root", title: "项目", children: { attached: [{ id: "task", title: "任务", notes: { plain: { content: "完成测试" } }, children: { attached: [{ id: "step", title: "步骤" }] } }] } }, floatingTopics: [{ id: "floating", title: "想法" }] },
      { id: "sheet-b", title: "总结", rootTopic: { id: "other", title: "完成" } },
    ]));
    const data = await zip.generateAsync({ type: "arraybuffer" });
    const result = await openXmind(new File([data], "计划.xmind"));
    expect(result.topicCount).toBe(5);
    expect(result.sheets.map((sheet) => sheet.title)).toEqual(["计划", "总结"]);
    expect(result.sheets[0].root.children[0]).toMatchObject({ title: "任务", note: "完成测试", children: [{ title: "步骤" }] });
    expect(result.sheets[0].floating[0].title).toBe("想法");
  });

  it("rejects invalid files and missing content", async () => {
    await expect(openXmind(new File(["invalid"], "wrong.pdf"))).rejects.toBeInstanceOf(XmindFormatError);
    await expect(openXmind(new File(["invalid"], "broken.xmind"))).rejects.toBeInstanceOf(XmindFormatError);
    const zip = new JSZip();
    zip.file("metadata.json", "{}");
    await expect(openXmind(new File([await zip.generateAsync({ type: "arraybuffer" })], "empty.xmind"))).rejects.toBeInstanceOf(XmindFormatError);
  });

  it("rejects malformed and excessively deep topic trees", () => {
    expect(() => parseXmindJson([{}])).toThrow(XmindFormatError);
    let root: Record<string, unknown> = { id: "end", title: "end" };
    for (let i = 0; i < 82; i++) root = { id: `topic-${i}`, children: { attached: [root] } };
    expect(() => parseXmindJson([{ rootTopic: root }])).toThrow(/too large/);
  });
});
