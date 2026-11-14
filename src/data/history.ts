import type { History } from "../lib/checker/types";
import { TRENDS } from "./demo";

const series = (id: string) => TRENDS.find((t) => t.id === id)!.data;

/**
 * 14 days of prior daily values per parameter (canonical units, oldest -> newest), illustrative.
 * Heart rate, systolic pressure and sleep reuse the dashboard's trend charts so both views agree;
 * the rest are demo series. In a real build this would come from the health-records store.
 */
export const DEMO_HISTORY: History = {
  hr: { value: series("hr") },
  bp: {
    sys: series("bp"),
    dia: [76, 77, 75, 78, 76, 77, 76, 75, 78, 76, 77, 76, 75, 76],
  },
  glucose: { value: [88, 91, 89, 93, 90, 87, 92, 90, 94, 89, 91, 95, 92, 90] },
  spo2: { value: [98, 98, 97, 98, 99, 98, 98, 97, 98, 98, 99, 98, 98, 98] },
  temp: { value: [36.6, 36.5, 36.6, 36.7, 36.6, 36.5, 36.6, 36.6, 36.7, 36.6, 36.5, 36.6, 36.6, 36.6] },
  sleep: { value: series("sleep") },
  resp: { value: [15, 14, 15, 16, 15, 15, 14, 15, 16, 15, 15, 14, 15, 15] },
};
