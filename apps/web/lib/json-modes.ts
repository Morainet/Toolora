export const JSON_MODES = ["format", "minify", "validate", "tree", "diff", "repair", "converter"] as const;

export type JsonWorkspaceMode = (typeof JSON_MODES)[number];

export function isJsonWorkspaceMode(value: string | undefined): value is JsonWorkspaceMode {
  return JSON_MODES.some((mode) => mode === value);
}
