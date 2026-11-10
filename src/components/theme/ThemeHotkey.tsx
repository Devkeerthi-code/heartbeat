"use client";

import { useEffect } from "react";
import { isTyping } from "@/components/shell/Shortcuts";
import { toggleTheme } from "./theme";

/** Global "t" shortcut to switch theme. Ignored while typing or with modifier keys held. */
export function ThemeHotkey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "t" || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || document.querySelector("dialog[open]")) return;
      toggleTheme();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return null;
}
