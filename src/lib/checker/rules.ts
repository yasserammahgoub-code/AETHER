import type { ComponentRule, ParameterRule, RuleSet, UnitOption } from "./types";

/**
 * AETHER illustrative rule set (prototype).
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ Every number in this file is ILLUSTRATIVE. They are generic, rounded adult   │
 * │ reference-style values chosen to demonstrate the checker's behaviour. They   │
 * │ are NOT clinically validated, NOT mission-specific, and NOT medical advice.  │
 * │ Replace this object with a flight-surgeon-approved rule set (status:         │
 * │ "approved") before any operational use. The engine and UI need no changes.   │
 * └──────────────────────────────────────────────────────────────────────────────┘
 */

const identity = (v: number) => v;
const same = (id: string, label: string): UnitOption => ({ id, label, toCanonical: identity, fromCanonical: identity });

const MGDL_PER_MMOLL = 18.016;

function single(c: Omit<ComponentRule, "key" | "label"> & { label: string }): ComponentRule {
  return { key: "value", ...c };
}

const HR: ParameterRule = {
  id: "hr",
  label: "Heart Rate (BPM)",
  shortLabel: "Heart rate",
  unit: "BPM",
  units: [same("bpm", "BPM")],
  placeholder: "e.g. 72",
  defaultBaseline: "72",
  note: "Resting heart rate. Not valid right after exertion.",
  components: [
    single({
      label: "Heart rate",
      bands: { default: { green: [50, 100], red: { below: 40, above: 120 } } },
      plausible: { min: 20, max: 250 },
      baseline: { mode: "pct", yellowAt: 20 },
      trend: { minChange: 8 },
      decimals: 0,
    }),
  ],
  quality: [
    {
      id: "rested",
      label: "At rest (seated or lying) for at least 5 minutes",
      severity: "blocking",
      fix: "Rest quietly for 5 minutes, then measure again.",
    },
    {
      id: "signal",
      label: "Sensor reports a good, stable signal",
      severity: "caveat",
      fix: "Re-seat the sensor and repeat until the signal indicator is stable.",
    },
  ],
  advice: {
    low: [
      "Sit or lie down and recheck after 5 minutes of rest.",
      "Note any dizziness, light-headedness or fainting.",
      "Contact mission medical support if low readings persist or you feel unwell.",
    ],
    high: [
      "Rest quietly for 5–10 minutes, then recheck.",
      "Review recent exertion, caffeine, stress, hydration and cabin CO₂.",
      "Contact mission medical support if it stays high at rest or you notice chest pain or palpitations.",
    ],
    trend: [
      "Review sleep, workload and hydration over the last few days.",
      "Recheck at the next scheduled check and compare with your baseline.",
    ],
  },
};

const BP: ParameterRule = {
  id: "bp",
  label: "Blood Pressure (mmHg)",
  shortLabel: "Blood pressure",
  unit: "mmHg",
  units: [same("mmhg", "mmHg")],
  placeholder: "e.g. 118/76",
  defaultBaseline: "118/76",
  note: "Enter as systolic/diastolic. The worse of the two decides the state.",
  components: [
    {
      key: "sys",
      label: "Systolic pressure",
      bands: { default: { green: [90, 130], red: { below: 80, above: 160 } } },
      plausible: { min: 50, max: 260 },
      baseline: { mode: "pct", yellowAt: 10 },
      trend: { minChange: 8 },
      decimals: 0,
    },
    {
      key: "dia",
      label: "Diastolic pressure",
      bands: { default: { green: [60, 85], red: { below: 50, above: 100 } } },
      plausible: { min: 30, max: 160 },
      baseline: { mode: "pct", yellowAt: 12 },
      trend: { minChange: 6 },
      decimals: 0,
    },
  ],
  quality: [
    {
      id: "rested",
      label: "Seated, back supported, rested at least 5 minutes, no talking",
      severity: "blocking",
      fix: "Sit quietly for 5 minutes with your arm supported, then measure again.",
    },
    {
      id: "cuff",
      label: "Cuff correctly sized and at heart level",
      severity: "caveat",
      fix: "Check cuff size and position, then repeat the measurement.",
    },
  ],
  advice: {
    low: [
      "Sit or lie down and recheck after 5 minutes of rest.",
      "Stand up slowly and note any dizziness or fainting.",
      "Contact mission medical support if low readings persist or you feel unwell.",
    ],
    high: [
      "Rest quietly for 5–10 minutes, then recheck on the same arm.",
      "Review recent exertion, caffeine, stress and sodium intake.",
      "Contact mission medical support if it stays high on repeat checks or you have headache, vision changes or chest pain.",
    ],
    trend: [
      "Review sleep, workload, hydration and diet over the last few days.",
      "Take readings at the same time each day to make the trend clearer.",
    ],
  },
};

