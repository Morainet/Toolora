"use client";

import { createContext, useContext } from "react";

export const ToolFocusContext = createContext(false);

/** Whether the shared tool shell is using the full browser viewport. */
export function useToolFocus() {
  return useContext(ToolFocusContext);
}
