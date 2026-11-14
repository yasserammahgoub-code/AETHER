import { useMemo, useState } from "react";
import { TREND_DAYS, TRENDS } from "../data/demo";
import { dayLabels } from "../lib/health";
import { TrendChart } from "./charts/TrendChart";
import { Icon } from "./ui/Icon";
import { Panel } from "./ui/Panel";

const RANGES = [3, 7, 14] as const;
type Range = (typeof RANGES)[number];

export function TrendsPanel() {
  const [range, setRange] = useState<Range>(7);
  const labels = useMemo(() => dayLabels(TREND_DAYS), []);

  return (
    <Panel className="flex flex-col p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-neon-cyan">
          <span className="text-ink">Health Trends</span> <span className="text-ink">(Last {range} Days)</span>
        </h2>
        <label className="relative">
          <span className="sr-only">Time range</span>
          <select
            value={range}
            onChange={(e) => setRange(Number(e.target.value) as Range)}
            className="cursor-pointer appearance-none rounded-lg border border-blue-400/40 bg-space-800/80 py-1.5 pl-3 pr-9 text-sm font-medium text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-neon-cyan/70"
          >
            {RANGES.map((r) => (
              <option key={r} value={r} className="bg-space-900">
                {r} Days
              </option>
            ))}
          </select>
          <Icon name="chevron" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink" />
        </label>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {TRENDS.map((s) => (
          <div key={s.id} className="panel-soft flex h-[185px] min-w-0 flex-col px-3 pb-2 pt-2.5 xl:h-auto xl:min-h-[180px]">
            <h3 className="mb-1 truncate text-[15px] font-medium text-ink">{s.title}</h3>
            <div className="min-h-0 flex-1">
              <TrendChart series={s} data={s.data.slice(-range)} labels={labels.slice(-range)} />
            </div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
