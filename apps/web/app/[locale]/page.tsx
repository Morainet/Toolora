import { ArrowRight, Check, ChevronRight, ClipboardPaste, Lock, MousePointerClick, Sparkles, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { TOOLS } from "@parsy/ui";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export default function HomePage() {
  const t = useTranslations("home");
  const tt = useTranslations("tools");
  const live = TOOLS.filter((tool) => tool.available);
  const visibleTools = live;

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[34rem] bg-[radial-gradient(circle_at_55%_0%,hsl(252_83%_63%_/_0.13),transparent_58%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.06] px-3 py-1.5 text-xs font-medium text-primary"><span className="h-1.5 w-1.5 rounded-full bg-success" />{t("badge")}</div>
            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-[-0.04em] sm:text-6xl">{t("heroTitle")} <span className="text-gradient">{t("heroTitleAccent")}</span></h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">{t("heroSubtitle")}</p>
            <div className="mt-8 flex flex-wrap gap-3"><Button asChild size="lg" className="rounded-xl px-5 shadow-lg shadow-primary/20"><Link href="/json">{t("ctaPrimary")}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button><Button asChild size="lg" variant="outline" className="rounded-xl bg-card/70 px-5"><Link href="#tools">{t("ctaSecondary")}</Link></Button></div>
            <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" />{t("trustLine")}</span><span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5 text-primary" />{t("localOnly")}</span></div>
          </div>

          <div className="saas-panel rounded-3xl p-3 sm:p-4">
            <div className="rounded-2xl bg-slate-950 p-5 text-white shadow-2xl shadow-primary/15 dark:bg-slate-900 sm:p-6">
              <div className="flex items-start justify-between"><div><p className="text-xs font-medium text-white/50">{t("workspaceLabel")}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{t("activeTools")}</p></div><span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">{t("localOnly")}</span></div>
              <div className="mt-6 grid grid-cols-2 gap-3"><Stat value={String(visibleTools.length)} label={t("availableTools")} /><Stat value="0" label={t("uploads")} /></div>
              <div className="mt-6 border-t border-white/10 pt-5"><p className="mb-3 text-xs font-medium text-white/50">{t("quickStart")}</p><div className="space-y-2">{visibleTools.slice(0, 3).map((tool) => <Link key={tool.slug} href={tool.href} className="group flex items-center gap-3 rounded-xl bg-white/[0.06] p-3 transition-colors hover:bg-white/[0.11]"><span className="grid h-8 w-8 place-items-center rounded-lg bg-white/10 text-base">{tool.icon}</span><span className="flex-1 text-sm font-medium">{tt(`${tool.slug}.title`)}</span><ChevronRight className="h-4 w-4 text-white/35 transition-transform group-hover:translate-x-0.5" /></Link>)}</div></div>
            </div>
          </div>
        </section>

        <section id="tools" className="mt-20 scroll-mt-24 sm:mt-28">
          <div className="mb-7 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Toolora library</p><h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{t("sections.toolsTitle")}</h2><p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">{t("sections.toolsSubtitle")}</p></div><span className="text-sm text-muted-foreground">{visibleTools.length} {t("availableTools")}</span></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{visibleTools.map((tool) => <ToolCard key={tool.slug} href={tool.href} icon={tool.icon} title={tt(`${tool.slug}.title`)} description={tt(`${tool.slug}.description`)} openLabel={t("openTool")} />)}</div>
        </section>

        <section className="mt-20 grid gap-4 border-t border-border/70 pt-12 sm:mt-28 sm:grid-cols-3 sm:pt-16">
          <Feature icon={<Zap className="h-4 w-4" />} title={t("pillars.fast.title")} body={t("pillars.fast.desc")} />
          <Feature icon={<Lock className="h-4 w-4" />} title={t("pillars.private.title")} body={t("pillars.private.desc")} />
          <Feature icon={<Sparkles className="h-4 w-4" />} title={t("pillars.precise.title")} body={t("pillars.precise.desc")} />
        </section>

        <section className="mt-20 rounded-3xl border border-primary/15 bg-primary/[0.045] p-6 sm:mt-28 sm:p-10"><div className="grid gap-8 sm:grid-cols-[1fr_auto] sm:items-center"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">{t("sections.howTitle")}</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">{t("footerCta.title")}</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{t("footerCta.subtitle")}</p></div><Button asChild className="rounded-xl"><Link href="/json">{t("footerCta.button")}<ArrowRight className="ml-2 h-4 w-4" /></Link></Button></div><div className="mt-8 grid gap-3 sm:grid-cols-3"><Step icon={<ClipboardPaste className="h-4 w-4" />} title={t("how.step1.title")} /><Step icon={<MousePointerClick className="h-4 w-4" />} title={t("how.step2.title")} /><Step icon={<Check className="h-4 w-4" />} title={t("how.step3.title")} /></div></section>
      </div>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) { return <div className="rounded-xl bg-white/[0.07] p-3"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-white/45">{label}</p></div>; }

function ToolCard({ href, icon, title, description, openLabel }: { href: string; icon: string; title: string; description: string; openLabel: string }) {
  return <Link href={href} className="group flex min-h-48 flex-col rounded-2xl border border-border/80 bg-card p-5 shadow-[0_8px_30px_hsl(222_47%_11%_/_0.04)] transition-all duration-200 hover:-translate-y-1 hover:border-primary/35 hover:shadow-xl hover:shadow-primary/10"><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-xl transition-colors group-hover:bg-primary/15">{icon}</span><ArrowRight className="h-4 w-4 text-muted-foreground/40 transition-all group-hover:translate-x-1 group-hover:text-primary" /></div><h3 className="mt-5 font-semibold tracking-tight">{title}</h3><p className="mt-1.5 flex-1 text-sm leading-6 text-muted-foreground">{description}</p><span className="mt-4 text-sm font-medium text-primary">{openLabel}</span></Link>;
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) { return <div className="rounded-2xl border border-border/70 bg-card/65 p-5"><span className="mb-4 grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span><h3 className="font-semibold">{title}</h3><p className="mt-1.5 text-sm leading-6 text-muted-foreground">{body}</p></div>; }

function Step({ icon, title }: { icon: React.ReactNode; title: string }) { return <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/70 px-4 py-3 text-sm font-medium"><span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">{icon}</span>{title}</div>; }
