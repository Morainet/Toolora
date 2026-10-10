import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FileParser } from "@/components/file-parser/file-parser";
import { routing } from "@/i18n/routing";
export function generateStaticParams() { return routing.locales.map((locale) => ({ locale })); }
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> { const { locale } = await params; const t = await getTranslations({ locale, namespace: "metadata.file-parser" }); return { title: t("pdfTitle"), description: t("pdfDescription"), alternates: { canonical: `/${locale}/pdf-parser` } }; }
export default async function PdfParserPage({ params }: { params: Promise<{ locale: string }> }) { const { locale } = await params; setRequestLocale(locale); const t = await getTranslations({ locale, namespace: "tools.pdf-parser" }); return <FileParser kind="pdf" title={t("title")} description={t("description")} />; }
