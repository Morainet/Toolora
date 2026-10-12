import { describe, expect, it } from "vitest";
import { createToolRegistry, TOOLKIT } from "./index";

describe("tool registry", () => {
  it("indexes tools by both id and slug", () => {
    expect(TOOLKIT.get("json")?.renderer).toBe("json-workspace");
    expect(TOOLKIT.get("json")?.id).toBe("json");
  });

  it("registers one JSON workspace instead of separate feature pages", () => {
    expect(TOOLKIT.all.filter((tool) => tool.category === "json").map((tool) => tool.href)).toEqual(["/json"]);
    expect(TOOLKIT.get("json-formatter")).toBeUndefined();
    expect(TOOLKIT.get("json-diff")).toBeUndefined();
  });

  it("registers the local log viewer as a standalone code tool", () => {
    expect(TOOLKIT.get("log-viewer")).toMatchObject({ href: "/log-viewer", category: "code", renderer: "log-viewer", status: "available" });
  });

  it("uses portable icon names rather than platform-dependent emoji", () => {
    for (const tool of TOOLKIT.all) {
      expect(tool.icon).toMatch(/^[a-z]+(?:-[a-z]+)*$/);
    }
  });

  it("rejects duplicate ids and slugs", () => {
    const tool = TOOLKIT.all[0];
    expect(() => createToolRegistry([tool, tool])).toThrow(/Duplicate tool/);
  });

  it("separates available and upcoming tools", () => {
    const registry = createToolRegistry([
      { ...TOOLKIT.all[0], status: "available" },
      { ...TOOLKIT.all[1], id: "future", slug: "future", href: "/future", status: "coming-soon" },
    ]);
    expect(registry.available).toHaveLength(1);
    expect(registry.upcoming).toHaveLength(1);
  });
});
