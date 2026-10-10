import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { JsonWorkspace } from "@/components/json/json-workspace";
import { isJsonWorkspaceMode } from "@/lib/json-modes";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.json" });
  return { title: t("title"), description: t("description"), alternates: { canonical: `/${locale}/json` }, openGraph: { title: t("title"), description: t("description") } };
}

export default async function JsonWorkspacePage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ mode?: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const { mode } = await searchParams;
  return <JsonWorkspace initialMode={isJsonWorkspaceMode(mode) ? mode : "format"} />;
}
