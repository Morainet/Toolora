import { cn } from "@/lib/utils";

/**
 * Toolora brand mark: a compact T-shaped tool node with an orbit dot.
 *
 * Use this everywhere the Toolora logo mark appears in the UI so the brand
 * stays consistent with the favicon.
 */
export function BrandMark({
  className,
  size = 32,
}: {
  className?: string;
  /** Pixel size of the square mark (width = height). */
  size?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      width={size}
      height={size}
      role="img"
      aria-label="Toolora"
      className={cn("shrink-0", className)}
    >
      <defs>
        <linearGradient id="toolora-mark" x1="64" y1="40" x2="448" y2="472" gradientUnits="userSpaceOnUse">
          <stop stopColor="#7C5CFC" />
          <stop offset="1" stopColor="#4A35C9" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="136" fill="url(#toolora-mark)" />
      <circle cx="366" cy="142" r="28" fill="#C9C1FF" />
      <rect x="116" y="130" width="280" height="62" rx="31" fill="#ffffff" />
      <rect x="225" y="130" width="62" height="250" rx="31" fill="#ffffff" />
      <circle cx="256" cy="380" r="18" fill="#C9C1FF" />
    </svg>
  );
}
