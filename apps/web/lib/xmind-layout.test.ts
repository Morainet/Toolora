import { describe, expect, it } from "vitest";
import type { XmindTopic } from "@parsy/file-parser";
import { layoutMindMap, layoutXmindSheet } from "./xmind-layout";

const root: XmindTopic = { id: "root", title: "Root", children: [
  { id: "a", title: "A", children: [{ id: "a1", title: "A1", children: [] }] },
  { id: "b", title: "B", children: [] },
] };

describe("XMind map layout", () => {
  it("places descendants to the right and centers parents over children", () => {
    const layout = layoutMindMap(root, new Set());
    expect(layout.nodes).toHaveLength(4);
    const byId = Object.fromEntries(layout.nodes.map((node) => [node.topic.id, node]));
    expect(byId.a.x).toBeGreaterThan(byId.root.x);
    expect(byId.a1.x).toBeGreaterThan(byId.a.x);
    expect(byId.root.y).toBe((byId.a.y + byId.b.y) / 2);
  });

  it("hides collapsed descendants and reduces the map width", () => {
    const expanded = layoutMindMap(root, new Set());
    const collapsed = layoutMindMap(root, new Set(["a"]));
    expect(collapsed.nodes.map((node) => node.topic.id)).not.toContain("a1");
    expect(collapsed.width).toBeLessThan(expanded.width);
  });

  it("includes floating topics as separate preview trees", () => {
    const floating: XmindTopic = { id: "floating", title: "Floating", children: [{ id: "child", title: "Child", children: [] }] };
    const layout = layoutXmindSheet({ id: "sheet", title: "Sheet", root, floating: [floating] }, new Set());
    const byId = Object.fromEntries(layout.nodes.map((node) => [node.topic.id, node]));
    expect(byId.floating.y).toBeGreaterThan(byId.b.y);
    expect(byId.child.parentId).toBe("floating");
  });
});
