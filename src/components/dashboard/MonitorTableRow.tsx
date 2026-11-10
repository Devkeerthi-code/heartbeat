"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Sparkline } from "@/components/monitor/Sparkline";
import { StatusTag } from "@/components/monitor/StatusTag";
import { STATUS_WORD } from "@/components/monitor/status";
import type { MonitorRow } from "./types";

const UPTIME_AREA = ["md:[grid-area:u0]", "md:[grid-area:u1]", "md:[grid-area:u2]"];

const ROW_TINT: Record<string, string> = {
  down: "bg-[linear-gradient(90deg,var(--down-soft),transparent_60%)]",
  slow: "",
  up: "",
  pending: "",
  paused: "opacity-70",
};

/** One monitor. Glitches once (180ms) when a refresh flips it to DOWN. */
export function MonitorTableRow({ row, selected }: { row: MonitorRow; selected: boolean }) {
  const prev = useRef(row.status);
  const link = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const was = prev.current;
    prev.current = row.status;
    const el = link.current;
    if (!el || was === "down" || row.status !== "down") return;
    el.classList.add("glitch");
    const id = window.setTimeout(() => el.classList.remove("glitch"), 220);
    return () => window.clearTimeout(id);
  }, [row.status]);

  const label = `${row.name}, ${STATUS_WORD[row.status]}, last ${row.last}, 24 hour uptime ${row.uptime[0]?.text ?? "unknown"}`;
  return (
    <li className="border-b border-line last:border-b-0">
      <Link
        ref={link}
        href={`/monitors/${row.id}`}
        data-row
        aria-label={label}
        data-selected={selected}
        className={`grid grid-cols-[auto_minmax(0,1fr)_auto] [grid-template-areas:'st_name_ms'_'spark_spark_spark'_'up_up_up'] items-start gap-x-2 gap-y-1 px-3 py-2 no-underline transition-colors duration-[120ms] hover:bg-surface-2 focus-visible:bg-[var(--accent-soft)] focus-visible:shadow-[inset_2px_0_0_var(--accent-ink)] focus-visible:outline-none data-[selected=true]:bg-[var(--accent-soft)] data-[selected=true]:shadow-[inset_2px_0_0_var(--accent-ink)] md:min-h-12 md:grid-cols-[64px_minmax(0,2.2fr)_minmax(120px,1fr)_64px_64px_64px_84px] md:items-center md:gap-3 md:px-4 md:py-0 md:[grid-template-areas:'st_name_spark_u0_u1_u2_ms'] ${ROW_TINT[row.status]}`}
      >
        <span className="[grid-area:st]">
          <StatusTag status={row.status} />
        </span>
        <span className="min-w-0 [grid-area:name]">
          <strong className="flex flex-wrap items-center gap-x-2 font-semibold">
            {row.name}
            {row.sslDays !== null ? (
              <span className="text-xs font-normal text-slow" title={`SSL certificate expires in ${row.sslDays} days`}>
                ssl:{row.sslDays}d
              </span>
            ) : null}
          </strong>
          <span className="block truncate text-xs text-fg-3">{row.host}</span>
        </span>
        <span className="[grid-area:spark] md:max-w-[200px]">
          <Sparkline points={row.spark} status={row.status} />
        </span>
        {row.uptime.map((u, i) => (
          <span key={u.label} className={`hidden text-right font-medium md:block ${u.tone} ${UPTIME_AREA[i] ?? ""}`}>
            {u.text}
          </span>
        ))}
        <span className="flex gap-3 text-xs text-fg-3 [grid-area:up] md:hidden">
          {row.uptime.map((u) => (
            <span key={u.label}>
              {u.label} <b className={`font-medium text-fg-2 ${u.tone}`}>{u.text}</b>
            </span>
          ))}
        </span>
        <span className="text-right [grid-area:ms]">
          <span className={`block font-semibold ${row.status === "down" ? "text-down" : ""}`}>{row.last}</span>
          <span className="block text-xs text-fg-3">{row.lastSub}</span>
        </span>
      </Link>
    </li>
  );
}