const GLUCOSE: ParameterRule = {
  id: "glucose",
  label: "Blood Glucose",
  shortLabel: "Blood glucose",
  unit: "mg/dL",
  units: [
    { ...same("mgdl", "mg/dL"), decimals: 0 },
    {
      id: "mmoll",
      label: "mmol/L",
      toCanonical: (v) => v * MGDL_PER_MMOLL,
      fromCanonical: (v) => v / MGDL_PER_MMOLL,
      decimals: 1,
    },
  ],
  contexts: [
    { id: "fasting", label: "Fasting (8 h or more)" },
    { id: "postmeal", label: "About 2 h after a meal" },
  ],
  defaultContext: "fasting",
  placeholder: "e.g. 92",
  defaultBaseline: "90",
  note: "Different reference bands apply for fasting and post-meal readings.",
  components: [
    single({
      label: "Blood glucose",
      bands: {
        fasting: { green: [70, 100], red: { below: 54, above: 180 } },
        postmeal: { green: [70, 140], red: { below: 54, above: 250 } },
      },
      plausible: { min: 20, max: 600 },
      baseline: { mode: "pct", yellowAt: 20 },
      trend: { minChange: 12 },
      decimals: 0,
    }),
  ],
  quality: [
    {
      id: "timing",
      label: "Timing matches the selected context (fasting or post-meal)",
      severity: "blocking",
      fix: "Choose the context that matches when you last ate, or measure again at the right time.",
    },
    {
      id: "device",
      label: "Meter and strips in date and passed their control check",
      severity: "blocking",
      fix: "Run the control check or replace expired strips, then measure again.",
    },
    {
      id: "sample",
      label: "Hands clean and dry, adequate sample",
      severity: "caveat",
      fix: "Wash and dry hands, then repeat with a fresh strip.",
    },
  ],
  advice: {
    low: [
      "Follow the mission low-glucose protocol.",
      "Recheck after treatment as the protocol directs.",
      "Contact mission medical support if it does not recover or you feel confused, shaky or faint.",
    ],
    high: [
      "Confirm the context (fasting or post-meal) and recheck.",
      "Review recent meals, stress and activity.",
      "Contact mission medical support if repeat readings stay high or you feel unwell.",
    ],
    trend: [
      "Review meal timing, activity and sleep over the last few days.",
      "Log readings at consistent times so the trend is comparable.",
    ],
  },
};

const SPO2: ParameterRule = {
  id: "spo2",
  label: "Blood Oxygen SpO₂ (%)",
  shortLabel: "Blood oxygen (SpO₂)",
  unit: "%",
  units: [same("pct", "%")],
  placeholder: "e.g. 98",
  defaultBaseline: "98",
  note: "A pulse-oximeter reading cannot exceed 100%.",
  components: [
    single({
      label: "SpO₂",
      bands: { default: { green: [95, 100], red: { below: 90, above: Number.POSITIVE_INFINITY } } },
      plausible: { min: 50, max: 100 },
      baseline: { mode: "abs", yellowAt: 2 },
      trend: { minChange: 1.5 },
      decimals: 0,
    }),
  ],
  quality: [
    {
      id: "signal",
      label: "Sensor shows a stable waveform / good signal",
      severity: "blocking",
      fix: "Keep still, re-seat the sensor and wait for a stable signal before reading.",
    },
    {
      id: "contact",
      label: "Warm, still fingertip with no nail polish",
      severity: "caveat",
      fix: "Warm the hand, remove nail polish and repeat on another finger.",
    },
  ],
  advice: {
    low: [
      "Sit upright, breathe normally and recheck within a few minutes.",
      "Check cabin CO₂ and ventilation status.",
      "Contact mission medical support if it stays low or you feel short of breath.",
    ],
    high: ["Recheck the sensor placement; readings cannot exceed 100%."],
    trend: [
      "Check sensor placement and cabin CO₂ trend.",
      "Recheck at the next scheduled check and compare with your baseline.",
    ],
  },
};

const C_TO_F = (c: number) => (c * 9) / 5 + 32;
const F_TO_C = (f: number) => ((f - 32) * 5) / 9;

const TEMP: ParameterRule = {
  id: "temp",
  label: "Body Temperature (°C)",
  shortLabel: "Body temperature",
  unit: "°C",
  units: [
    { ...same("c", "°C"), decimals: 1 },
    { id: "f", label: "°F", toCanonical: F_TO_C, fromCanonical: C_TO_F, decimals: 1 },
  ],
  placeholder: "e.g. 36.6",
  defaultBaseline: "36.6",
  note: "Use the same measurement method as your baseline.",
  components: [
    single({
      label: "Body temperature",
      bands: { default: { green: [36.1, 37.2], red: { below: 35, above: 38 } } },
      plausible: { min: 32, max: 43 },
      baseline: { mode: "abs", yellowAt: 0.5 },
      trend: { minChange: 0.4 },
      decimals: 1,
    }),
  ],
  quality: [
    {
      id: "placement",
      label: "Sensor correctly placed and the reading completed",
      severity: "blocking",
      fix: "Reposition the sensor and wait for the completion signal, then measure again.",
    },
    {
      id: "recent",
      label: "No hot/cold drink, exercise or heat exposure in the last 15 minutes",
      severity: "caveat",
      fix: "Wait 15 minutes and repeat the measurement.",
    },
  ],
  advice: {
    low: [
      "Warm up, then recheck after 15 minutes.",
      "Check the sensor placement and your clothing/thermal comfort.",
      "Contact mission medical support if it stays low or you feel unwell.",
    ],
    high: [
      "Rest, hydrate and recheck after 15 minutes.",
      "Check cabin temperature, recent exercise and thermal load.",
      "Contact mission medical support if it persists or you have chills, aches or other symptoms.",
    ],
    trend: [
      "Check cabin temperature and recent activity patterns.",
      "Recheck at the next scheduled check and compare with your baseline.",
    ],
  },
};

