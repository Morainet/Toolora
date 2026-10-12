import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LogViewer } from "@/components/log/log-viewer";
import { routing } from "@/i18n/routing";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.log-viewer" });
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: `/${locale}/log-viewer` },
    openGraph: { title: t("title"), description: t("description") },
  };
}

export default async function LogViewerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <LogViewer />;
}
