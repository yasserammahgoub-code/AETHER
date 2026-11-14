import { describe, expect, it } from "vitest";
import { DEMO_HISTORY } from "../../data/history";
import { analyzeTrend, defaultQuality, parseNumber, runCheck } from "./engine";
import { ILLUSTRATIVE_RULES as RULES } from "./rules";
import type { CheckInput, History, ParameterId } from "./types";

const input = (id: ParameterId, current: string, over: Partial<CheckInput> = {}): CheckInput => ({
  parameterId: id,
  current,
  baseline: RULES.parameters[id].defaultBaseline,
  unitId: RULES.parameters[id].units[0].id,
  quality: defaultQuality(RULES.parameters[id]),
  ...over,
});
const run = (id: ParameterId, current: string, over: Partial<CheckInput> = {}, h: History = DEMO_HISTORY) =>
  runCheck(input(id, current, over), RULES, h);

/** History with a flat series for one parameter (all components). */
const flat = (id: ParameterId, values: Record<string, number[]>): History => ({ ...DEMO_HISTORY, [id]: values });

describe("parseNumber", () => {
  it.each([["72", 72], ["36.6", 36.6], ["36,6", 36.6], [" 85 ", 85]])("accepts %s", (raw, n) => {
    expect(parseNumber(raw)).toBe(n);
  });
  it.each(["", "abc", "12abc", "1e3", "0x10", "-5", "Infinity", "NaN", "1.2.3"])("rejects %j", (raw) => {
    expect(parseNumber(raw)).toBeNull();
  });
});

describe("reference default (matches the dashboard design)", () => {
  it("HR 85 vs baseline 72 is GREEN, +18.1%, range 50–100 BPM", () => {
    const r = run("hr", "85");
    expect(r.state).toBe("green");
    expect(r.headline).toBe("Within acceptable range");
    expect(r.summary).toBe("+18.1% vs baseline · range 50–100 BPM");
  });
});

describe("range classification", () => {
  it.each<[ParameterId, string, string, string]>([
    ["hr", "50", "green", "lower green edge inclusive"],
    ["hr", "100", "green", "upper green edge inclusive"],
    ["hr", "45", "yellow", "low caution"],
    ["hr", "110", "yellow", "high caution"],
    ["hr", "125", "red", "high red"],
    ["hr", "38", "red", "low red"],
    ["spo2", "97", "green", ""],
    ["spo2", "93", "yellow", ""],
    ["spo2", "88", "red", ""],
    ["temp", "36.8", "green", ""],
    ["temp", "37.6", "yellow", ""],
    ["temp", "38.4", "red", ""],
    ["resp", "16", "green", ""],
    ["resp", "22", "yellow", ""],
    ["resp", "30", "red", ""],
    ["sleep", "7.5", "green", ""],
    ["sleep", "6.0", "yellow", "matches the Health Insight 'Attention' state"],
    ["sleep", "4", "red", ""],
  ])("%s %s -> %s (%s)", (id, v, state) => {
    // baseline = value so only the range rule can fire; flat history so no trend fires
    const r = run(id, v, { baseline: v }, flat(id, { value: Array(14).fill(Number(v)) }));
    expect(r.state).toBe(state);
  });

  it("blood pressure: the worse of systolic/diastolic wins", () => {
    const h = flat("bp", { sys: Array(14).fill(118), dia: Array(14).fill(76) });
    expect(run("bp", "118/76", {}, h).state).toBe("green");
    expect(run("bp", "118/92", { baseline: "118/92" }, flat("bp", { sys: Array(14).fill(118), dia: Array(14).fill(92) })).state).toBe("yellow");
    const red = run("bp", "170/76", { baseline: "170/76" }, flat("bp", { sys: Array(14).fill(170), dia: Array(14).fill(76) }));
    expect(red.state).toBe("red");
    expect(red.headline).toMatch(/Systolic pressure above safe range/);
  });

  it("glucose bands depend on context", () => {
    const h = flat("glucose", { value: Array(14).fill(120) });
    expect(run("glucose", "120", { baseline: "120", contextId: "fasting" }, h).state).toBe("yellow");
    expect(run("glucose", "120", { baseline: "120", contextId: "postmeal" }, h).state).toBe("green");
  });

  it("converts units: 5.0 mmol/L ≈ 90 mg/dL is GREEN; 98.6 °F is GREEN; 101.5 °F is RED", () => {
    const g = run("glucose", "5.0", { unitId: "mmoll", baseline: "5.0" }, flat("glucose", { value: Array(14).fill(90) }));
    expect(g.state).toBe("green");
    expect(g.summary).toContain("mmol/L");
    const t = (v: string) =>
      run("temp", v, { unitId: "f", baseline: "97.9" }, flat("temp", { value: Array(14).fill(36.6) }));
    expect(t("98.6").state).toBe("green");
    expect(t("101.5").state).toBe("red");
  });
});

