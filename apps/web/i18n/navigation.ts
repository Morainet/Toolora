import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation primitives. Use these INSTEAD of the bare
 * `next/link` and `next/navigation` equivalents whenever a link/path needs to
 * respect the current locale.
 *
 *   import { Link, usePathname, useRouter } from "@/i18n/navigation";
 *   <Link href="/json">  // → /zh/json automatically
 *
 * Writing the path *without* a locale prefix is the intended usage — the
 * current locale is prepended automatically.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
