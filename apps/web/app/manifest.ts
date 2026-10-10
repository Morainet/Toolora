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
      "Fast, private, local-first JSON tools for developers. Format, validate, minify, diff, repair, and convert JSON.",
    start_url: "/zh",
    display: "standalone",
    background_color: "#fcfcfd",
    theme_color: "#2f44e0",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
