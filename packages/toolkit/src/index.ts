/**
 * @parsy/toolkit
 *
 * The framework-agnostic extension point for Toolora. A tool definition is
 * intentionally only metadata: rendering stays in the web app, while this
 * package can also be consumed by a CLI, a future desktop app, or plugins.
 */

export type ToolStatus = "available" | "coming-soon";
export type ToolCategory = "json" | "text" | "code" | "utility";

export interface ToolDefinition {
  /** Stable machine id. It is safe to use as a translation namespace key. */
  id: string;
  /** URL segment and the key used by localized messages. */
  slug: string;
  /** Route without locale prefix. */
  href: `/${string}`;
  /** Emoji/icon token used by navigation and cards. */
  icon: string;
  category: ToolCategory;
  status: ToolStatus;
  /** UI renderer key. The web app maps this to a React component. */
  renderer: string;
  /** Message namespaces used by page metadata and tool cards. */
  messages: {
    tool: string;
    metadata: string;
  };
}

export interface ToolRegistry {
  readonly all: readonly ToolDefinition[];
  readonly available: readonly ToolDefinition[];
  readonly upcoming: readonly ToolDefinition[];
  get(idOrSlug: string): ToolDefinition | undefined;
  require(idOrSlug: string): ToolDefinition;
}

function assertDefinitions(definitions: readonly ToolDefinition[]): void {
  const seenIds = new Set<string>();
  const seenSlugs = new Set<string>();

  for (const tool of definitions) {
    if (!tool.id || !tool.slug || !tool.href || !tool.renderer) {
      throw new Error(`Invalid tool definition: ${tool.id || "unknown"}`);
    }
    if (seenIds.has(tool.id)) throw new Error(`Duplicate tool id: ${tool.id}`);
    if (seenSlugs.has(tool.slug)) throw new Error(`Duplicate tool slug: ${tool.slug}`);
    seenIds.add(tool.id);
    seenSlugs.add(tool.slug);
  }
}

/** Create an immutable registry. Use this for app-specific or plugin tools. */
export function createToolRegistry(
  definitions: readonly ToolDefinition[],
): ToolRegistry {
  assertDefinitions(definitions);
  const all = Object.freeze([...definitions]);
  const available = Object.freeze(all.filter((tool) => tool.status === "available"));
  const upcoming = Object.freeze(all.filter((tool) => tool.status === "coming-soon"));
  const byKey = new Map(all.flatMap((tool) => [[tool.id, tool], [tool.slug, tool]]));

  return {
    all,
    available,
    upcoming,
    get: (idOrSlug) => byKey.get(idOrSlug),
    require: (idOrSlug) => {
      const tool = byKey.get(idOrSlug);
      if (!tool) throw new Error(`Unknown Toolora tool: ${idOrSlug}`);
      return tool;
    },
  };
}

const definitions = [
  { id: "json", slug: "json", href: "/json", icon: "{ }", category: "json", status: "available", renderer: "json-workspace", messages: { tool: "tools.json", metadata: "metadata.json" } },
  { id: "word-parser", slug: "word-parser", href: "/word-parser", icon: "📄", category: "utility", status: "available", renderer: "file-parser", messages: { tool: "tools.word-parser", metadata: "metadata.file-parser" } },
  { id: "excel-parser", slug: "excel-parser", href: "/excel-parser", icon: "📊", category: "utility", status: "available", renderer: "file-parser", messages: { tool: "tools.excel-parser", metadata: "metadata.file-parser" } },
  { id: "pdf-parser", slug: "pdf-parser", href: "/pdf-parser", icon: "📑", category: "utility", status: "available", renderer: "file-parser", messages: { tool: "tools.pdf-parser", metadata: "metadata.file-parser" } },
] as const satisfies readonly ToolDefinition[];

/** Default registry used by Toolora's web app. */
export const TOOLKIT = createToolRegistry(definitions);
/** Backwards-friendly aliases for consumers that only need the list. */
export const TOOLS = TOOLKIT.all;
export const AVAILABLE_TOOLS = TOOLKIT.available;

export const getTool = (idOrSlug: string) => TOOLKIT.get(idOrSlug);
export const requireTool = (idOrSlug: string) => TOOLKIT.require(idOrSlug);
