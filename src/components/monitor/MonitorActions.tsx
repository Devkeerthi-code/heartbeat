"use client";

import Link from "next/link";
import { useEffect, useTransition } from "react";
import { checkNowAction, togglePauseAction } from "@/app/actions/monitors";
import type { ActionState } from "@/app/actions/types";
import { isTyping } from "@/components/shell/Shortcuts";
import { toast } from "@/components/toast/store";

type Props = { monitorId: string; paused: boolean };

function report(res: ActionState, okTitle: string) {
  if (res.ok) toast("ok", okTitle, res.message);
  else toast("error", "That didn't work", res.message ?? "Try again in a moment.");
}

/** check now / pause / edit, with c / p / e shortcuts. Each button is disabled while it runs. */
export function MonitorActions({ monitorId, paused }: Props) {
  const [checking, startCheck] = useTransition();
  const [toggling, startToggle] = useTransition();

  const checkNow = () =>
    startCheck(async () => {
      try {
        report(await checkNowAction(monitorId), "Checked");
      } catch {
        toast("error", "Couldn't reach the server", "Check your connection and try again.");
      }
    });
  const togglePause = () =>
    startToggle(async () => {
      try {
        report(await togglePauseAction(monitorId), paused ? "Resumed" : "Paused");
      } catch {
        toast("error", "Couldn't reach the server", "Check your connection and try again.");
      }
    });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || document.querySelector("dialog[open]")) return;
      if (e.key === "c" && !checking) document.getElementById("check-now")?.click();
      if (e.key === "p" && !toggling) document.getElementById("toggle-pause")?.click();
      if (e.key === "e") document.getElementById("edit-monitor")?.click();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [checking, toggling]);

  return (
    <div className="flex flex-wrap gap-2">
      <button id="check-now" type="button" className="btn" onClick={checkNow} disabled={checking || paused} aria-busy={checking} title={paused ? "Resume the monitor to run checks" : undefined}>
        {checking ? <span className="spinner" aria-hidden="true" /> : null}
        {checking ? "checking" : "check now"} <kbd className="max-md:hidden">c</kbd>
      </button>
      <button id="toggle-pause" type="button" className="btn" onClick={togglePause} disabled={toggling} aria-busy={toggling} aria-pressed={paused}>
        {toggling ? <span className="spinner" aria-hidden="true" /> : null}
        {paused ? "resume" : "pause"} <kbd className="max-md:hidden">p</kbd>
      </button>
      <Link id="edit-monitor" href={`/monitors/${monitorId}/edit`} className="btn">
        edit <kbd className="max-md:hidden">e</kbd>
      </Link>
    </div>
  );
}
