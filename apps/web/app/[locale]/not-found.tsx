import { useTranslations } from "next-intl";
import { ArrowRight, Home } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { TOOLS } from "@parsy/ui";
import { BrandMark } from "@/components/brand-mark";
import { ToolIcon } from "@/components/tool-icon";
import { Button } from "@/components/ui/button";

/**
 * Localized, branded 404 page. Renders inside the [locale] layout so it has
 * access to translations and the header/footer shell.
 */
export default function NotFound() {
  const t = useTranslations("notFound");
  const tTools = useTranslations("tools");
  const live = TOOLS.filter((tool) => tool.available);

  return (
    <div className="relative mx-auto flex min-h-[70svh] max-w-2xl flex-col items-center justify-center px-4 py-20 text-center">
      <BrandMark size={56} className="mb-8" />

      {/* Big 404 */}
      <p className="text-primary text-7xl font-bold tracking-tight sm:text-8xl">
        {t("code")}
      </p>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight sm:text-3xl">
        {t("title")}
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">{t("description")}</p>

      {/* CTAs */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/">
            <Home className="h-4 w-4" />
            {t("backHome")}
          </Link>
        </Button>
      </div>

      {/* Tool links */}
      <div className="mt-10 w-full">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground/70">
          {t("browseTools")}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {live.map((tool) => (
            <Link
              key={tool.slug}
              href={tool.href}
              className="group inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-medium text-muted-foreground shadow-soft transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:text-foreground"
            >
              <ToolIcon name={tool.icon} className="h-4 w-4" />
              {tTools(`${tool.slug}.short`)}
              <ArrowRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
