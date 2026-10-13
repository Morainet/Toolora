"use client";

import { loader } from "@monaco-editor/react";
import monacoPackage from "monaco-editor/package.json";

// Configure once before either Editor or DiffEditor mounts. Keep workers and
// language services on the same origin as the application, not the default CDN.
if (typeof window !== "undefined") {
  // An absolute URL is also required inside Monaco's blob-based workers.
  const vs = new URL(`/monaco/${monacoPackage.version}/vs`, window.location.origin).href;
  loader.config({ paths: { vs } });
}

export function preloadMonaco() {
  return loader.init();
}
