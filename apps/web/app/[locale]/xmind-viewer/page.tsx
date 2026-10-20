import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { XmindViewer } from "@/components/xmind/xmind-viewer";
import { routing } from "@/i18n/routing";

export function generateStaticParams() { return routing.locales.map((locale) => ({ locale })); }

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata.file-parser" });
  return { title: t("xmindTitle"), description: t("xmindDescription"), alternates: { canonical: `/${locale}/xmind-viewer` } };
}

export default async function XmindViewerPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "tools.xmind-viewer" });
  return <XmindViewer title={t("title")} description={t("description")} />;
}
