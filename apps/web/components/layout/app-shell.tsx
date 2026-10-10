"use client";

import { useEffect, useState } from "react";
import { FileText, Home, Menu, Moon, PanelLeftClose, PanelLeftOpen, Settings2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { TOOLS } from "@parsy/ui";
import { Link, usePathname } from "@/i18n/navigation";
import { BrandMark } from "@/components/brand-mark";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { SiteFooter } from "@/components/layout/site-header";
import { cn } from "@/lib/utils";

const fileSlugs = new Set(["word-parser", "excel-parser", "pdf-parser"]);

export function AppShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations("site");
  const tTools = useTranslations("tools");
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const live = TOOLS.filter((tool) => tool.available);
  const jsonTools = live.filter((tool) => !fileSlugs.has(tool.slug));
  const fileTools = live.filter((tool) => fileSlugs.has(tool.slug));

  useEffect(() => setMobileOpen(false), [pathname]);

  const navigation = (mobile = false) => (
    <div className={cn("flex flex-col gap-6", mobile && "px-3 py-5")}>
      <div>
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">{t("workspace")}</p>
        <Link href="/" className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors", pathname === "/" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Home className="h-4 w-4" />{t("home")}</Link>
      </div>
      <ToolSection title={t("jsonTools")} tools={jsonTools} pathname={pathname} tTools={tTools} />
      <ToolSection title={t("fileTools")} tools={fileTools} pathname={pathname} tTools={tTools} />
    </div>
  );

  return (
    <div className="min-h-svh bg-background">
      <aside className={cn("fixed inset-y-0 left-0 z-50 hidden flex-col border-r border-border/80 bg-card/75 backdrop-blur-xl transition-[width] duration-200 md:flex", collapsed ? "w-[76px]" : "w-64")}>
        <div className={cn("flex h-[4.5rem] items-center border-b border-border/70 px-4", collapsed ? "justify-center" : "justify-between")}>
          <Link href="/" className="flex items-center gap-3"><BrandMark size={34} /><span className={cn("text-base font-semibold tracking-tight", collapsed && "sr-only")}>{t("name")}</span></Link>
          {!collapsed && <button type="button" onClick={() => setCollapsed(true)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={t("collapseSidebar")}><PanelLeftClose className="h-4 w-4" /></button>}
        </div>
        <div className={cn("flex-1 overflow-y-auto py-6", collapsed && "px-2")}>{collapsed ? <div className="flex flex-col items-center gap-2"><Link href="/" className="rounded-xl p-3 text-muted-foreground hover:bg-muted"><Home className="h-4 w-4" /></Link>{live.map((tool) => <Link key={tool.slug} href={tool.href} title={tTools(`${tool.slug}.title`)} className={cn("rounded-xl p-3 text-lg", pathname === tool.href ? "bg-primary/10" : "hover:bg-muted")}>{tool.icon}</Link>)}</div> : navigation()}</div>
        <div className={cn("border-t border-border/70 p-4", collapsed && "flex justify-center px-2")}><button type="button" onClick={() => setCollapsed(false)} className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"><PanelLeftOpen className="h-4 w-4" /><span className={collapsed ? "sr-only" : ""}>{t("expandSidebar")}</span></button></div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-40 bg-slate-950/25 md:hidden" onClick={() => setMobileOpen(false)} />}
      <aside className={cn("fixed inset-y-0 left-0 z-50 w-[min(88vw,300px)] border-r border-border bg-card shadow-2xl transition-transform md:hidden", mobileOpen ? "translate-x-0" : "-translate-x-full")}><div className="flex h-[4.5rem] items-center justify-between border-b border-border px-4"><Link href="/" className="flex items-center gap-3"><BrandMark size={34} /><span className="font-semibold">{t("name")}</span></Link><button type="button" onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted"><X className="h-5 w-5" /></button></div>{navigation(true)}</aside>

      <div className="md:pl-64" style={collapsed ? { paddingLeft: "76px" } : undefined}>
        <header className="sticky top-0 z-30 flex h-[4.5rem] items-center justify-between border-b border-border/70 bg-background/80 px-4 backdrop-blur-xl sm:px-6"><div className="flex items-center gap-3"><button type="button" onClick={() => setMobileOpen(true)} className="rounded-xl p-2 text-muted-foreground hover:bg-muted md:hidden" aria-label={t("openMenu")}><Menu className="h-5 w-5" /></button><div className="hidden items-center gap-2 text-sm text-muted-foreground sm:flex"><FileText className="h-4 w-4" /><span>{t("workspace")}</span></div></div><div className="flex items-center gap-1"><LanguageToggle /><ThemeToggle /></div></header>
        <main className="min-h-[calc(100vh-9rem)]">{children}</main>
        <SiteFooter />
      </div>
    </div>
  );
}

function ToolSection({ title, tools, pathname, tTools }: { title: string; tools: typeof TOOLS; pathname: string; tTools: (key: string) => string }) {
  return <div><p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/70">{title}</p><div className="space-y-0.5">{tools.map((tool) => <Link key={tool.slug} href={tool.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors", pathname === tool.href ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><span className="w-5 text-center text-base" aria-hidden>{tool.icon}</span><span className="truncate">{tTools(`${tool.slug}.short`)}</span></Link>)}</div></div>;
}
