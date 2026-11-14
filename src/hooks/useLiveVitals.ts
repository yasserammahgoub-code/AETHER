import { useEffect, useState } from "react";
import type { LiveVitals } from "../types";

const HISTORY = 20;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const step = (v: number, d: number, lo: number, hi: number) => clamp(v + (Math.random() * 2 - 1) * d, lo, hi);

const START: LiveVitals = { hr: 68, sys: 118, dia: 76, spo2: 98, temp: 36.6 };

// Deterministic seed history so the sparklines look alive on first paint.
const seed = (base: number, amp: number) =>
  Array.from({ length: HISTORY }, (_, i) => base + Math.sin(i * 0.9) * amp + Math.cos(i * 1.7) * amp * 0.5);

export interface LiveState {
  current: LiveVitals;
  history: Record<keyof LiveVitals, number[]>;
}

/** Simulated telemetry stream: small bounded random walk every few seconds. */
export function useLiveVitals(intervalMs = 2500): LiveState {
  const [state, setState] = useState<LiveState>({
    current: START,
    history: {
      hr: seed(START.hr, 2),
      sys: seed(START.sys, 1.5),
      dia: seed(START.dia, 1),
      spo2: seed(START.spo2, 0.5),
      temp: seed(START.temp, 0.04),
    },
  });

  useEffect(() => {
    const id = window.setInterval(() => {
      setState((prev) => {
        const c = prev.current;
        const next: LiveVitals = {
          hr: Math.round(step(c.hr, 2, 62, 74)),
          sys: Math.round(step(c.sys, 1.5, 114, 123)),
          dia: Math.round(step(c.dia, 1, 73, 80)),
          spo2: Math.round(step(c.spo2, 0.8, 97, 99)),
          temp: Math.round(step(c.temp, 0.04, 36.5, 36.8) * 10) / 10,
        };
        const push = (arr: number[], v: number) => [...arr.slice(1), v];
        return {
          current: next,
          history: {
            hr: push(prev.history.hr, next.hr),
            sys: push(prev.history.sys, next.sys),
            dia: push(prev.history.dia, next.dia),
            spo2: push(prev.history.spo2, next.spo2),
            temp: push(prev.history.temp, next.temp),
          },
        };
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return state;
}
