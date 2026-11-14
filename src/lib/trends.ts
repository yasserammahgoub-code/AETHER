import { DEMO_HISTORY } from "../data/history";
import type { LiveVitals } from "../types";
import { getUnit } from "./checker/engine";
import type { CheckState, ParameterId, ParameterRule } from "./checker/types";

/**
 * Data behind the dashboard's Health Trends graph.
 *
 * What is real and what is illustrative (the project has no intra-day store yet):
 *  - 7d   : the 7 most recent daily values of `DEMO_HISTORY` (the same history the Parameter Checker uses).
 *  - 24h / 1h : the repo only holds daily history, so the in-between points are a deterministic, bounded
 *               curve around that history (centred on its recent mean, spread = its own variability).
 *               Replace `intradayValue` with a query against the health-records store when one exists.
 *  - Live telemetry (HR, BP, SpO₂, temperature) always supplies the newest point on 1h / 24h.
 *  - Every Parameter Checker run is plotted at the time it was run, coloured by its result.
 * Sleep is a nightly value, so it shows the last 7 nights whatever range is selected.
 */

export type TimeRange = "1h" | "24h" | "7d";
export const TIME_RANGES: readonly TimeRange[] = ["1h", "24h", "7d"];

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

export interface TrendPoint {
  t: number;
  /** Value in the display unit. */
  v: number;
  source: "history" | "live" | "check";
  state?: CheckState;
}

export interface TrendLine {
  key: string;
  label: string;
  points: TrendPoint[];
}

export interface TrendTick {
  t: number;
  label: string;
}

export interface TrendSeries {
  lines: TrendLine[];
  unitLabel: string;
  decimals: number;
  xMin: number;
  xMax: number;
  xTicks: TrendTick[];
  yMin: number;
  yMax: number;
  yTicks: number[];
  /** Day-level axis (7d, and sleep on every range); otherwise the axis is clock time in UTC. */
  daily: boolean;
  /** Shown under the graph when the range had to be adapted (e.g. sleep). */
  note: string | null;
}

/** A Parameter Checker run, in canonical units, as the graph needs it. */
export interface RecordedCheck {
  at: number;
  state: CheckState;
  values: Record<string, number>;
}

const LIVE_KEYS: Partial<Record<ParameterId, Record<string, keyof LiveVitals>>> = {
  hr: { value: "hr" },
  bp: { sys: "sys", dia: "dia" },
  spo2: { value: "spo2" },
  temp: { value: "temp" },
};

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;
const std = (a: number[]) => {
  const m = mean(a);
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)));
};
const seedOf = (id: string) => [...id].reduce((s, c) => s + c.charCodeAt(0), 0);

/** Deterministic value `k` steps before now (k = 0 is now), around the recent history. */
export function intradayValue(history: number[], k: number, seed: number, min: number, max: number, decimals: number): number {
  const base = mean(history.slice(-3));
  const spread = std(history) || Math.abs(base) * 0.01 || 0.1;
  const amp = spread * 0.8;
  const v = base + amp * (0.65 * Math.sin(k * 0.75 + seed) + 0.35 * Math.sin(k * 1.9 + seed * 2.1));
  const clamped = Math.min(max, Math.max(min, v));
  const f = 10 ** decimals;
  return Math.round(clamped * f) / f;
}

/** Round axis bounds and ticks to friendly numbers. */
export function niceScale(min: number, max: number, target = 5): { lo: number; hi: number; ticks: number[] } {
  if (!(max > min)) {
    const d = Math.abs(min) * 0.05 || 1;
    min -= d;
    max += d;
  }
  const pad = (max - min) * 0.12;
  min -= pad;
  max += pad;
  const raw = (max - min) / (target - 1);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toFixed(10)));
  return { lo: ticks[0], hi: ticks[ticks.length - 1], ticks };
}

const timeFmt = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "UTC" });
const dayFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

export function formatPointTime(t: number, daily: boolean): string {
  return daily ? dayFmt.format(t) : `${timeFmt.format(t)} UTC`;
}

interface Args {
  rule: ParameterRule;
  unitId: string;
  range: TimeRange;
  now: number;
  live: LiveVitals;
  checks: RecordedCheck[];
}

export function buildTrendSeries({ rule, unitId, range, now, live, checks }: Args): TrendSeries {
  const unit = getUnit(rule, unitId);
  const decimals = unit.decimals ?? rule.components[0].decimals;
  const seed = seedOf(rule.id);
  const liveKeys = LIVE_KEYS[rule.id];
  const nightly = rule.id === "sleep";
  const span = range === "1h" ? HOUR : DAY;

  // Checks that fall inside the window; the axis ends at the newest of them if it is later than `now`.
  const windowStart = nightly || range === "7d" ? now - 7 * DAY : now - span;
  const inWindow = checks.filter((c) => c.at >= windowStart && c.state !== "unavailable");
  const end = Math.max(now, ...inWindow.map((c) => c.at));

  const lines: TrendLine[] = rule.components.map((comp) => {
    const hist = DEMO_HISTORY[rule.id][comp.key];
    const pts: TrendPoint[] = [];

    if (nightly || range === "7d") {
      hist.slice(-7).forEach((v, i, a) => pts.push({ t: end - (a.length - 1 - i) * DAY, v, source: "history" }));
    } else {
      const step = range === "1h" ? 5 * MIN : 2 * HOUR;
      for (let j = 12; j >= 1; j--) {
        const v = intradayValue(hist, j, seed, comp.plausible.min, comp.plausible.max, comp.decimals);
        pts.push({ t: end - j * step, v, source: "history" });
      }
      const liveKey = liveKeys?.[comp.key];
      pts.push(
        liveKey
          ? { t: end, v: live[liveKey], source: "live" }
          : { t: end, v: intradayValue(hist, 0, seed, comp.plausible.min, comp.plausible.max, comp.decimals), source: "history" },
      );
    }

    for (const c of inWindow) {
      const v = c.values[comp.key];
      if (v !== undefined) pts.push({ t: c.at, v, source: "check", state: c.state });
    }

    pts.sort((a, b) => a.t - b.t);
    return {
      key: comp.key,
      label: comp.label,
      points: pts.map((p) => ({ ...p, v: unit.fromCanonical(p.v) })),
    };
  });

  const all = lines.flatMap((l) => l.points.map((p) => p.v));
  const y = niceScale(Math.min(...all), Math.max(...all));

  let xMin: number;
  let xTicks: TrendTick[];
  if (nightly || range === "7d") {
    xMin = end - 6 * DAY;
    xTicks = Array.from({ length: 7 }, (_, i) => {
      const t = xMin + i * DAY;
      return { t, label: dayFmt.format(t) };
    });
  } else {
    xMin = end - span;
    xTicks = Array.from({ length: 5 }, (_, i) => {
      const t = xMin + (i * span) / 4;
      return { t, label: i === 4 ? "Now" : timeFmt.format(t) };
    });
  }

  return {
    lines,
    unitLabel: unit.label,
    decimals,
    xMin,
    xMax: end,
    xTicks,
    yMin: y.lo,
    yMax: y.hi,
    yTicks: y.ticks,
    daily: nightly || range === "7d",
    note: nightly && range !== "7d" ? "Sleep is logged nightly, so every range shows the last 7 nights." : null,
  };
}