describe("personal baseline", () => {
  const h = flat("hr", { value: Array(14).fill(72) });
  it("in-range reading far from baseline raises GREEN to YELLOW, never RED", () => {
    const r = run("hr", "98", { baseline: "60" }, h); // +63%, still inside 50–100
    expect(r.state).toBe("yellow");
    expect(r.headline).toMatch(/In range, but .* above baseline/);
  });
  it("absolute baselines: SpO₂ 4 points under baseline is YELLOW even though in range", () => {
    const r = run("spo2", "95", { baseline: "99" }, flat("spo2", { value: Array(14).fill(97) }));
    expect(r.state).toBe("yellow");
  });
  it("blank baseline is allowed and noted", () => {
    const r = run("hr", "72", { baseline: "" }, h);
    expect(r.state).toBe("green");
    expect(r.summary).toContain("no baseline set");
    expect(r.reasons.some((x) => /No personal baseline/.test(x.text))).toBe(true);
  });
  it("invalid baseline is ignored with a problem on the baseline field, reading still classified", () => {
    const r = run("hr", "72", { baseline: "abc" }, h);
    expect(r.state).toBe("green");
    expect(r.problems.map((p) => p.field)).toEqual(["baseline"]);
  });
});

describe("input validation -> UNAVAILABLE", () => {
  it.each(["", "   ", "abc", "-5", "1e3", "12abc"])("rejects current value %j", (v) => {
    const r = run("hr", v);
    expect(r.state).toBe("unavailable");
    expect(r.problems[0].field).toBe("current");
  });
  it.each<[ParameterId, string]>([
    ["hr", "300"],
    ["hr", "5"],
    ["spo2", "104"],
    ["temp", "98.6"], // °F typed into a °C field
    ["sleep", "30"],
    ["glucose", "5"], // mmol/L typed into a mg/dL field
    ["resp", "120"],
  ])("implausible %s %s is an entry error, not a clinical finding", (id, v) => {
    const r = run(id, v);
    expect(r.state).toBe("unavailable");
    expect(r.reasons[0].text).toMatch(/not physiologically plausible/);
  });
  it("blood pressure format and ordering", () => {
    expect(run("bp", "118").state).toBe("unavailable");
    expect(run("bp", "76/118").state).toBe("unavailable");
    expect(run("bp", "76/118").problems[0].message).toMatch(/higher than diastolic/);
    expect(run("bp", "118/76").state).toBe("green");
  });
});

describe("measurement quality", () => {
  it("blocking condition not met -> UNAVAILABLE with a fix, even for an alarming value", () => {
    const r = run("hr", "130", { quality: { rested: false, signal: true } });
    expect(r.state).toBe("unavailable");
    expect(r.nextSteps[0]).toMatch(/Rest quietly/);
    expect(r.escalate).toBe(false);
  });
  it("caveat keeps the classification but reduces confidence", () => {
    const r = run("hr", "85", { quality: { rested: true, signal: false } });
    expect(r.state).toBe("green");
    expect(r.confidence).toBe("reduced");
    expect(r.reasons.some((x) => x.kind === "quality")).toBe(true);
    expect(r.nextSteps).toContain("Re-seat the sensor and repeat until the signal indicator is stable.");
  });
  it("a red reading with a caveat stays RED", () => {
    const r = run("hr", "130", { baseline: "130", quality: { rested: true, signal: false } }, flat("hr", { value: Array(14).fill(130) }));
    expect(r.state).toBe("red");
    expect(r.confidence).toBe("reduced");
  });
});

