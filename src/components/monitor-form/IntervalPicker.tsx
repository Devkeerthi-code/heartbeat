import { Fragment } from "react";
import { FieldError } from "@/components/ui/FieldError";
import { INTERVALS, type MonitorFormValues } from "./types";

type Props = { value: MonitorFormValues["intervalMinutes"]; onChange: (v: MonitorFormValues["intervalMinutes"]) => void; error?: string };

/** Segmented 5 / 10 / 30 / 60 minute choice, built on real radio buttons. */
export function IntervalPicker({ value, onChange, error }: Props) {
  return (
    <fieldset className="field m-0 min-w-0 border-0 p-0" aria-describedby={error ? "interval-err" : undefined}>
      <legend className="field-label mb-1.5 p-0">check every</legend>
      <div className="seg">
        {INTERVALS.map((m) => (
          <Fragment key={m}>
            <input type="radio" id={`interval-${m}`} name="intervalMinutes" value={m} checked={value === m} onChange={() => onChange(m)} />
            <label htmlFor={`interval-${m}`}>{m}m</label>
          </Fragment>
        ))}
      </div>
      <FieldError id="interval-err" message={error} />
    </fieldset>
  );
}
