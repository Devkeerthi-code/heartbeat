"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

const KEYS: Array<[string, string]> = [
  ["n", "add a monitor"],
  ["/", "search monitors"],
  ["j / k", "move through the list"],
  ["enter", "open the selected monitor"],
  ["g m", "go to monitors"],
  ["g a", "go to settings (alerts, status page)"],
  ["esc", "back / close"],
  ["?", "this help"],
];

export function isTyping(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || Boolean(target.closest("input, textarea, select")));
}

/** Global vim/k9s-style shortcuts. Ignored while typing and with modifier keys held. */
export function Shortcuts() {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let gAt = 0;
    const openHelp = () => dialog.current?.open || dialog.current?.showModal();
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || dialog.current?.open) return;
      if (isTyping(e.target)) {
        if (e.key === "Escape" && e.target instanceof HTMLElement) e.target.blur();
        return;
      }
      if (Date.now() - gAt < 800) {
        gAt = 0;
        const dest = e.key === "m" ? "/dashboard" : e.key === "a" ? "/settings" : null;
        if (dest) {
          e.preventDefault();
          router.push(dest);
        }
        return;
      }
      if (e.key === "g") gAt = Date.now();
      else if (e.key === "?") {
        e.preventDefault();
        openHelp();
      } else if (e.key === "n") {
        e.preventDefault();
        router.push("/monitors/new");
      } else if (e.key === "Escape" && window.location.pathname.startsWith("/monitors/")) {
        router.push("/dashboard");
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("hb:help", openHelp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hb:help", openHelp);
    };
  }, [router]);

  return (
    <dialog ref={dialog} aria-labelledby="keys-h" className="m-auto w-[min(420px,calc(100vw-24px))] border border-accent-ink bg-surface p-0 text-fg shadow-[var(--shadow-pop)] backdrop:bg-black/55">
      <div className="pane-head">
        <h2 id="keys-h" className="pane-title">
          keyboard
        </h2>
        <form method="dialog">
          <button className="btn btn-ghost btn-sm">
            close <kbd>esc</kbd>
          </button>
        </form>
      </div>
      <dl className="m-0 grid gap-1.5 px-4 pt-3 pb-4">
        {KEYS.map(([k, d]) => (
          <div key={k} className="grid grid-cols-[96px_1fr] gap-3">
            <dt className="text-accent-ink">{k}</dt>
            <dd className="m-0 text-fg-2">{d}</dd>
          </div>
        ))}
      </dl>
    </dialog>
  );
}