describe("trend analysis", () => {
  const A = RULES.parameters.sleep.components[0];
  const bands = A.bands.default;

  it("needs at least 5 prior points", () => {
    expect(analyzeTrend([7, 7, 7, 7], 7, A, bands).direction).toBe("insufficient");
    expect(analyzeTrend([7, 7, 7, 7, 7], 7, A, bands).direction).toBe("stable");
  });
  it("detects a meaningful fall that heads out of range", () => {
    const t = analyzeTrend([7.3, 7.1, 7.5, 7.3, 7.2, 7.4, 6.9, 6.1], 6.0, A, bands);
    expect(t.direction).toBe("falling");
    expect(t.concern).toBe(true);
    expect(t.change!).toBeLessThan(-0.6);
  });
  it("ignores a meaningful change that is far from the limits (no concern)", () => {
    const t = analyzeTrend([7.0, 7.0, 7.0, 7.0, 7.0, 7.0, 8.0, 8.0], 8.0, A, bands);
    expect(t.direction).toBe("rising");
    expect(t.concern).toBe(false);
  });
  it("a single spike is not a trend", () => {
    const t = analyzeTrend([7, 7, 7, 7, 7, 7, 7, 7, 7, 7], 8.5, A, bands);
    expect(t.direction).not.toBe("falling");
  });
  it("3+ consecutive readings outside the band is a concern even if flat", () => {
    const t = analyzeTrend([7, 7, 7, 7, 7, 6.2, 6.2, 6.2], 6.2, A, bands);
    expect(t.daysOutside).toBe(4);
    expect(t.concern).toBe(true);
  });
  it("with the demo data, an in-range-for-now sleep entry after a falling trend is YELLOW via trend/baseline", () => {
    const r = run("sleep", "6.6");
    expect(r.state).toBe("yellow");
    expect(r.reasons.some((x) => x.kind === "trend" && x.severity === "yellow")).toBe(true);
  });
  it("insufficient history never blocks a classification", () => {
    const r = run("hr", "72", {}, flat("hr", { value: [72, 72] }));
    expect(r.state).toBe("green");
    expect(r.nextSteps.join(" ")).toMatch(/build trend history/);
  });
});

describe("explanations and next steps", () => {
  it("RED escalates and says why in numbers", () => {
    const r = run("spo2", "88", { baseline: "88" }, flat("spo2", { value: Array(14).fill(88) }));
    expect(r.state).toBe("red");
    expect(r.escalate).toBe(true);
    expect(r.reasons[0].severity).toBe("red");
    expect(r.reasons[0].text).toContain("88 %");
    expect(r.nextSteps.join(" ")).toMatch(/flight surgeon/);
  });
  it("GREEN gives a monitoring step and no escalation", () => {
    const r = run("hr", "72");
    expect(r.escalate).toBe(false);
    expect(r.nextSteps[0]).toMatch(/No action needed/);
  });
  it("carries the rule-set label so the UI can mark it illustrative", () => {
    expect(run("hr", "72").ruleSet.status).toBe("illustrative");
  });
});

describe("next-step wording", () => {
  it("sleep never asks for an immediate re-measurement", () => {
    const r = run("sleep", "6.0");
    expect(r.nextSteps.join(" ")).not.toMatch(/15 minutes/);
    expect(r.nextSteps.join(" ")).toMatch(/after tonight's sleep/);
  });
  it("RED puts the escalation step before parameter advice", () => {
    const r = run("hr", "130", { baseline: "130" }, flat("hr", { value: Array(14).fill(130) }));
    expect(r.nextSteps[1]).toMatch(/flight surgeon/);
  });
});
