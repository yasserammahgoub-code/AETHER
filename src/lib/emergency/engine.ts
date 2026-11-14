/**
 * Emergency Mode — pure logic: escalation, range check display, message and report text, log export.
 *
 * Nothing in this file diagnoses or recommends treatment. The one derived value is an escalation level,
 * and it is computed only from which flagged symptoms/answers the person selected.
 */
import { DEMO_HISTORY } from "../../data/history";
import type { LiveVitals } from "../../types";
import { defaultQuality, runCheck } from "../checker/engine";
import { ILLUSTRATIVE_RULES } from "../checker/rules";
import type { CheckResult, ParameterId } from "../checker/types";
import {
  LEVEL_RANK,
  type Comm,
  type ForWhom,
  type Level,
  type LogEntry,
  type Measurement,
  type Pathway,
  type PathwayState,
} from "./types";

export const EMPTY_PATHWAY_STATE: PathwayState = { symptoms: {}, values: {}, checked: {} };

export const LEVEL_INFO: Record<Level, { label: string; blurb: string; action: string }> = {
  immediate: {
    label: "Immediate",
    blurb: "A selected item is on the immediate-escalation list.",
    action: "Request crew assistance now and notify the Flight Surgeon now.",
  },
  urgent: {
    label: "Urgent",
    blurb: "A selected item is on the urgent list.",
    action: "Tell your crew and notify the Flight Surgeon as soon as you can.",
  },
  prompt: {
    label: "Prompt",
    blurb: "No selected item is on the urgent or immediate lists.",
    action: "Notify the Flight Surgeon at the first opportunity.",
  },
};

export const maxLevel = (a: Level, b: Level): Level => (LEVEL_RANK[a] >= LEVEL_RANK[b] ? a : b);

export interface Escalation {
  level: Level;
  /** Labels of the selected items that set the level above "prompt". */
  triggers: string[];
  /** At least one symptom is selected. */
  hasSymptoms: boolean;
}

/**
 * The escalation level is the highest level among selected symptoms and chosen answers.
 * It says how urgently to involve people. It is not a severity score and not a diagnosis.
 */
export function escalationFor(pathway: Pathway | null, st: PathwayState | undefined): Escalation {
  if (!pathway || !st) return { level: "prompt", triggers: [], hasSymptoms: false };
  let level: Level = "prompt";
  const triggers: string[] = [];
  let hasSymptoms = false;

  for (const s of pathway.symptoms) {
    if (!st.symptoms[s.id]) continue;
    hasSymptoms = true;
    if (s.level) {
      level = maxLevel(level, s.level);
      triggers.push(s.label);
    }
  }
  for (const m of pathway.measurements) {
    if (m.kind !== "choice") continue;
    const opt = m.options.find((o) => o.id === st.values[m.id]);
    if (opt?.level) {
      level = maxLevel(level, opt.level);
      triggers.push(`${m.label} ${opt.label}`);
    }
  }
  return { level, triggers, hasSymptoms };
}

export function checklistProgress(pathway: Pathway, st: PathwayState | undefined) {
  const done = pathway.checklist.filter((c) => st?.checked[c.id]).length;
  return { done, total: pathway.checklist.length };
}

/* ---------- Measurements ---------- */

const rules = ILLUSTRATIVE_RULES;

export function paramRule(id: ParameterId) {
  return rules.parameters[id];
}

/** Illustrative range check of one typed reading. Null when nothing is entered. */
export function rangeCheck(parameterId: ParameterId, raw: string): CheckResult | null {
  const text = raw.trim();
  if (!text) return null;
  const rule = rules.parameters[parameterId];
  return runCheck(
    {
      parameterId,
      current: text,
      baseline: "",
      unitId: rule.units[0].id,
      contextId: rule.defaultContext,
      quality: defaultQuality(rule),
    },
    rules,
    DEMO_HISTORY,
  );
}

const STATE_WORD = { green: "GREEN", yellow: "YELLOW", red: "RED", unavailable: "UNAVAILABLE" } as const;

/** Which components of a reading sit outside the green band, e.g. "Systolic pressure high". */
export function outOfRange(result: CheckResult): string[] {
  return result.evaluations.filter((e) => e.position !== "in-range").map((e) => `${e.label.toLowerCase()} ${e.position}`);
}

export function rangeSummary(result: CheckResult): string {
  if (result.state === "unavailable") {
    return `UNAVAILABLE${result.problems[0] ? ` (${result.problems[0].message})` : ""}`;
  }
  const out = outOfRange(result);
  return out.length ? `${STATE_WORD[result.state]}, ${out.join(", ")}` : STATE_WORD[result.state];
}

/** Latest simulated telemetry as text, for the parameters that have a live source. */
export function liveReadingFor(id: ParameterId, live: LiveVitals): string | null {
  switch (id) {
    case "hr":
      return String(live.hr);
    case "bp":
      return `${live.sys}/${live.dia}`;
    case "spo2":
      return String(live.spo2);
    case "temp":
      return live.temp.toFixed(1);
    default:
      return null;
  }
}

export function measurementLabel(m: Measurement): string {
  return m.kind === "param" ? paramRule(m.parameterId).shortLabel : m.label;
}

