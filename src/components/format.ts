/** "just now", "4m ago", "3h ago", "2d ago". Computed on the server so HTML never mismatches. */
export function timeAgo(date: Date | null, now: Date): string {
  if (!date) return "never";
  const s = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** "11-10 14:02" in UTC — compact log timestamp. */
export function logStamp(date: Date): string {
  return date.toISOString().slice(5, 16).replace("T", " ");
}

/** "10 Nov 2026" in UTC. */
export function dayLabel(date: Date): string {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
}

export function msLabel(ms: number | null): string {
  if (ms === null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}
