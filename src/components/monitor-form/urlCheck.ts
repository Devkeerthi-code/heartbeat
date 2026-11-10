/**
 * Instant, friendly feedback while typing. The server re-validates everything (including DNS),
 * so this only has to catch the common mistakes early.
 */
export function urlProblem(raw: string): string | null {
  const value = raw.trim();
  if (!value) return "Paste the URL you want to watch, including https://";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "That isn't a valid URL. Include https://";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "Only http:// and https:// URLs can be monitored.";
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "169.254.169.254" || host.startsWith("metadata")) return "Cloud metadata addresses can't be monitored.";
  if (host === "localhost" || host.endsWith(".localhost") || host === "::1" || host === "0.0.0.0" || /^127\./.test(host)) {
    return "localhost only exists on your own computer. Deploy first, then paste the public URL (e.g. your-app.vercel.app).";
  }
  if (/^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host) || /\.(local|internal|lan)$/.test(host)) {
    return "Private and internal addresses (10.x, 192.168.x, *.local…) can't be reached from the internet.";
  }
  if (!host.includes(".") && !host.includes(":")) return "Use a public domain name, e.g. example.com.";
  return null;
}

export function nameFromUrl(raw: string): string {
  try {
    const host = new URL(raw.trim()).hostname.replace(/^www\./, "");
    return host.split(".")[0] ?? "";
  } catch {
    return "";
  }
}
