import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isPrivateAddress } from "./ssrf";

/**
 * Save-time feedback only ("this hostname points at a private IP"). The real enforcement is
 * in the checker's connect-time lookup, because DNS can change after the monitor is saved.
 */
export async function hostnameResolvesPrivate(hostname: string, timeoutMs = 3000): Promise<boolean> {
  if (isIP(hostname)) return isPrivateAddress(hostname);
  const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  const answers = await Promise.race([lookup(hostname, { all: true }).catch(() => null), timeout]);
  return Boolean(answers?.some((a) => isPrivateAddress(a.address)));
}
