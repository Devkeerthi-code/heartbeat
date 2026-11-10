import { EcgTrace } from "@/components/ecg/EcgTrace";
import { beatFor, type UiStatus } from "@/components/monitor/status";
import { CronCountdown } from "@/components/shell/CronCountdown";

/** Bedside-monitor strip: one beat per monitor (worst first) next to the numbers panel. */
export function Vitals({ statuses }: { statuses: UiStatus[] }) {
  const up = statuses.filter((s) => s === "up" || s === "slow").length;
  const active = statuses.filter((s) => s !== "paused").length;
  return (
    <div className="vitals crt grid md:grid-cols-[minmax(0,1fr)_240px]">
      <div className="order-2 min-w-0 md:order-1">
        <EcgTrace beats={statuses.map(beatFor)} height={104} />
      </div>
      <div className="relative z-[1] order-1 flex items-center justify-between gap-2 border-b border-line-strong bg-surface px-3 py-2 md:order-2 md:flex-col md:items-stretch md:border-b-0 md:border-l md:px-4 md:py-3">
        <div>
          <span className="block text-xs tracking-[0.06em] text-fg-3 uppercase">1 beat = 1 monitor</span>
          <p className="m-0 text-[28px]/[32px] font-bold tracking-[-0.05em] md:text-2xl">
            {up}/{active}
            <small className="ml-1.5 text-sm font-medium tracking-normal text-fg-2">up</small>
          </p>
        </div>
        <div className="flex flex-col items-end text-xs text-fg-3 md:flex-row md:items-baseline md:justify-between">
          <span>next check run</span>
          <CronCountdown className="text-base text-fg" />
        </div>
      </div>
    </div>
  );
}
