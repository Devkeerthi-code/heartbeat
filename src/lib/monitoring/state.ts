export const FAILURE_THRESHOLD = 2;

export type MonitorState = "PENDING" | "UP" | "DOWN";

export type StateInput = { status: MonitorState; consecutiveFailures: number };

export type Transition = {
  status: MonitorState;
  consecutiveFailures: number;
  /** Open an incident now (just crossed the failure threshold). */
  openIncident: boolean;
  /** Close the open incident now (first success after being DOWN). */
  closeIncident: boolean;
};

/**
 * The 2-failure rule: one failed check is treated as noise and only bumps the counter;
 * the monitor goes DOWN (and an incident opens) on the 2nd consecutive failure.
 */
export function nextState(prev: StateInput, checkOk: boolean): Transition {
  if (checkOk) {
    return {
      status: "UP",
      consecutiveFailures: 0,
      openIncident: false,
      closeIncident: prev.status === "DOWN",
    };
  }
  const failures = prev.consecutiveFailures + 1;
  const crossed = prev.status !== "DOWN" && failures >= FAILURE_THRESHOLD;
  return {
    status: crossed || prev.status === "DOWN" ? "DOWN" : prev.status,
    consecutiveFailures: failures,
    openIncident: crossed,
    closeIncident: false,
  };
}

export function incidentDurationSec(startedAt: Date, resolvedAt: Date): number {
  return Math.max(0, Math.round((resolvedAt.getTime() - startedAt.getTime()) / 1000));
}
