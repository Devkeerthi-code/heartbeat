"use client";

import { useState } from "react";
import { deleteMonitorAction } from "@/app/actions/monitors";
import { SubmitButton } from "@/components/ui/SubmitButton";

/** Two-step delete: the first click arms it, the second actually deletes. */
export function DeleteMonitor({ monitorId, name }: { monitorId: string; name: string }) {
  const [armed, setArmed] = useState(false);
  if (!armed) {
    return (
      <button type="button" className="btn btn-danger" onClick={() => setArmed(true)}>
        delete monitor
      </button>
    );
  }
  return (
    <form action={deleteMonitorAction} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="monitorId" value={monitorId} />
      <span className="text-sm text-down">Delete {name} for good?</span>
      <SubmitButton variant="danger" pendingLabel="deleting" className="border-down text-down">
        yes, delete
      </SubmitButton>
      <button type="button" className="btn btn-ghost" onClick={() => setArmed(false)}>
        keep it
      </button>
    </form>
  );
}
