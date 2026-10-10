import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FileParser } from "@/components/file-parser/file-parser";
import { routing } from "@/i18n/routing";

export function generateStaticParams() { return routing.locales.map((locale) => ({ locale })); }
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params; const t = await getTranslations({ locale, namespace: "metadata.file-parser" });
  return { title: t("wordTitle"), description: t("wordDescription"), alternates: { canonical: `/${locale}/word-parser` } };
}
export default async function WordParserPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params; setRequestLocale(locale); const t = await getTranslations({ locale, namespace: "tools.word-parser" });
  return <FileParser kind="word" title={t("title")} description={t("description")} />;
}
