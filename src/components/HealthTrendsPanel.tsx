import { useMemo, useState } from "react";
import type { ParameterChecker } from "../hooks/useParameterChecker";
import { buildTrendSeries, TIME_RANGES, type RecordedCheck, type TimeRange } from "../lib/trends";
import type { LiveVitals } from "../types";
import { HealthTrendChart } from "./charts/HealthTrendChart";
import { PARAM_NAME } from "./checker/state";
import { Icon } from "./ui/Icon";
import { Panel } from "./ui/Panel";

interface Props {
  checker: ParameterChecker;
  live: LiveVitals;
  now: Date;
}

/** The dashboard's main graph: follows the parameter chosen in the Parameter Checker. */
export function HealthTrendsPanel({ checker, live, now }: Props) {
  const { rule, paramId, runs, form } = checker;
  const [range, setRange] = useState<TimeRange>("24h");

  // Every check run this session is a recorded measurement for its parameter.
  const checks = useMemo<RecordedCheck[]>(() => {
    const r = runs[paramId];
    if (!r || r.result.evaluations.length === 0) return [];
    return [
      {
        at: r.at,
        state: r.result.state,
        values: Object.fromEntries(r.result.evaluations.map((e) => [e.key, e.value])),
      },
    ];
  }, [runs, paramId]);

  const nowMs = now.getTime();
  const series = useMemo(
    () => buildTrendSeries({ rule, unitId: form.unitId, range, now: nowMs, live, checks }),
    [rule, form.unitId, range, nowMs, live, checks],
  );

  const note = [series.note, series.daily ? null : "Times in UTC."].filter(Boolean).join(" ");

  return (
    <Panel className="flex min-h-[340px] flex-1 flex-col p-4 sm:p-5">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Icon name="activity" className="h-8 w-8 shrink-0 text-neon-blue" strokeWidth={1.8} />
          <h2 className="truncate text-2xl font-semibold tracking-tight text-ink">{PARAM_NAME[paramId]}</h2>
        </div>

        <div role="group" aria-label="Time range" className="flex rounded-full border border-blue-400/40 bg-space-900/70 p-1">
          {TIME_RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              aria-pressed={range === r}
              className={`min-w-[56px] rounded-full px-4 py-1.5 text-[15px] font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/80 ${
                range === r ? "bg-blue-500 text-white shadow-[0_0_14px_rgba(59,130,246,0.6)]" : "text-ink/85 hover:bg-space-700/60"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <HealthTrendChart title={PARAM_NAME[paramId]} series={series} />
      </div>

      <p className="mt-1 text-xs text-mute">
        {note && <>{note} </>}
        Illustrative demo history; live readings and your checks are added as they arrive.
      </p>
    </Panel>
  );
}