/** One human-readable line for a measurement value, used by the event log and the reports. */
export function describeMeasurement(m: Measurement, value: string): string {
  const label = measurementLabel(m);
  if (!value.trim()) return `${label}: cleared`;
  if (m.kind === "param") {
    const rule = paramRule(m.parameterId);
    const r = rangeCheck(m.parameterId, value);
    return `${label}: ${value.trim()} ${rule.unit}${r ? ` (illustrative range check: ${rangeSummary(r)})` : ""}`;
  }
  if (m.kind === "scale") return `${label}: ${value} of 10`;
  const opt = m.options.find((o) => o.id === value);
  return `${label}: ${opt?.label ?? value}`;
}

export function measurementLines(pathway: Pathway, st: PathwayState | undefined): string[] {
  if (!st) return [];
  return pathway.measurements.filter((m) => st.values[m.id]?.trim()).map((m) => describeMeasurement(m, st.values[m.id]));
}

export function selectedSymptomLabels(pathway: Pathway, st: PathwayState | undefined): string[] {
  if (!st) return [];
  return pathway.symptoms.filter((s) => st.symptoms[s.id]).map((s) => s.label);
}

/* ---------- Text ---------- */

export const utcTime = (iso: string) => `${new Date(iso).toISOString().slice(11, 19)} UTC`;
export const utcStamp = (iso: string) => `${new Date(iso).toISOString().slice(0, 10)} ${utcTime(iso)}`;

const WHOM: Record<ForWhom, string> = { self: "The sender", crew: "Another crew member" };
export const whomLabel = (w: ForWhom) => WHOM[w];

export interface MessageContext {
  pathway: Pathway | null;
  state: PathwayState | undefined;
  forWhom: ForWhom;
  level: Level;
  extra?: string;
}

const bullets = (items: string[], empty: string) => (items.length ? items.map((i) => `- ${i}`) : [`- ${empty}`]);

const NOT_DIAGNOSIS =
  "This message holds self-reported information only. AETHER has made no diagnosis and recommends no treatment.";

/** Short request for crew assistance. Always labelled as simulated. */
export function buildCrewMessage(c: MessageContext): string {
  const lines = [
    "[SIMULATED] Crew assistance request (prototype; nobody receives this)",
    `Priority: ${LEVEL_INFO[c.level].label}`,
    `Who needs help: ${whomLabel(c.forWhom)}`,
    `Area of concern: ${c.pathway ? c.pathway.title : "Not selected"}`,
    "Reported symptoms:",
    ...(c.pathway ? bullets(selectedSymptomLabels(c.pathway, c.state), "None selected yet") : ["- None selected yet"]),
  ];
  const readings = c.pathway ? measurementLines(c.pathway, c.state) : [];
  if (readings.length) lines.push("Readings entered:", ...readings.map((r) => `- ${r}`));
  if (c.extra?.trim()) lines.push(`Added note: ${c.extra.trim()}`);
  lines.push("", NOT_DIAGNOSIS);
  return lines.join("\n");
}

export interface ReportContext extends MessageContext {
  startedAt: string | null;
  comms: Comm[];
}

/** Structured report for the Flight Surgeon. Always labelled as simulated. */
export function buildSurgeonReport(c: ReportContext): string {
  const p = c.pathway;
  const lines = [
    "[SIMULATED] Flight Surgeon notification (prototype; nobody receives this)",
    `Priority: ${LEVEL_INFO[c.level].label}`,
    `Who is affected: ${whomLabel(c.forWhom)}`,
    `Area of concern: ${p ? p.title : "Not selected"}`,
    `Emergency session started: ${c.startedAt ? utcStamp(c.startedAt) : "n/a"}`,
    "",
    "Reported symptoms:",
    ...(p ? bullets(selectedSymptomLabels(p, c.state), "None selected") : ["- None selected"]),
    "",
    "Readings and answers:",
    ...(p ? bullets(measurementLines(p, c.state), "None entered") : ["- None entered"]),
  ];

  if (p) {
    const { done, total } = checklistProgress(p, c.state);
    lines.push("", `Response checklist: ${done} of ${total} steps completed`);
    for (const item of p.checklist) {
      const at = c.state?.checked[item.id];
      lines.push(`- [${at ? "x" : " "}] ${item.text}${at ? ` (${utcTime(at)})` : ""}`);
    }
  }

  const crew = c.comms.filter((m) => m.kind === "crew");
  lines.push(
    "",
    crew.length
      ? `Crew assistance: requested ${utcTime(crew[crew.length - 1].sentAt)} (simulated)`
      : "Crew assistance: not requested yet",
  );
  if (c.extra?.trim()) lines.push("", `Added note: ${c.extra.trim()}`);
  lines.push("", NOT_DIAGNOSIS);
  return lines.join("\n");
}

/** Plain-text export of the event log, oldest first. */
export function formatLogText(entries: LogEntry[]): string {
  const header = [
    "AETHER emergency event log",
    "Prototype: entries marked SIMULATED involve notifications that were never actually sent.",
    "",
  ];
  const rows = [...entries]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map((e) => `${utcStamp(e.at)} | ${e.kind.toUpperCase()}${e.simulated ? " | SIMULATED" : ""} | ${e.text}`);
  return [...header, ...rows].join("\n");
}
