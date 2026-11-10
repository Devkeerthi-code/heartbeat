import type { BeatKind } from "@/components/ecg/trace";

/** UI-level state. "slow" is derived here only; the database knows PENDING / UP / DOWN. */
export type UiStatus = "up" | "slow" | "down" | "pending" | "paused";

export const STATUS_TAG: Record<UiStatus, string> = {
  up: "[ OK ]",
  slow: "[SLOW]",
  down: "[DOWN]",
  pending: "[ .. ]",
  paused: "[PAUS]",
};

export const STATUS_WORD: Record<UiStatus, string> = {
  up: "Up",
  slow: "Slow",
  down: "Down",
  pending: "Waiting for first check",
  paused: "Paused",
};

const SLOW_ABSOLUTE_MS = 2000;
const SLOW_FACTOR = 3;

export function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const hi = sorted[mid] ?? 0;
  return sorted.length % 2 ? hi : ((sorted[mid - 1] ?? hi) + hi) / 2;
}

type StatusInput = {
  status: "PENDING" | "UP" | "DOWN";
  paused: boolean;
  lastResponseMs: number | null;
  spark?: Array<{ ms: number | null; ok: boolean }>;
};

export function uiStatus(m: StatusInput): UiStatus {
  if (m.paused) return "paused";
  if (m.status === "DOWN") return "down";
  if (m.status === "PENDING") return "pending";
  const ms = m.lastResponseMs;
  if (ms === null) return "up";
  const typical = median((m.spark ?? []).flatMap((p) => (p.ok && p.ms !== null ? [p.ms] : [])));
  return ms > SLOW_ABSOLUTE_MS || (typical !== null && ms > typical * SLOW_FACTOR) ? "slow" : "up";
}

export function beatFor(s: UiStatus): BeatKind {
  if (s === "down") return "down";
  if (s === "slow") return "slow";
  if (s === "up") return "up";
  return "idle";
}

/** Uptime colour: under 99% is bad, under 99.9% is a warning. */
export function uptimeTone(pct: number | null): string {
  if (pct === null) return "text-fg-3";
  if (pct < 99) return "text-down";
  if (pct < 99.9) return "text-slow";
  return "";
}
