/**
 * @parsy/ui
 *
 * Shared, framework-agnostic design tokens and the tool/route registry.
 *
 * IMPORTANT (i18n): this package deliberately contains NO user-facing strings.
 * Tool titles/descriptions and site name/tagline live in the web app's
 * message dictionaries (`messages/zh.json`, `messages/en.json`) and are
 * resolved at render time via `next-intl`. This keeps the package free of any
 * i18n dependency and lets the registry be consumed by nav, homepage cards,
 * and the sitemap as pure route metadata.
 *
 * The `slug` is the join key used to look up localized strings, e.g.
 * `t('tools.json.title')`.
 */

/** @deprecated Import the registry from @parsy/toolkit in new code. */
import { TOOLS as TOOL_DEFINITIONS } from "@parsy/toolkit";

/** Compatibility view for existing web components. New code should use @parsy/toolkit. */
export interface ToolEntry {
  slug: string;
  href: string;
  icon: string;
  available: boolean;
}

export const TOOLS: readonly ToolEntry[] = TOOL_DEFINITIONS.map((tool) => ({
  slug: tool.slug,
  href: tool.href,
  icon: tool.icon,
  available: tool.status === "available",
}));

export { AVAILABLE_TOOLS, TOOLKIT, getTool, requireTool } from "@parsy/toolkit";
