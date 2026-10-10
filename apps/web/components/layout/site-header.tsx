"use client";

import * as React from "react";
import { Github, BadgeCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { MainNav } from "@/components/layout/main-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { BrandMark } from "@/components/brand-mark";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Sticky header that turns into frosted glass + gains a hairline shadow once
 * the user scrolls, so it reads as floating over content rather than a flat bar.
 */
export function SiteHeader() {
  const tNav = useTranslations("nav");
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-colors duration-300",
        scrolled
          ? "glass border-border shadow-soft"
          : "border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-[4.5rem] max-w-7xl items-center gap-2 px-4 sm:px-6">
        <MainNav className="flex-1" />

        <div className="flex items-center gap-1">
          <LanguageToggle />

          <Tooltip>
            <TooltipTrigger asChild>
              <a
                href="https://github.com/Morainet/Parsy"
                target="_blank"
                rel="noreferrer"
                aria-label="GitHub"
                className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Github className="h-[18px] w-[18px]" />
              </a>
            </TooltipTrigger>
            <TooltipContent>{tNav("github")}</TooltipContent>
          </Tooltip>

          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const t = useTranslations("site");
  return (
    <footer className="border-t border-border bg-card/40">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row">
        <div className="flex items-center gap-2.5">
          <BrandMark size={28} />
          <span className="font-medium text-foreground">{t("name")}</span>
        </div>

        {/* Morainet organization verification badge */}
        <a
          href="https://github.com/Morainet"
          target="_blank"
          rel="noreferrer"
          className="group inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-soft transition-colors hover:border-primary/40 hover:text-foreground"
          title={t("orgVerified")}
        >
          <BadgeCheck className="h-3.5 w-3.5 text-primary" />
          <span>{t("byOrg", { org: "Morainet" })}</span>
        </a>

        <div className="flex items-center gap-4">
          <span className="text-xs text-muted-foreground/80">
            {t("footerPrivacy")}
          </span>
          <span className="hidden h-3 w-px bg-border sm:block" aria-hidden />
          <span className="text-xs text-muted-foreground/80">
            {t("footerLicense")}
          </span>
        </div>
      </div>
    </footer>
  );
}
