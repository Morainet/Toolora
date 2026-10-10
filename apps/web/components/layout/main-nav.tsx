"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { TOOLS } from "@parsy/ui";
import { Link, usePathname } from "@/i18n/navigation";
import { BrandMark } from "@/components/brand-mark";
import { ToolIcon } from "@/components/tool-icon";
import { cn } from "@/lib/utils";

/**
 * Primary site navigation.
 *
 * Desktop (md+): inline nav with active-state underline on the current tool.
 * Mobile (<md): hamburger button toggles a dropdown panel listing all tools.
 *
 * Uses the locale-aware `Link`/`usePathname` from `@/i18n/navigation` so paths
 * are written without a locale prefix and resolved automatically. Tool labels
 * come from the `tools.*.short` dictionary.
 */
export function MainNav({ className }: { className?: string }) {
  const t = useTranslations("site");
  const tTools = useTranslations("tools");
  const tNav = useTranslations("nav");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const live = TOOLS.filter((tool) => tool.available);

  // Close the mobile menu on route change.
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <nav className={cn("flex items-center gap-1", className)} aria-label={tNav("main")}>
      <Link
        href="/"
        className="group mr-4 flex items-center gap-2.5 rounded-xl px-1.5 py-1"
      >
        <BrandMark size={32} className="transition-transform group-hover:scale-105" />
        <span className="hidden text-[15px] font-semibold tracking-tight sm:inline">
          {t("name")}
        </span>
      </Link>

      {/* Desktop nav */}
      <div className="hidden items-center gap-0.5 md:flex">
        {live.map((tool) => {
          const active = pathname === tool.href;
          return (
            <Link
              key={tool.slug}
              href={tool.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative rounded-xl px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
            >
              {tTools(`${tool.slug}.short`)}
            </Link>
          );
        })}
      </div>

      {/* Mobile hamburger */}
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label={mobileOpen ? "Close menu" : "Open menu"}
        aria-expanded={mobileOpen}
        className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Mobile dropdown panel */}
      {mobileOpen && (
        <div className="absolute left-0 right-0 top-[4.5rem] z-50 border-b border-border bg-card shadow-soft md:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="grid grid-cols-2 gap-1.5">
              {live.map((tool) => {
                const active = pathname === tool.href;
                return (
                  <Link
                    key={tool.slug}
                    href={tool.href}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    <ToolIcon name={tool.icon} className="h-4 w-4" />
                    {tTools(`${tool.slug}.title`)}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
