import {
  STATE_RANK,
  type Bands,
  type CheckInput,
  type CheckResult,
  type CheckState,
  type ComponentEvaluation,
  type ComponentRule,
  type History,
  type InputProblem,
  type ParameterRule,
  type Reason,
  type RuleSet,
  type TrendAnalysis,
  type UnitOption,
} from "./types";

/* ------------------------------------------------------------------ helpers */

const NUM = /^\d+(?:[.,]\d+)?$/;

/** Strict numeric parse: rejects "", "abc", "12abc", "1e3", "0x10", negatives, NaN, Infinity. */
export function parseNumber(raw: string): number | null {
  const t = raw.trim();
  if (!NUM.test(t)) return null;
  const n = Number(t.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/** Parse the text for a parameter into one number per component (BP is "SYS/DIA"). */
export function parseEntry(raw: string, rule: ParameterRule): { values: number[] | null; error?: string } {
  const t = raw.trim();
  if (t === "") return { values: null, error: "empty" };
  if (rule.components.length === 2) {
    const m = /^(\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/.exec(t);
    if (!m) return { values: null, error: "format" };
    return { values: [Number(m[1].replace(",", ".")), Number(m[2].replace(",", "."))] };
  }
  const n = parseNumber(t);
  return n === null ? { values: null, error: "format" } : { values: [n] };
}

export function getUnit(rule: ParameterRule, unitId: string): UnitOption {
  return rule.units.find((u) => u.id === unitId) ?? rule.units[0];
}

export function getBands(c: ComponentRule, contextId?: string): Bands {
  return (contextId && c.bands[contextId]) || c.bands.default || Object.values(c.bands)[0];
}

const decimalsFor = (c: ComponentRule, u: UnitOption) => u.decimals ?? c.decimals;
const fmt = (v: number, d: number) => v.toFixed(d);
const signed = (v: number, d: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v).toFixed(d)}`;
const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length;

/** Least-squares slope per index step. */
function slope(ys: number[]): number {
  const n = ys.length;
  if (n < 2) return 0;
  const mx = (n - 1) / 2;
  const my = mean(ys);
  let num = 0;
  let den = 0;
  ys.forEach((y, i) => {
    num += (i - mx) * (y - my);
    den += (i - mx) ** 2;
  });
  return den === 0 ? 0 : num / den;
}

const outside = (v: number, b: Bands) => v < b.green[0] || v > b.green[1];
const worse = (a: CheckState, b: CheckState): CheckState => (STATE_RANK[b] > STATE_RANK[a] ? b : a);

/* ------------------------------------------------------------ trend analysis */

export const MIN_TREND_POINTS = 5;

/**
 * Compares the mean of the 3 most recent points (including the current entry) with the mean of
 * everything before them. A change counts only if it is large enough AND agrees with the slope of
 * the last 7 points, so a single spike does not read as a trend.
 *
 * A trend raises concern when it is meaningful and either the recent mean is already outside the
 * green band or it is heading toward the nearer band edge, or when 3+ consecutive latest points
 * are outside the green band. Concern alone can reach YELLOW, never RED.
 */
export function analyzeTrend(prior: number[], current: number, comp: ComponentRule, bands: Bands): TrendAnalysis {
  const series = [...prior, current];
  const base = {
    componentKey: comp.key,
    componentLabel: comp.label,
    points: prior.length,
    series,
  };

  let daysOutside = 0;
  for (let i = series.length - 1; i >= 0 && outside(series[i], bands); i--) daysOutside++;

  if (prior.length < MIN_TREND_POINTS) {
    return {
      ...base,
      direction: "insufficient",
      change: null,
      recentMean: null,
      priorMean: null,
      slopePerDay: null,
      daysOutside,
      concern: daysOutside >= 3,
    };
  }

  const recentMean = mean(series.slice(-3));
  const priorMean = mean(series.slice(0, -3));
  const change = recentMean - priorMean;
  const slopePerDay = slope(series.slice(-7));
  const meaningful = Math.abs(change) >= comp.trend.minChange && Math.sign(slopePerDay) === Math.sign(change);
  const direction = !meaningful ? "stable" : change > 0 ? "rising" : "falling";

  const width = bands.green[1] - bands.green[0];
  const edge = Number.isFinite(width) ? width * 0.25 : 0;
  const towardEdge =
    (direction === "rising" && recentMean >= bands.green[1] - edge) ||
    (direction === "falling" && recentMean <= bands.green[0] + edge);
  const concern =
    daysOutside >= 3 || (direction !== "stable" && (outside(recentMean, bands) || towardEdge));

  return { ...base, direction, change, recentMean, priorMean, slopePerDay, daysOutside, concern };
}

/* --------------------------------------------------------------- the engine */

interface Ctx {
  rule: ParameterRule;
  unit: UnitOption;
}

function showVal(c: ComponentRule, ctx: Ctx, canonical: number) {
  return fmt(ctx.unit.fromCanonical(canonical), decimalsFor(c, ctx.unit));
}

function rangeText(c: ComponentRule, ctx: Ctx, b: Bands) {
  return `${showVal(c, ctx, b.green[0])}–${showVal(c, ctx, b.green[1])} ${ctx.unit.label}`;
}

function evaluateComponent(
  c: ComponentRule,
  value: number,
  baseline: number | null,
  contextId: string | undefined,
  history: History,
  ctx: Ctx,
): ComponentEvaluation {
  const band = getBands(c, contextId);
  const position = value < band.green[0] ? "low" : value > band.green[1] ? "high" : "in-range";
  const rangeState: CheckState =
    value < band.red.below || value > band.red.above ? "red" : position === "in-range" ? "green" : "yellow";

  let baselineDeviation: number | null = null;
  let baselineState: CheckState | null = null;
  if (baseline !== null) {
    baselineDeviation = c.baseline.mode === "pct" ? ((value - baseline) / baseline) * 100 : value - baseline;
    baselineState = Math.abs(baselineDeviation) > c.baseline.yellowAt ? "yellow" : "green";
  }

  const trend = analyzeTrend(history[ctx.rule.id]?.[c.key] ?? [], value, c, band);
  return {
    key: c.key,
    label: c.label,
    value,
    rangeState,
    band,
    position,
    baselineValue: baseline,
    baselineDeviation,
    baselineState,
    trend,
  };
}

function baselineDevText(c: ComponentRule, ctx: Ctx, e: ComponentEvaluation): string {
  if (e.baselineDeviation === null || e.baselineValue === null) return "";
  if (c.baseline.mode === "pct") return `${signed(e.baselineDeviation, 1)}%`;
  const d = ctx.unit.fromCanonical(e.value) - ctx.unit.fromCanonical(e.baselineValue);
  return `${signed(d, decimalsFor(c, ctx.unit))} ${ctx.unit.label}`;
}

function baselineLimitText(c: ComponentRule, ctx: Ctx): string {
  if (c.baseline.mode === "pct") return `±${c.baseline.yellowAt}%`;
  const d = ctx.unit.fromCanonical(c.baseline.yellowAt) - ctx.unit.fromCanonical(0);
  return `±${fmt(d, decimalsFor(c, ctx.unit))} ${ctx.unit.label}`;
}

function rangeReason(c: ComponentRule, ctx: Ctx, e: ComponentEvaluation): Reason {
  const v = `${showVal(c, ctx, e.value)} ${ctx.unit.label}`;
  if (e.rangeState === "green") {
    return {
      kind: "range",
      severity: "green",
      text: `${c.label} ${v} is inside the reference range (${rangeText(c, ctx, e.band)}).`,
    };
  }
  const low = e.position === "low";
  const thr = low ? e.band.red.below : e.band.red.above;
  const thrText = `${low ? "below" : "above"} ${showVal(c, ctx, thr)} ${ctx.unit.label}`;
  return {
    kind: "range",
    severity: e.rangeState,
    text:
      `${c.label} ${v} is ${low ? "below" : "above"} the reference range (${rangeText(c, ctx, e.band)}). ` +
      (e.rangeState === "red" ? `It is in the red zone (${thrText}).` : `The red zone starts ${thrText}.`),
  };
}

function baselineReason(c: ComponentRule, ctx: Ctx, e: ComponentEvaluation): Reason | null {
  if (e.baselineState === null || e.baselineValue === null) return null;
  const dev = baselineDevText(c, ctx, e);
  const b = `${showVal(c, ctx, e.baselineValue)} ${ctx.unit.label}`;
  const limit = baselineLimitText(c, ctx);
  if (e.baselineState === "yellow") {
    return {
      kind: "baseline",
      severity: "yellow",
      text:
        `${c.label} is ${dev} compared with your baseline of ${b} (flagged beyond ${limit}).` +
        (e.rangeState === "green" ? " A personal shift can matter even inside the reference range." : ""),
    };
  }
  return { kind: "baseline", severity: "green", text: `${c.label} is ${dev} vs your baseline of ${b} (within ${limit}).` };
}

function trendReason(c: ComponentRule, ctx: Ctx, t: TrendAnalysis): Reason {
  const d = (v: number) => `${showVal(c, ctx, v)} ${ctx.unit.label}`;
  if (t.direction === "insufficient") {
    return {
      kind: "trend",
      severity: t.concern ? "yellow" : "info",
      text:
        `Not enough history for a trend (${t.points} prior day${t.points === 1 ? "" : "s"}; ${MIN_TREND_POINTS} needed).` +
        (t.concern ? ` The last ${t.daysOutside} readings are all outside the reference range.` : ""),
    };
  }
  if (t.direction === "stable") {
    return {
      kind: "trend",
      severity: t.concern ? "yellow" : "info",
      text:
        `${c.label} has been stable: the last 3 readings average ${d(t.recentMean!)} vs ${d(t.priorMean!)} earlier.` +
        (t.concern ? ` ${t.daysOutside} consecutive readings are outside the reference range.` : ""),
    };
  }
  const change = ctx.unit.fromCanonical(Math.abs(t.change!)) - ctx.unit.fromCanonical(0);
  const arrow = `${t.direction === "rising" ? "rising" : "falling"} ${fmt(change, decimalsFor(c, ctx.unit))} ${ctx.unit.label}`;
  return {
    kind: "trend",
    severity: t.concern ? "yellow" : "info",
    text:
      `${c.label} is ${t.direction}: the last 3 readings average ${d(t.recentMean!)} vs ${d(t.priorMean!)} earlier (${arrow}).` +
      (t.concern
        ? t.daysOutside >= 3
          ? ` ${t.daysOutside} consecutive readings are outside the reference range.`
          : " It is heading toward or beyond the edge of the reference range."
        : " The change does not approach the reference limits."),
  };
}

function unavailable(
  rule: ParameterRule,
  rs: RuleSet,
  ctx: { unitLabel: string; contextLabel: string | null },
  headline: string,
  reasons: Reason[],
  problems: InputProblem[],
  nextSteps: string[],
): CheckResult {
  return {
    parameterId: rule.id,
    parameterLabel: rule.label,
    state: "unavailable",
    confidence: "normal",
    headline,
    summary: "No classification was made — the measurement could not be validated.",
    reasons,
    nextSteps,
    problems,
    evaluations: [],
    ruleSet: rs.meta,
    unitLabel: ctx.unitLabel,
    contextLabel: ctx.contextLabel,
    escalate: false,
  };
}

/** Plausibility + format validation. Returns canonical values or problems. */
function validateEntry(
  raw: string,
  rule: ParameterRule,
  unit: UnitOption,
  field: "current" | "baseline",
): { values: number[] | null; problems: InputProblem[] } {
  const what = field === "current" ? "measurement" : "baseline";
  const parsed = parseEntry(raw, rule);
  if (parsed.values === null) {
    const bp = rule.components.length === 2;
    const message =
      parsed.error === "empty"
        ? `Enter a ${what}.`
        : bp
          ? `Enter the ${what} as systolic/diastolic, e.g. 118/76.`
          : `Enter the ${what} as a positive number, e.g. ${rule.placeholder.replace("e.g. ", "")}.`;
    return { values: null, problems: [{ field, message }] };
  }

  const problems: InputProblem[] = [];
  const canonical = parsed.values.map((v) => unit.toCanonical(v));
  rule.components.forEach((c, i) => {
    const { min, max } = c.plausible;
    const x = canonical[i];
    if (x < min || x > max) {
      const lo = fmt(unit.fromCanonical(min), decimalsFor(c, unit));
      const hi = fmt(unit.fromCanonical(max), decimalsFor(c, unit));
      problems.push({
        field,
        message: `${c.label} ${parsed.values![i]} ${unit.label} is not physiologically plausible (expected ${lo}–${hi} ${unit.label}). Check for a typo, a unit mix-up or a sensor fault.`,
      });
    }
  });
  if (rule.components.length === 2 && canonical[0] <= canonical[1]) {
    problems.push({ field, message: "Systolic pressure must be higher than diastolic pressure." });
  }
  return { values: problems.length ? null : canonical, problems };
}

const DEFAULT_REMEASURE = {
  now: "Repeat the measurement once now to rule out a measurement error.",
  later: "Repeat the measurement in about 15 minutes under standard conditions.",
};

const SYMPTOM_NOTE = "If you feel unwell, do not wait for a re-check — contact mission medical support.";

export function runCheck(input: CheckInput, rules: RuleSet, history: History): CheckResult {
  const rule = rules.parameters[input.parameterId];
  const unit = getUnit(rule, input.unitId);
  const contextId = rule.contexts ? (input.contextId ?? rule.defaultContext) : undefined;
  const contextLabel = rule.contexts?.find((c) => c.id === contextId)?.label ?? null;
  const ctx: Ctx = { rule, unit };
  const meta = { unitLabel: unit.label, contextLabel };

  /* 1. input validation ------------------------------------------------- */
  const cur = validateEntry(input.current, rule, unit, "current");
  if (cur.values === null) {
    return unavailable(
      rule,
      rules,
      meta,
      "Cannot assess — check the entered value",
      cur.problems.map((p) => ({ kind: "input", severity: "unavailable", text: p.message })),
      cur.problems,
      ["Correct the measurement and run the check again.", "If the value is right, repeat the measurement — it may be a sensor fault.", SYMPTOM_NOTE],
    );
  }

  const reasons: Reason[] = [];
  const problems: InputProblem[] = [];

  /* 2. measurement quality ---------------------------------------------- */
  const unmet = rule.quality.filter((q) => input.quality[q.id] === false);
  const blockers = unmet.filter((q) => q.severity === "blocking");
  const caveats = unmet.filter((q) => q.severity === "caveat");
  if (blockers.length) {
    return unavailable(
      rule,
      rules,
      meta,
      "Cannot assess — measurement conditions not met",
      blockers.map((q) => ({
        kind: "quality",
        severity: "unavailable",
        text: `Not met: ${q.label}. A reading taken this way cannot be compared with the reference rules.`,
      })),
      [],
      [...blockers.map((q) => q.fix), "Re-run the check with the new reading.", SYMPTOM_NOTE],
    );
  }
  for (const q of caveats) {
    reasons.push({
      kind: "quality",
      severity: "info",
      text: `Reduced confidence — not met: ${q.label}. ${q.fix}`,
    });
  }

  /* 3. baseline (optional; an invalid baseline never blocks the reading) -- */
  let baselineValues: number[] | null = null;
  if (input.baseline.trim() === "") {
    reasons.push({
      kind: "baseline",
      severity: "info",
      text: "No personal baseline entered — comparison uses reference rules and history only.",
    });
  } else {
    const b = validateEntry(input.baseline, rule, unit, "baseline");
    if (b.values === null) {
      problems.push(...b.problems);
      reasons.push({
        kind: "input",
        severity: "info",
        text: `Baseline ignored: ${b.problems[0].message}`,
      });
    } else baselineValues = b.values;
  }

  /* 4. evaluate -------------------------------------------------------- */
  const evaluations = rule.components.map((c, i) =>
    evaluateComponent(c, cur.values![i], baselineValues ? baselineValues[i] : null, contextId, history, ctx),
  );

  let state = "green" as CheckState;
  const rangeReasons: Reason[] = [];
  const baseReasons: Reason[] = [];
  const trendReasons: Reason[] = [];
  evaluations.forEach((e, i) => {
    const c = rule.components[i];
    state = worse(state, e.rangeState);
    if (e.baselineState === "yellow") state = worse(state, "yellow");
    if (e.trend.concern) state = worse(state, "yellow");
    rangeReasons.push(rangeReason(c, ctx, e));
    const br = baselineReason(c, ctx, e);
    if (br) baseReasons.push(br);
    trendReasons.push(trendReason(c, ctx, e.trend));
  });
  reasons.unshift(...rangeReasons, ...baseReasons, ...trendReasons);
  // Show the reasons that drive the state first.
  const weight = (r: Reason) => (r.severity === "info" ? -1 : STATE_RANK[r.severity]);
  reasons.sort((a, b) => weight(b) - weight(a));

  const confidence = caveats.length ? "reduced" : "normal";

  /* 5. headline / summary ------------------------------------------------ */
  const rangeNames = evaluations.filter((e) => e.rangeState !== "green");
  const first = rangeNames[0];
  const firstRule = first ? rule.components.find((c) => c.key === first.key)! : null;
  const baseNames = evaluations.filter((e) => e.baselineState === "yellow");
  const trendNames = evaluations.filter((e) => e.trend.concern);

  let headline: string;
  if (state === "green") headline = "Within acceptable range";
  else if (first && firstRule) {
    const dir = first.position === "low" ? "below" : "above";
    headline =
      state === "red"
        ? `${firstRule.label} ${dir} safe range — urgent attention`
        : `${firstRule.label} ${dir} reference range — monitor`;
  } else if (baseNames.length) {
    const e = baseNames[0];
    const c = rule.components.find((x) => x.key === e.key)!;
    headline = `In range, but ${baselineDevText(c, ctx, e).replace(/^[+−]/, "")} ${e.baselineDeviation! > 0 ? "above" : "below"} baseline — monitor`;
  } else {
    const t = trendNames[0].trend;
    headline = `In range, but ${t.direction === "stable" ? "persistently outside range" : `trending ${t.direction === "rising" ? "up" : "down"}`} — monitor`;
  }

  const sumParts = evaluations.map((e) => {
    const c = rule.components.find((x) => x.key === e.key)!;
    return e.baselineDeviation === null ? null : baselineDevText(c, ctx, e);
  });
  const baselineTxt = sumParts.every((p) => p !== null)
    ? `${sumParts.join(" / ")} vs baseline`
    : "no baseline set";
  const rangeTxt = evaluations
    .map((e) => {
      const c = rule.components.find((x) => x.key === e.key)!;
      return `${showVal(c, ctx, e.band.green[0])}–${showVal(c, ctx, e.band.green[1])}`;
    })
    .join(" / ");
  const summary = `${baselineTxt} · range ${rangeTxt} ${unit.label}`;

  /* 6. next steps -------------------------------------------------------- */
  const steps: string[] = [];
  const add = (...s: string[]) => s.forEach((x) => !steps.includes(x) && steps.push(x));
  const remeasure = rule.remeasure ?? DEFAULT_REMEASURE;
  if (state === "green") {
    add("No action needed — continue routine monitoring.");
    for (const q of caveats) add(q.fix);
    if (baselineValues === null) add("Add a personal baseline to enable a personalised comparison.");
    if (evaluations.some((e) => e.trend.direction === "insufficient")) add("Keep logging daily to build trend history.");
  } else {
    if (state === "red") {
      add(remeasure.now);
      add("Notify the flight surgeon / mission medical support now, per mission protocol.");
    }
    for (const e of evaluations) {
      if (e.rangeState !== "green") add(...rule.advice[e.position === "low" ? "low" : "high"]);
    }
    if (!rangeNames.length) {
      if (baseNames.length) add("Compare with recent activity, sleep and symptoms to see what changed from your usual.");
      if (trendNames.length) add(...rule.advice.trend);
    }
    if (state === "yellow") {
      add(remeasure.later);
      add("Contact mission medical support if it persists across two checks or worsens.");
    }
    for (const q of caveats) add(q.fix);
  }

  return {
    parameterId: rule.id,
    parameterLabel: rule.label,
    state,
    confidence,
    headline,
    summary,
    reasons,
    nextSteps: steps,
    problems,
    evaluations,
    ruleSet: rules.meta,
    unitLabel: unit.label,
    contextLabel,
    escalate: state === "red",
  };
}

/** Default quality answers: every condition assumed met (the user unchecks what did not hold). */
export function defaultQuality(rule: ParameterRule): Record<string, boolean> {
  return Object.fromEntries(rule.quality.map((q) => [q.id, true]));
}