const SLEEP: ParameterRule = {
  id: "sleep",
  label: "Sleep Duration (h)",
  shortLabel: "Sleep duration",
  unit: "h",
  units: [same("h", "h")],
  placeholder: "e.g. 7.2",
  defaultBaseline: "7.2",
  note: "Total sleep for the most recent night, in hours.",
  remeasure: {
    now: "Check the sleep log for errors before acting on this value.",
    later: "Re-run this check after tonight's sleep to see whether it recovers.",
  },
  components: [
    single({
      label: "Sleep duration",
      bands: { default: { green: [6.5, 9], red: { below: 4.5, above: 11 } } },
      plausible: { min: 0, max: 24 },
      baseline: { mode: "pct", yellowAt: 15 },
      trend: { minChange: 0.6 },
      decimals: 1,
    }),
  ],
  quality: [
    {
      id: "complete",
      label: "Tracker worn / log covers the whole sleep period",
      severity: "blocking",
      fix: "Complete the sleep log for the full night, or enter the total once the tracker data is available.",
    },
    {
      id: "naps",
      label: "Naps and long awakenings accounted for",
      severity: "caveat",
      fix: "Review the log for naps and long awakenings and update the total.",
    },
  ],
  advice: {
    low: [
      "Aim for at least 7 hours of sleep tonight.",
      "Reduce screen time and bright light before bed; keep the sleep period consistent.",
      "Contact support if short sleep continues for several nights.",
    ],
    high: [
      "Check for illness, fatigue or sleep-schedule disruption.",
      "Contact support if long sleep continues for several nights.",
    ],
    trend: [
      "Keep a consistent sleep schedule and limit screens before bed.",
      "Contact support if the downward trend continues.",
    ],
  },
};

const RESP: ParameterRule = {
  id: "resp",
  label: "Respiratory Rate (breaths/min)",
  shortLabel: "Respiratory rate",
  unit: "breaths/min",
  units: [same("bpm", "breaths/min")],
  placeholder: "e.g. 15",
  defaultBaseline: "15",
  note: "Resting respiratory rate, counted over a full minute.",
  components: [
    single({
      label: "Respiratory rate",
      bands: { default: { green: [12, 20], red: { below: 9, above: 28 } } },
      plausible: { min: 4, max: 60 },
      baseline: { mode: "pct", yellowAt: 25 },
      trend: { minChange: 3 },
      decimals: 0,
    }),
  ],
  quality: [
    {
      id: "rested",
      label: "At rest for at least 5 minutes, not talking",
      severity: "blocking",
      fix: "Rest quietly for 5 minutes, then count again.",
    },
    {
      id: "count",
      label: "Counted for a full 60 seconds (or device-averaged)",
      severity: "caveat",
      fix: "Count again for a full minute.",
    },
  ],
  advice: {
    low: [
      "Sit upright and recheck after a few minutes of quiet rest.",
      "Note any drowsiness or confusion.",
      "Contact mission medical support if low readings persist or you feel unwell.",
    ],
    high: [
      "Rest, breathe slowly and recheck after a few minutes.",
      "Check cabin CO₂ and ventilation status.",
      "Contact mission medical support if breathing feels difficult or the rate stays high at rest.",
    ],
    trend: [
      "Check cabin CO₂ and ventilation trends.",
      "Recheck at the next scheduled check and compare with your baseline.",
    ],
  },
};

export const ILLUSTRATIVE_RULES: RuleSet = {
  meta: {
    id: "astra-illustrative",
    version: "0.1",
    status: "illustrative",
    label: "AETHER illustrative rules v0.1",
    disclaimer:
      "Prototype rules for demonstration only. Thresholds are illustrative, not clinically validated or mission-specific, and are not medical advice. A flight-surgeon-approved rule set must replace them before operational use.",
  },
  order: ["hr", "bp", "glucose", "spo2", "temp", "sleep", "resp"],
  parameters: { hr: HR, bp: BP, glucose: GLUCOSE, spo2: SPO2, temp: TEMP, sleep: SLEEP, resp: RESP },
};
