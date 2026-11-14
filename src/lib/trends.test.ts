import { describe, expect, it } from "vitest";
import { DEMO_HISTORY } from "../data/history";
import { ILLUSTRATIVE_RULES } from "./checker/rules";
import type { ParameterId } from "./checker/types";
import { referenceTable } from "./referenceRules";
import { buildTrendSeries, niceScale, type RecordedCheck, type TimeRange } from "./trends";

const NOW = Date.UTC(2026, 10, 14, 12, 0, 0);
const LIVE = { hr: 68, sys: 118, dia: 76, spo2: 98, temp: 36.6 };
const rules = ILLUSTRATIVE_RULES.parameters;

const build = (id: ParameterId, range: TimeRange, extra: { unitId?: string; checks?: RecordedCheck[] } = {}) =>
  buildTrendSeries({ rule: rules[id], unitId: extra.unitId ?? rules[id].units[0].id, range, now: NOW, live: LIVE, checks: extra.checks ?? [] });

describe("niceScale", () => {
  it("returns ascending ticks that cover the data", () => {
    const s = niceScale(76, 84);
    expect(s.lo).toBeLessThanOrEqual(76);
    expect(s.hi).toBeGreaterThanOrEqual(84);
    expect(s.ticks.every((t, i) => i === 0 || t > s.ticks[i - 1])).toBe(true);
  });
  it("copes with a flat series", () => {
    const s = niceScale(98, 98);
    expect(s.hi).toBeGreaterThan(s.lo);
  });
});

describe("buildTrendSeries", () => {
  it("7d uses the last seven recorded daily values", () => {
    const s = build("hr", "7d");
    const hist = DEMO_HISTORY.hr.value.slice(-7);
    expect(s.lines[0].points.map((p) => p.v)).toEqual(hist);
    expect(s.xTicks).toHaveLength(7);
    expect(s.daily).toBe(true);
  });

  it("24h and 1h end with the live reading and are deterministic", () => {
    for (const r of ["24h", "1h"] as const) {
      const a = build("hr", r);
      const b = build("hr", r);
      expect(a).toEqual(b);
      const pts = a.lines[0].points;
      expect(pts).toHaveLength(13);
      expect(pts[pts.length - 1]).toMatchObject({ v: LIVE.hr, source: "live", t: NOW });
      expect(a.xMax - a.xMin).toBe(r === "1h" ? 3_600_000 : 86_400_000);
    }
  });

  it("keeps generated points inside the plausible range and the axis", () => {
    const s = build("spo2", "24h");
    for (const p of s.lines[0].points) {
      expect(p.v).toBeLessThanOrEqual(rules.spo2.components[0].plausible.max);
      expect(p.v).toBeGreaterThanOrEqual(s.yMin);
      expect(p.v).toBeLessThanOrEqual(s.yMax);
    }
  });

  it("blood pressure has systolic and diastolic lines of equal length", () => {
    const s = build("bp", "24h");
    expect(s.lines.map((l) => l.key)).toEqual(["sys", "dia"]);
    expect(s.lines[0].points).toHaveLength(s.lines[1].points.length);
  });

  it("plots in the selected unit", () => {
    const c = build("temp", "7d", { unitId: "c" });
    const f = build("temp", "7d", { unitId: "f" });
    expect(f.unitLabel).toBe("°F");
    expect(f.lines[0].points[0].v).toBeCloseTo(c.lines[0].points[0].v * 1.8 + 32, 1);
  });

  it("sleep is nightly on every range and says so", () => {
    const s = build("sleep", "1h");
    expect(s.lines[0].points).toHaveLength(7);
    expect(s.daily).toBe(true);
    expect(s.note).toContain("nightly");
    expect(build("sleep", "7d").note).toBeNull();
  });

  it("adds checks inside the window to every component line, and ignores the rest", () => {
    const ok: RecordedCheck = { at: NOW - 30 * 60_000, state: "yellow", values: { sys: 135, dia: 88 } };
    const old: RecordedCheck = { at: NOW - 5 * 3_600_000, state: "green", values: { sys: 120, dia: 80 } };
    const unavailable: RecordedCheck = { at: NOW - 10 * 60_000, state: "unavailable", values: { sys: 120, dia: 80 } };
    const s = build("bp", "1h", { checks: [ok, old, unavailable] });
    for (const l of s.lines) {
      const checks = l.points.filter((p) => p.source === "check");
      expect(checks).toHaveLength(1);
      expect(checks[0].state).toBe("yellow");
    }
    expect(s.lines[0].points.filter((p) => p.source === "check")[0].v).toBe(135);
  });

  it("a check newer than the clock extends the axis instead of vanishing", () => {
    const s = build("hr", "24h", { checks: [{ at: NOW + 20_000, state: "green", values: { value: 85 } }] });
    expect(s.xMax).toBe(NOW + 20_000);
    expect(s.lines[0].points.some((p) => p.source === "check" && p.v === 85)).toBe(true);
  });
});

describe("referenceTable", () => {
  it("heart rate bands match the rule set", () => {
    const t = referenceTable(rules.hr, "bpm");
    expect(t.rows.map((r) => r.cells[0])).toEqual(["50 – 100", "40 – 50 or 100 – 120", "below 40 or above 120"]);
  });
  it("omits an open-ended upper band", () => {
    const t = referenceTable(rules.spo2, "pct");
    expect(t.rows[1].cells[0]).not.toContain("or");
    expect(t.rows[2].cells[0]).toBe("below 90");
  });
  it("blood pressure has one column per component", () => {
    const t = referenceTable(rules.bp, "mmhg");
    expect(t.columns).toHaveLength(2);
    expect(t.rows[0].cells).toEqual(["90 – 130", "60 – 85"]);
  });
  it("follows the selected glucose context and unit", () => {
    const fasting = referenceTable(rules.glucose, rules.glucose.units[0].id, "fasting").rows[0].cells[0];
    const post = referenceTable(rules.glucose, rules.glucose.units[0].id, "postmeal").rows[0].cells[0];
    expect(fasting).not.toBe(post);
  });
});
