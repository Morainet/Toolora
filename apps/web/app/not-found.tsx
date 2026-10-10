import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";

/**
 * Root-level 404 fallback. Renders when a 404 is triggered OUTSIDE the
 * [locale] segment (e.g. a path that doesn't match any locale prefix), where
 * translations aren't available. Provides a branded, helpful page with links
 * to both locales.
 *
 * Note: for valid-locale paths like /zh/nonexistent, the richer
 * [locale]/not-found.tsx renders instead (with full translations + tool links).
 */
export default function RootNotFound() {
  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-50" />

      <BrandMark size={56} />

      <p className="mt-8 text-6xl font-bold tracking-tight">404</p>
      <h1 className="mt-4 text-xl font-semibold">
        Page not found / 页面未找到
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/zh"
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-soft transition-transform hover:scale-105 active:scale-95"
        >
          中文首页
        </Link>
        <Link
          href="/en"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-medium shadow-soft transition-transform hover:scale-105 active:scale-95"
        >
          English home
        </Link>
      </div>
    </div>
  );
}
