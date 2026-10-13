import { BookOpen, Braces, FileText, ScrollText, Table2, Wrench, type LucideIcon } from "lucide-react";

/** Resolve framework-neutral tool icon tokens to one consistent SVG set. */
const icons: Record<string, LucideIcon> = {
  braces: Braces,
  "file-text": FileText,
  table: Table2,
  "book-open": BookOpen,
  "scroll-text": ScrollText,
};

export function ToolIcon({
  name,
  className,
  strokeWidth = 1.8,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Icon = icons[name] ?? Wrench;
  return <Icon className={className} strokeWidth={strokeWidth} aria-hidden="true" />;
}
