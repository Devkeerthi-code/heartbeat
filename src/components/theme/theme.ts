export type Theme = "light" | "dark";

export const THEME_KEY = "hb-theme";
export const THEME_COLORS: Record<Theme, string> = { light: "#f4f0e6", dark: "#0a0c0a" };

/**
 * Runs inline in <head> before first paint. Paper (light) is the default for everyone;
 * dark only applies when the visitor chose it before. Kept tiny and dependency-free.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{if(localStorage.getItem("${THEME_KEY}")==="dark"){var d=document.documentElement;d.setAttribute("data-theme","dark");var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute("content","${THEME_COLORS.dark}")}}catch(e){}})()`;

export function readTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  if (theme === "dark") root.setAttribute("data-theme", "dark");
  else root.removeAttribute("data-theme");
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLORS[theme]);
  try {
    if (theme === "dark") localStorage.setItem(THEME_KEY, "dark");
    else localStorage.removeItem(THEME_KEY);
  } catch {
    // Private mode or storage disabled: the choice just won't survive a reload.
  }
}

export function toggleTheme(): Theme {
  const next: Theme = readTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}

export function subscribeTheme(onChange: () => void): () => void {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => observer.disconnect();
}
