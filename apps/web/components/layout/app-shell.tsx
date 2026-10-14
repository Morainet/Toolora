"use client";

import { useEffect, useState } from "react";
import {
  Home,
  LayoutGrid,
  Maximize2,
  Menu,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { TOOLS } from "@parsy/ui";
import { Link, usePathname } from "@/i18n/navigation";
import { BrandMark } from "@/components/brand-mark";
import { ToolIcon } from "@/components/tool-icon";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteFooter } from "@/components/layout/site-header";
import { ToolFocusContext } from "@/components/layout/tool-focus-context";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("site");
  const tTools = useTranslations("tools");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolFocused, setToolFocused] = useState(false);
  // Tool pages prioritize the editor canvas; the full navigation remains one click away.
  const [collapsed, setCollapsed] = useState(pathname !== "/");
  const live = TOOLS.filter((tool) => tool.available);
  const focusableTool = live.find((tool) => tool.href === pathname && tool.slug !== "json");

  useEffect(() => {
    setMobileOpen(false);
    setCollapsed(pathname !== "/");
    setToolFocused(false);
  }, [pathname]);

  useEffect(() => {
    if (!toolFocused) return;
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setToolFocused(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [toolFocused]);

  useEffect(() => {
    if (!mobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [mobileOpen]);

  const navigation = (compact = false, mobile = false) => (
    <nav aria-label={t("workspace")} className={cn("space-y-6", compact ? "px-2" : "px-3")}>
      <div>
        <NavLink
          href="/"
          label={t("home")}
          icon={Home}
          active={pathname === "/"}
          compact={compact}
          onNavigate={mobile ? () => setMobileOpen(false) : undefined}
        />
      </div>

      <div>
        {compact ? (
          <div className="mx-auto mb-3 h-px w-8 bg-border" aria-hidden />
        ) : (
          <div className="mb-2 flex items-center justify-between px-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">
              {t("toolsNav")}
            </p>
            <span className="text-[11px] tabular-nums text-muted-foreground/70">{live.length}</span>
          </div>
        )}
        <div className="space-y-1">
          {live.map((tool) => (
            <NavLink
              key={tool.slug}
              href={tool.href}
              label={tTools(`${tool.slug}.short`)}
              iconName={tool.icon}
              active={pathname === tool.href}
              compact={compact}
              onNavigate={mobile ? () => setMobileOpen(false) : undefined}
            />
          ))}
        </div>
      </div>
    </nav>
  );

  return (
    <ToolFocusContext.Provider value={toolFocused}>
    <div data-tool-focus={toolFocused} className="min-h-svh bg-background">
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-border/80 bg-card transition-[width] duration-200 md:flex",
          toolFocused && "md:hidden",
          collapsed ? "w-[68px]" : "w-56",
        )}
      >
        <div className={cn("flex h-[4.5rem] shrink-0 items-center border-b border-border/70", collapsed ? "justify-center" : "px-4")}>
          <Link href="/" className="flex items-center gap-2.5" aria-label={t("name")}>
            <BrandMark size={32} />
            {!collapsed && <span className="text-[15px] font-semibold tracking-tight">{t("name")}</span>}
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-5">{navigation(collapsed)}</div>

        <div className={cn("shrink-0 border-t border-border/70 p-3", collapsed && "px-2")}>
          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? t("expandSidebar") : t("collapseSidebar")}
            aria-expanded={!collapsed}
            title={collapsed ? t("expandSidebar") : undefined}
            className={cn(
              "flex h-10 items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:text-foreground",
              collapsed ? "w-full justify-center" : "w-full gap-3 px-3 text-sm",
            )}
          >
            {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
            {!collapsed && <span>{t("collapseSidebar")}</span>}
          </button>
        </div>
      </aside>

      {mobileOpen && !toolFocused && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label={t("closeMenu")}
        />
      )}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(84vw,280px)] flex-col border-r border-border bg-card shadow-2xl transition-transform md:hidden",
          toolFocused && "hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-hidden={!mobileOpen}
        inert={!mobileOpen}
      >
        <div className="flex h-[4.5rem] shrink-0 items-center justify-between border-b border-border px-4">
          <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5">
            <BrandMark size={32} />
            <span className="font-semibold">{t("name")}</span>
          </Link>
          <button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label={t("closeMenu")}>
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-5">{navigation(false, true)}</div>
      </aside>

      <div className={cn("transition-[padding] duration-200", !toolFocused && (collapsed ? "md:pl-[68px]" : "md:pl-56"))}>
        <header className={cn("sticky top-0 z-30 flex items-center justify-between border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl sm:px-6", toolFocused ? "h-12" : pathname === "/" ? "h-[4.5rem]" : "h-14")}>
          {toolFocused && focusableTool ? (
            <>
              <div className="flex min-w-0 items-center gap-2 text-sm font-medium">
                <ToolIcon name={focusableTool.icon} className="h-4 w-4 text-primary" />
                <span className="truncate">{tTools(`${focusableTool.slug}.short`)}</span>
                <span className="hidden text-xs font-normal text-muted-foreground sm:inline">· {t("focusMode")}</span>
              </div>
              <button type="button" onClick={() => setToolFocused(false)} aria-label={t("exitFocus")} aria-keyshortcuts="Escape" title={t("exitFocus")} className="inline-flex h-8 items-center gap-2 rounded-md border border-border bg-card px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted">
                <Minimize2 className="h-3.5 w-3.5" />{t("exitFocus")}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setMobileOpen(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted md:hidden" aria-label={t("openMenu")}>
                  <Menu className="h-5 w-5" />
                </button>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LayoutGrid className="h-4 w-4" />
                  <span>{t("workspace")}</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {focusableTool && <button type="button" onClick={() => { setMobileOpen(false); setToolFocused(true); }} aria-label={t("enterFocus")} title={t("enterFocus")} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-card px-2.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"><Maximize2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">{t("enterFocus")}</span></button>}
                <LanguageToggle /><ThemeToggle />
              </div>
            </>
          )}
        </header>
        <main className={toolFocused ? "min-h-[calc(100svh-3rem)]" : "min-h-[calc(100vh-9rem)]"}>{children}</main>
        {!toolFocused && <SiteFooter />}
      </div>
    </div>
    </ToolFocusContext.Provider>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  iconName,
  active,
  compact,
  onNavigate,
}: {
  href: string;
  label: string;
  icon?: LucideIcon;
  iconName?: string;
  active: boolean;
  compact: boolean;
  onNavigate?: () => void;
}) {
  const warmEditor = () => {
    if (href === "/json") {
      void import("@/lib/monaco").then((runtime) => runtime.preloadMonaco()).catch(() => {});
    }
  };

  return (
    <Link
      href={href}
      prefetch={true}
      onMouseEnter={warmEditor}
      onFocus={warmEditor}
      onClick={onNavigate}
      aria-label={compact ? label : undefined}
      aria-current={active ? "page" : undefined}
      title={compact ? label : undefined}
      className={cn(
        "group relative flex h-10 items-center rounded-lg text-sm transition-colors focus-visible:text-primary",
        compact ? "justify-center" : "gap-3 px-3",
        active ? "bg-primary/[0.09] font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {active && <span aria-hidden className="absolute bottom-2 left-0 top-2 w-[3px] rounded-full bg-primary" />}
      {Icon ? (
        <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.1 : 1.8} aria-hidden />
      ) : (
        <ToolIcon name={iconName ?? ""} className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2.1 : 1.8} />
      )}
      {!compact && <span className="truncate">{label}</span>}
    </Link>
  );
}
