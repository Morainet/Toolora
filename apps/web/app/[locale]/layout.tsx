import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/layout/app-shell";
import { routing } from "@/i18n/routing";

/** True when `value` is one of our supported locales. */
function isLocale(value: string): value is (typeof routing.locales)[number] {
  return (routing.locales as readonly string[]).includes(value);
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

/** Pre-generate both locales so every route is statically rendered. */
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

/**
 * Localized base metadata. Per-page `generateMetadata` overrides title/desc.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "site" });
  const tm = await getTranslations({ locale, namespace: "metadata.home" });

  const title = tm("title");
  const description = t("description");

  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
    ),
    title: {
      default: title,
      template: `%s · ${t("name")}`,
    },
    description,
    applicationName: t("name"),
    keywords: [
      "local file parser",
      "本地文件解析",
      "Word parser",
      "Excel parser",
      "PDF parser",
      "JSON tools",
      "developer tools",
      "开发者工具",
    ],
    authors: [{ name: "Morainet" }],
    openGraph: {
      type: "website",
      locale: locale === "zh" ? "zh_CN" : "en_US",
      title,
      description,
      siteName: t("name"),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: true, follow: true },
    alternates: {
      languages: {
        zh: "/zh",
        en: "/en",
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate the locale; 404 for anything we don't support.
  if (!isLocale(locale)) {
    notFound();
  }

  // Enable static rendering for this locale's tree.
  setRequestLocale(locale);

  // Messages for the client provider.
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider delayDuration={200}>
              <AppShell>{children}</AppShell>
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
