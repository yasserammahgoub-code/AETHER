export type VitalKey = "hr" | "bp" | "spo2" | "temp";
export type HealthStatus = "green" | "amber" | "red";

export interface LiveVitals {
  hr: number;
  sys: number;
  dia: number;
  spo2: number;
  temp: number;
}

export interface TrendSeries {
  id: string;
  title: string;
  color: string;
  kind: "line" | "area" | "bar";
  min: number;
  max: number;
  ticks: number[];
  unit: string;
  data: number[]; // 14 daily values, oldest -> newest
  tickLabel?: (v: number) => string;
  format: (v: number) => string;
}

export interface Mission {
  id: string;
  label: string;
  done: boolean;
}
