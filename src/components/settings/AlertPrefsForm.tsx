"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { sendTestEmailAction, updateAlertPrefsAction } from "@/app/actions/alerts";
import { initialState } from "@/app/actions/types";
import { toast } from "@/components/toast/store";
import { FormMessage } from "@/components/ui/FieldError";
import { SubmitButton } from "@/components/ui/SubmitButton";

type Props = { email: string; emailAlerts: boolean; pushAlerts: boolean };

/** Which channels get alerts. Saved with a real server action; result shown as a toast. */
export function AlertPrefsForm({ email, emailAlerts, pushAlerts }: Props) {
  const [state, save] = useActionState(updateAlertPrefsAction, initialState);
  const [prefs, setPrefs] = useState({ emailAlerts, pushAlerts });
  const [sending, startSend] = useTransition();
  const seen = useRef(state);

  useEffect(() => {
    if (state === seen.current) return;
    seen.current = state;
    if (state.ok) toast("ok", state.message ?? "Saved");
  }, [state]);

  const sendTest = () =>
    startSend(async () => {
      try {
        const res = await sendTestEmailAction();
        if (res.ok) toast("ok", "Test email sent", res.message);
        else toast("error", "Test email not sent", res.message);
      } catch {
        toast("error", "Couldn't reach the server", "Check your connection and try again.");
      }
    });

  return (
    <form action={save} className="grid gap-0">
      <ul className="m-0 list-none p-0">
        <li className="flex items-start gap-3 border-b border-line px-4 py-3">
          <input id="emailAlerts" name="emailAlerts" type="checkbox" className="check" checked={prefs.emailAlerts} onChange={(e) => setPrefs((p) => ({ ...p, emailAlerts: e.target.checked }))} />
          <label htmlFor="emailAlerts" className="cursor-pointer">
            <strong className="block font-semibold">Email</strong>
            <span className="prose-text text-sm text-fg-3">
              To <span className="font-mono text-fg-2">{email}</span>. Usually within a minute of the second failed check.
            </span>
          </label>
        </li>
        <li className="flex items-start gap-3 border-b border-line px-4 py-3">
          <input id="pushAlerts" name="pushAlerts" type="checkbox" className="check" checked={prefs.pushAlerts} onChange={(e) => setPrefs((p) => ({ ...p, pushAlerts: e.target.checked }))} />
          <label htmlFor="pushAlerts" className="cursor-pointer">
            <strong className="block font-semibold">Browser push</strong>
            <span className="prose-text text-sm text-fg-3">Sent to every device you&apos;ve enabled below.</span>
          </label>
        </li>
      </ul>
      <div className="grid gap-3 p-4">
        <p className="prose-text m-0 text-sm text-fg-3">
          You&apos;re alerted when a monitor fails 2 checks in a row, when it recovers (with how long it was down), and 14 days before an SSL
          certificate expires.
        </p>
        <FormMessage message={state.message} ok={state.ok} />
        <div className="flex flex-wrap gap-2">
          <SubmitButton variant="primary" pendingLabel="saving">
            save alert settings
          </SubmitButton>
          <button type="button" className="btn" onClick={sendTest} disabled={sending} aria-busy={sending}>
            {sending ? <span className="spinner" aria-hidden="true" /> : null}
            {sending ? "sending" : "send test email"}
          </button>
        </div>
      </div>
    </form>
  );
}
