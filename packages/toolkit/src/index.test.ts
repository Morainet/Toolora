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
