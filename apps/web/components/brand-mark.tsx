import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Toolora brand mark: a simple, solid T monogram.
 *
 * The in-app mark uses a small PNG rasterized from the favicon SVG source.
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
    <Image
      src="/icon-192.png"
      alt="Toolora"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      loading="eager"
      unoptimized
      className={cn("shrink-0", className)}
    />
  );
}
