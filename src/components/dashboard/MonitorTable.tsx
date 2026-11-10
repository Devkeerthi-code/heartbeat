"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isTyping } from "@/components/shell/Shortcuts";
import { MonitorTableRow } from "./MonitorTableRow";
import type { MonitorRow } from "./types";

type Filter = "all" | "down" | "slow" | "up";

const FILTERS: Array<{ key: Filter; label: string }> = [
  { key: "all", label: "all" },
  { key: "down", label: "down" },
  { key: "slow", label: "slow" },
  { key: "up", label: "up" },
];

function matches(row: MonitorRow, filter: Filter, query: string): boolean {
  if (filter !== "all" && row.status !== filter) return false;
  return !query || `${row.name} ${row.host}`.toLowerCase().includes(query);
}

/** k9s-style table: filter tabs, "/" to search, j/k to move, Enter to open. */
export function MonitorTable({ rows }: { rows: MonitorRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(-1);
  const selectedRef = useRef(-1);
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const visible = useMemo(() => rows.filter((r) => matches(r, filter, query.trim().toLowerCase())), [rows, filter, query]);
  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: rows.length, down: 0, slow: 0, up: 0 };
    for (const r of rows) if (r.status === "down" || r.status === "slow" || r.status === "up") c[r.status] += 1;
    return c;
  }, [rows]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || document.querySelector("dialog[open]")) return;
      if (e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      const delta = e.key === "j" || e.key === "ArrowDown" ? 1 : e.key === "k" || e.key === "ArrowUp" ? -1 : 0;
      if (!delta || !visible.length) return;
      e.preventDefault();
      const cur = selectedRef.current;
      const next = cur < 0 ? (delta > 0 ? 0 : visible.length - 1) : Math.min(visible.length - 1, Math.max(0, cur + delta));
      selectedRef.current = next;
      setSelected(next);
      listRef.current?.querySelectorAll<HTMLAnchorElement>("a[data-row]")[next]?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible.length]);

  const select = (i: number) => {
    selectedRef.current = i;
    setSelected(i);
  };

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Filter by status" className="flex w-full border border-line-strong sm:w-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filter === f.key}
              onClick={() => {
                setFilter(f.key);
                select(-1);
              }}
              className="flex h-7 flex-1 cursor-pointer items-center justify-center gap-1.5 border-l border-line px-2.5 text-sm text-fg-2 first:border-l-0 aria-pressed:bg-fg aria-pressed:text-bg sm:flex-none"
            >
              {f.label} <span className="opacity-70">{counts[f.key]}</span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-[260px]">
          <span aria-hidden="true" className="absolute top-1.5 left-2.5 text-accent-ink">
            /
          </span>
          <label htmlFor="monitor-search" className="sr-only">
            Search monitors
          </label>
          <input
            ref={searchRef}
            id="monitor-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              select(-1);
            }}
            placeholder="search name or url"
            className="input h-[30px] pl-6 text-sm"
          />
        </div>
      </div>

      <div className="pane">
        <div aria-hidden="true" className="hidden h-[30px] grid-cols-[64px_minmax(0,2.2fr)_minmax(120px,1fr)_64px_64px_64px_84px] items-center gap-3 border-b border-line-strong bg-surface-2 px-4 text-xs tracking-[0.06em] text-fg-3 uppercase md:grid">
          <span>state</span>
          <span>name</span>
          <span>resp · last 36</span>
          <span className="text-right">24h</span>
          <span className="text-right">7d</span>
          <span className="text-right">30d</span>
          <span className="text-right">last</span>
        </div>
        <ul ref={listRef} className="m-0 list-none p-0">
          {visible.map((row, i) => (
            <MonitorTableRow key={row.id} row={row} selected={i === selected} />
          ))}
          {!visible.length ? (
            <li className="px-4 py-6 text-fg-3">
              grep: nothing matches {query ? `"${query}"` : `filter "${filter}"`}{" "}
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  setQuery("");
                  setFilter("all");
                }}
              >
                clear
              </button>
            </li>
          ) : null}
        </ul>
      </div>
    </div>
  );
}
