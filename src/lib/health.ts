import type { HealthStatus, LiveVitals } from "../types";

/** Acceptable ranges used for the overall-status banner. */
export const VITAL_RANGES = {
  hr: [50, 100],
  sys: [90, 130],
  dia: [60, 85],
  spo2: [95, 100],
  temp: [36.1, 37.2],
} as const;

export function countAlerts(v: LiveVitals): number {
  return (Object.keys(VITAL_RANGES) as (keyof typeof VITAL_RANGES)[]).filter((k) => {
    const [lo, hi] = VITAL_RANGES[k];
    return v[k] < lo || v[k] > hi;
  }).length;
}

export function overallStatus(alerts: number): HealthStatus {
  return alerts === 0 ? "green" : alerts === 1 ? "amber" : "red";
}

export function formatUtc(d: Date): string {
  const date = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
  const time = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(d);
  return `${date} • ${time} UTC`;
}

/** Labels like "Nov 7" for the last `n` days ending today. */
export function dayLabels(n: number, today = new Date()): string[] {
  const fmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (n - 1 - i));
    return fmt.format(d);
  });
}
