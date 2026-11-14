import type { Mission, TrendSeries } from "../types";

/** 14 days of illustrative demo telemetry, oldest -> newest. */
export const TREND_DAYS = 14;

const f1 = (v: number) => v.toFixed(1);
const f2 = (v: number) => v.toFixed(2);
const int = (v: number) => String(Math.round(v));

export const TRENDS: TrendSeries[] = [
  {
    id: "hr",
    title: "Heart Rate (BPM)",
    color: "#38bdf8",
    kind: "area",
    min: 40,
    max: 100,
    ticks: [40, 60, 80, 100],
    unit: "BPM",
    data: [72, 74, 71, 75, 73, 70, 74, 76, 72, 75, 69, 73, 72, 68],
    format: int,
  },
  {
    id: "sleep",
    title: "Sleep Duration (h)",
    color: "#a78bfa",
    kind: "area",
    min: 4,
    max: 10,
    ticks: [4, 6, 8, 10],
    unit: "h",
    // last three days trend downward: 7.6 -> 6.1 (−1.5 h)
    data: [7.2, 7.4, 7.1, 7.5, 7.3, 7.0, 7.4, 7.2, 7.5, 7.3, 7.1, 7.6, 6.9, 6.1],
    format: f1,
  },
  {
    id: "stress",
    title: "Stress Level",
    color: "#fbbf24",
    kind: "area",
    min: 0.6,
    max: 3.2,
    ticks: [1, 2, 3],
    unit: "",
    data: [1.5, 1.6, 1.4, 1.7, 1.6, 1.5, 1.7, 1.8, 1.6, 1.8, 1.9, 2.1, 2.4, 2.3],
    tickLabel: (v) => (v === 1 ? "Low" : v === 2 ? "Med" : v === 3 ? "High" : ""),
    format: (v) => (v < 1.67 ? "Low" : v < 2.34 ? "Medium" : "High"),
  },
  {
    id: "bp",
    title: "Blood Pressure (mmHg)",
    color: "#34d399",
    kind: "area",
    min: 60,
    max: 140,
    ticks: [60, 100, 140],
    unit: "mmHg",
    data: [117, 119, 118, 121, 117, 120, 118, 119, 122, 117, 119, 120, 118, 118],
    format: (v) => `${Math.round(v)} systolic`,
  },
  {
    id: "exercise",
    title: "Exercise (min/day)",
    color: "#0ea5e9",
    kind: "bar",
    min: 0,
    max: 60,
    ticks: [0, 30, 60],
    unit: "min",
    data: [34, 38, 30, 45, 41, 36, 29, 33, 42, 36, 48, 39, 54, 41],
    format: int,
  },
  {
    id: "radiation",
    title: "Radiation Exposure (mSv)",
    color: "#a855f7",
    kind: "bar",
    min: 0,
    max: 1,
    ticks: [0, 0.5, 1],
    unit: "mSv",
    data: [0.18, 0.22, 0.2, 0.3, 0.26, 0.17, 0.24, 0.35, 0.2, 0.42, 0.37, 0.44, 0.4, 0.5],
    tickLabel: f1,
    format: f2,
  },
];

export const INITIAL_MISSIONS: Mission[] = [
  { id: "exercise", label: "Exercise Session", done: true },
  { id: "hydration", label: "Hydration Check", done: true },
  { id: "sleep", label: "Sleep Log", done: true },
  { id: "mood", label: "Mood Check-in", done: false },
  { id: "nutrition", label: "Nutrition Review", done: false },
  { id: "measure", label: "Measurements", done: true },
];

export const NAV_ITEMS = [
  { id: "analytics", label: "Health Analytics", icon: "chart" },
  { id: "parameter", label: "Parameter Checker", icon: "sliders" },
  { id: "emergency", label: "Emergency Mode", icon: "alert", danger: true },
  { id: "missions", label: "Daily Missions", icon: "calendarCheck" },
] as const;

export type NavId = (typeof NAV_ITEMS)[number]["id"];
