/**
 * Parameter Checker — shared types.
 *
 * The engine is data-driven: everything clinical (bands, baseline limits, trend limits,
 * quality items, advice) lives in a `RuleSet` so a flight-surgeon-approved rule set can be
 * swapped in without touching the engine or the UI.
 */

export type ParameterId = "hr" | "bp" | "glucose" | "spo2" | "temp" | "sleep" | "resp";

/** GREEN / YELLOW / RED classify a reading; UNAVAILABLE means no classification can be made. */
export type CheckState = "green" | "yellow" | "red" | "unavailable";

/** Ordering used when combining signals: the worst classification wins. */
export const STATE_RANK: Record<CheckState, number> = { green: 0, yellow: 1, red: 2, unavailable: 3 };

export type RuleSetStatus = "illustrative" | "approved";

export interface RuleSetMeta {
  id: string;
  version: string;
  /** "illustrative" rule sets must be shown with a visible "not clinically validated" label. */
  status: RuleSetStatus;
  label: string;
  disclaimer: string;
}

/**
 * Reference bands for one component, all in canonical units.
 * - value inside `green` (inclusive)            -> GREEN
 * - value below `red.below` / above `red.above` -> RED
 * - anything in between                         -> YELLOW
 */
export interface Bands {
  green: [number, number];
  red: { below: number; above: number };
}

export interface Plausibility {
  /** Values outside this range are treated as entry/sensor errors, never as clinical findings. */
  min: number;
  max: number;
}

export interface BaselineRule {
  mode: "pct" | "abs";
  /** Deviation from personal baseline (in % or canonical units) that raises GREEN to YELLOW. */
  yellowAt: number;
}

export interface TrendRule {
  /** Change in recent mean vs. prior mean (canonical units) considered meaningful. */
  minChange: number;
}

export interface ComponentRule {
  key: string; // "value" for single-value parameters; "sys" / "dia" for blood pressure
  label: string;
  /** Bands per context id; `default` is used when a context has no entry. */
  bands: Record<string, Bands>;
  plausible: Plausibility;
  baseline: BaselineRule;
  trend: TrendRule;
  /** Decimal places used when displaying values. */
  decimals: number;
}

export interface UnitOption {
  id: string;
  label: string;
  /** Convert a value in this unit to the canonical unit. */
  toCanonical: (v: number) => number;
  fromCanonical: (v: number) => number;
  /** Decimal places when displaying in this unit (falls back to the component's). */
  decimals?: number;
}

export interface ContextOption {
  id: string;
  label: string;
}

export interface QualityItem {
  id: string;
  label: string;
  /**
   * blocking: reading cannot be classified against these rules if the condition is not met (UNAVAILABLE)
   * caveat:   reading can be classified but confidence is reduced
   */
  severity: "blocking" | "caveat";
  /** What to do to fix it. */
  fix: string;
}

export interface Advice {
  /** Specific steps when a component is low / high. */
  low: string[];
  high: string[];
  /** Specific steps when only the trend raises concern. */
  trend: string[];
}

export interface ParameterRule {
  id: ParameterId;
  label: string; // dropdown label, e.g. "Heart Rate (BPM)"
  shortLabel: string; // e.g. "Heart rate"
  /** Canonical unit label (what bands, history and baselines are expressed in). */
  unit: string;
  units: UnitOption[];
  contexts?: ContextOption[];
  defaultContext?: string;
  /** Free-text hint for the input, e.g. "118/76" */
  placeholder: string;
  /** Default personal baseline (canonical) used to prefill the form. */
  defaultBaseline: string;
  components: ComponentRule[];
  quality: QualityItem[];
  advice: Advice;
  /** Overrides for "repeat the measurement" steps where re-measuring makes no sense (e.g. sleep). */
  remeasure?: { now: string; later: string };
  /** Short note displayed with the rule table. */
  note: string;
}

export interface RuleSet {
  meta: RuleSetMeta;
  parameters: Record<ParameterId, ParameterRule>;
  order: ParameterId[];
}

/** Prior daily values per component key (canonical units), oldest -> newest, excluding the current entry. */
export type History = Record<ParameterId, Record<string, number[]>>;

export interface CheckInput {
  parameterId: ParameterId;
  /** Raw text. Blood pressure uses "SYS/DIA". */
  current: string;
  /** Raw text; empty means no personal baseline. */
  baseline: string;
  unitId: string;
  contextId?: string;
  /** quality item id -> condition met? Missing ids count as met. */
  quality: Record<string, boolean>;
}

export interface InputProblem {
  field: "current" | "baseline";
  message: string;
}

export type ReasonKind = "range" | "baseline" | "trend" | "quality" | "input";

export interface Reason {
  kind: ReasonKind;
  /** "info" reasons never change the state. */
  severity: CheckState | "info";
  text: string;
}

export type TrendDirection = "rising" | "falling" | "stable" | "insufficient";

export interface TrendAnalysis {
  componentKey: string;
  componentLabel: string;
  direction: TrendDirection;
  /** Prior points used (excludes the current entry). */
  points: number;
  /** recent mean − prior mean (canonical units); null when insufficient. */
  change: number | null;
  recentMean: number | null;
  priorMean: number | null;
  /** Least-squares slope over the last 7 points, per day. */
  slopePerDay: number | null;
  /** Consecutive most-recent points (incl. current) outside the green band. */
  daysOutside: number;
  concern: boolean;
  series: number[]; // history + current, for charting
}

export interface ComponentEvaluation {
  key: string;
  label: string;
  value: number; // canonical
  rangeState: CheckState;
  band: Bands;
  position: "low" | "in-range" | "high";
  baselineValue: number | null;
  /** deviation in the unit of the baseline rule (% or canonical units) */
  baselineDeviation: number | null;
  baselineState: CheckState | null;
  trend: TrendAnalysis;
}

export interface CheckResult {
  parameterId: ParameterId;
  parameterLabel: string;
  state: CheckState;
  /** "reduced" when a caveat quality item was not met. */
  confidence: "normal" | "reduced";
  headline: string;
  summary: string;
  reasons: Reason[];
  nextSteps: string[];
  problems: InputProblem[];
  evaluations: ComponentEvaluation[];
  ruleSet: RuleSetMeta;
  /** Display helpers */
  unitLabel: string;
  contextLabel: string | null;
  /** True when the result suggests contacting mission medical support now. */
  escalate: boolean;
}
