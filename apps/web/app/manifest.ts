import type { MetadataRoute } from "next";

/**
 * Web app manifest for PWA install metadata. Lets users "Add to Home Screen"
 * with the Toolora icon, name, and theme color.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Toolora — Developer Toolkit",
    short_name: "Toolora",
    description:
      "A fast, private, local-first toolkit for JSON, Word, Excel, and PDF.",
    start_url: "/zh",
    display: "standalone",
    background_color: "#f7f9fc",
    theme_color: "#175cd3",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
