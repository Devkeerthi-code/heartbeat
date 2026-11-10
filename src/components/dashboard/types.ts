import type { UiStatus } from "@/components/monitor/status";

/** Serializable row the server prepares for the client-side monitor table. */
export type MonitorRow = {
  id: string;
  name: string;
  host: string;
  status: UiStatus;
  uptime: Array<{ label: string; text: string; tone: string }>;
  spark: Array<{ ms: number | null; ok: boolean }>;
  last: string;
  lastSub: string;
  sslDays: number | null;
};
