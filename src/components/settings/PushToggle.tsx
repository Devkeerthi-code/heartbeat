"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "@/components/toast/store";
import { currentSubscription, disablePush, enablePush, readPushEnv, subscribeNothing, type PushEnv } from "./pushSupport";

const EXPLAIN: Record<Exclude<PushEnv, "ready">, string> = {
  loading: "Checking what this browser supports…",
  unsupported: "This browser can't receive push notifications. Email alerts still work.",
  "ios-install": "On iPhone and iPad, push only works for installed web apps: tap Share → Add to Home Screen, open Heartbeat from there, then come back here.",
  "no-key": "Push isn't configured on this server yet (NEXT_PUBLIC_VAPID_PUBLIC_KEY is missing). Email alerts still work.",
  denied: "Notifications are blocked for this site. Allow them in your browser's site settings, then reload this page.",
};

/** Per-device push opt-in, with honest explanations for every state a browser can be in. */
export function PushToggle() {
  const env = useSyncExternalStore(subscribeNothing, readPushEnv, () => "loading" as PushEnv);
  const [on, setOn] = useState<boolean | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [busy, start] = useTransition();

  useEffect(() => {
    if (env !== "ready") return;
    currentSubscription()
      .then((sub) => setOn(Boolean(sub)))
      .catch(() => setOn(false));
  }, [env]);

  const state: PushEnv = blocked ? "denied" : env;
  const toggle = () =>
    start(async () => {
      try {
        if (on) {
          await disablePush();
          setOn(false);
          toast("ok", "Push off for this device");
        } else if ((await enablePush()) === "on") {
          setOn(true);
          toast("ok", "Push on for this device", "Other devices need to enable it separately.");
        } else {
          setBlocked(true);
        }
      } catch (err) {
        toast("error", "Couldn't change push alerts", err instanceof Error ? err.message : "Try again.");
      }
    });

  return (
    <div className="grid gap-2 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <strong className="block font-semibold">This device</strong>
          <span className="text-xs text-fg-2" aria-live="polite">
            {state !== "ready" ? (
              <span className="tag tag-paused">[ -- ]</span>
            ) : on ? (
              <span className="tag tag-up">[ ON ]</span>
            ) : (
              <span className="tag tag-paused">[ OFF]</span>
            )}{" "}
            {state === "ready" ? (on ? "Push alerts arrive here, even with the tab closed." : on === null ? "Checking…" : "Not receiving push alerts.") : null}
          </span>
        </div>
        {state === "ready" ? (
          <button type="button" className={`btn ${on ? "" : "btn-primary"}`} onClick={toggle} disabled={busy || on === null} aria-busy={busy}>
            {busy ? <span className="spinner" aria-hidden="true" /> : null}
            {on ? "turn off on this device" : "enable on this device"}
          </button>
        ) : null}
      </div>
      {state !== "ready" ? <p className="prose-text m-0 text-sm text-fg-3">{EXPLAIN[state]}</p> : null}
    </div>
  );
}
