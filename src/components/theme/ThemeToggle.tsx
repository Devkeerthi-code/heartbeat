"use client";

import { useSyncExternalStore } from "react";
import { readTheme, subscribeTheme, toggleTheme, type Theme } from "./theme";

/** Small, unobtrusive paper/dark switch. Paper is the default; dark is an opt-in. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const theme = useSyncExternalStore(subscribeTheme, readTheme, (): Theme => "light");
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={() => toggleTheme()}
      aria-pressed={dark}
      title="Switch between paper and dark (shortcut: t)"
      className={`cursor-pointer text-xs text-fg-3 hover:text-fg ${className}`}
    >
      <span aria-hidden="true">[t]</span> {dark ? "dark" : "paper"}
      <span className="sr-only"> theme. Dark theme {dark ? "on" : "off"}</span>
    </button>
  );
}
