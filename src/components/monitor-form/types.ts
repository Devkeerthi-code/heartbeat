export type MonitorFormValues = {
  name: string;
  url: string;
  method: "GET" | "HEAD" | "POST";
  expectedStatus: string;
  keyword: string;
  timeoutSeconds: string;
  intervalMinutes: "5" | "10" | "30" | "60";
  checkSsl: boolean;
};

export const DEFAULT_VALUES: MonitorFormValues = {
  name: "",
  url: "",
  method: "GET",
  expectedStatus: "200",
  keyword: "",
  timeoutSeconds: "10",
  intervalMinutes: "5",
  checkSsl: true,
};

export const INTERVALS = ["5", "10", "30", "60"] as const;
