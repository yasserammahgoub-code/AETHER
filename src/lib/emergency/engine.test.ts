import { describe, expect, it } from "vitest";
import {
  buildCrewMessage,
  buildSurgeonReport,
  checklistProgress,
  escalationFor,
  formatLogText,
  rangeCheck,
} from "./engine";
import { ILLUSTRATIVE_PROTOCOLS } from "./pathways";
import { initialSession, parseStoredLog, reduce } from "./session";
import { matchesActivationPhrase } from "./voice";
import type { EmergencyState, PathwayId, PathwayState } from "./types";

const P = ILLUSTRATIVE_PROTOCOLS;
const all = P.order.map((id) => P.pathways[id]);
const st = (p: Partial<PathwayState> = {}): PathwayState => ({ symptoms: {}, values: {}, checked: {}, ...p });

/** Every string a person can read inside a pathway (titles excluded: they are the user-facing area names). */
function pathwayText(id: PathwayId): string[] {
  const p = P.pathways[id];
  const out = [p.short];
  p.symptoms.forEach((s) => out.push(s.label));
  p.checklist.forEach((c) => out.push(c.text, c.detail ?? ""));
  p.measurements.forEach((m) => {
    out.push(m.why);
    if (m.kind !== "param") out.push(m.label);
    if (m.kind === "scale") out.push(m.lowLabel, m.highLabel);
    if (m.kind === "choice") m.options.forEach((o) => out.push(o.label));
  });
  return out;
}

describe("protocol content", () => {
  it("has the six pathways with symptoms, measurements and a checklist", () => {
    expect(P.order).toHaveLength(6);
    for (const p of all) {
      expect(p.symptoms.length).toBeGreaterThan(3);
      expect(p.measurements.length).toBeGreaterThan(2);
      expect(p.checklist.length).toBeGreaterThan(5);
      expect(p.symptoms.some((s) => s.level === "immediate")).toBe(true);
    }
  });

  it("uses unique ids inside each pathway", () => {
    for (const p of all) {
      for (const list of [p.symptoms, p.measurements, p.checklist]) {
        const ids = list.map((x) => x.id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    }
  });

  it("never names a medication, a dose or a dosage form", () => {
    const banned =
      /\b(\d+\s?(mg|mcg|ml|g|units?)|aspirin|ibuprofen|acetaminophen|paracetamol|tylenol|nitroglycerin|promethazine|scopolamine|epinephrine|albuterol|antibiotics?|steroids?|tablets?|pills?|doses?|dosage|inhaler|injection|ointment)\b/i;
    for (const id of P.order) for (const t of pathwayText(id)) expect(t).not.toMatch(banned);
  });

  it("never states or hints at a diagnosis", () => {
    const banned =
      /\b(heart attack|cardiac arrest|myocardial|arrhythmia|stroke|embolism|asthma|pneumonia|covid|sepsis|meningitis|concussion|depression disorder|you have|you are having|(?<!no )diagnos\w*)\b/i;
    for (const id of P.order) for (const t of pathwayText(id)) expect(t).not.toMatch(banned);
  });

  it("tells the person not to take medication unless the Flight Surgeon directs it, in every pathway", () => {
    for (const p of all) {
      expect(p.checklist.some((c) => /do not take any medication unless the flight surgeon directs you to/i.test(c.text))).toBe(true);
    }
  });

  it("includes a crew step and a Flight Surgeon step in every pathway", () => {
    for (const p of all) {
      const text = p.checklist.map((c) => c.text.toLowerCase()).join("\n");
      expect(text).toMatch(/crew/);
      expect(text).toMatch(/flight surgeon/);
    }
  });

  it("is labelled illustrative so the UI can say it is not an approved protocol", () => {
    expect(P.meta.status).toBe("illustrative");
    expect(P.meta.disclaimer).toMatch(/not a flight surgeon-approved protocol/i);
  });
});

describe("escalation", () => {
  const cardio = P.pathways.cardiovascular;

  it("is prompt with nothing selected", () => {
    expect(escalationFor(cardio, st())).toEqual({ level: "prompt", triggers: [], hasSymptoms: false });
    expect(escalationFor(null, undefined).level).toBe("prompt");
  });

  it("stays prompt for unflagged symptoms but still reports that symptoms exist", () => {
    const e = escalationFor(cardio, st({ symptoms: { sweat: true } }));
    expect(e.level).toBe("prompt");
    expect(e.hasSymptoms).toBe(true);
  });

  it("is urgent for an urgent symptom and immediate for an immediate one, highest wins", () => {
    expect(escalationFor(cardio, st({ symptoms: { racing: true } })).level).toBe("urgent");
    expect(escalationFor(cardio, st({ symptoms: { racing: true, chest: true } })).level).toBe("immediate");
  });

  it("can be raised by an answer, such as not feeling safe", () => {
    const b = P.pathways.behavioral;
    expect(escalationFor(b, st({ values: { safe: "unsure" } })).level).toBe("urgent");
    expect(escalationFor(b, st({ values: { safe: "no" } })).level).toBe("immediate");
    expect(escalationFor(b, st({ values: { safe: "yes" } })).level).toBe("prompt");
  });

  it("lists what triggered the level", () => {
    const e = escalationFor(cardio, st({ symptoms: { chest: true, sweat: true } }));
    expect(e.triggers).toEqual(["Chest pain, pressure or tightness"]);
  });
});

describe("checklist and measurements", () => {
  it("counts completed steps", () => {
    const p = P.pathways.respiratory;
    expect(checklistProgress(p, st({ checked: { stop: "2026-11-14T10:00:00.000Z" } }))).toEqual({ done: 1, total: p.checklist.length });
    expect(checklistProgress(p, undefined).done).toBe(0);
  });

  it("reuses the Parameter Checker for illustrative range checks", () => {
    expect(rangeCheck("hr", "")).toBeNull();
    expect(rangeCheck("hr", "72")?.state).toBe("green");
    expect(rangeCheck("hr", "160")?.state).toBe("red");
    expect(rangeCheck("hr", "9999")?.state).toBe("unavailable");
  });
});

/* ---------- Session ---------- */

let n = 0;
const meta = () => ({ at: new Date(Date.UTC(2026, 10, 14, 12, 0, n)).toISOString(), uid: `u${n++}` });
const fresh = (): EmergencyState => ({ session: initialSession(), log: [] });
const run = (s: EmergencyState, ...actions: Parameters<typeof reduce>[1][]) => actions.reduce(reduce, s);

describe("session reducer", () => {
  const enter = () => ({ type: "enter" as const, sessionId: "S1", ...meta() });

  it("activates, logs, and does not restart an active session", () => {
    const s1 = run(fresh(), enter());
    expect(s1.session.active && s1.session.open).toBe(true);
    expect(s1.log).toHaveLength(1);
    const s2 = run(s1, { type: "close-view" }, { type: "enter", sessionId: "S2", ...meta() });
    expect(s2.session.id).toBe("S1");
    expect(s2.session.open).toBe(true);
    expect(s2.log).toHaveLength(1);
  });

  it("logs symptoms, readings and checklist changes with the pathway", () => {
    const s = run(
      fresh(),
      enter(),
      { type: "pathway", id: "cardiovascular", ...meta() },
      { type: "symptom", id: "chest", ...meta() },
      { type: "value", mid: "hr", value: "118", ...meta() },
      { type: "check", id: "stop", ...meta() },
    );
    expect(s.session.pathways.cardiovascular?.symptoms.chest).toBe(true);
    expect(s.log.map((e) => e.kind)).toEqual(["session", "pathway", "symptom", "measurement", "checklist"]);
    expect(s.log[3].text).toMatch(/Heart rate: 118 BPM \(illustrative range check: /);
    expect(s.log.every((e) => e.sessionId === "S1")).toBe(true);
    expect(run(s, { type: "check", id: "stop", ...meta() }).session.pathways.cardiovascular?.checked.stop).toBeUndefined();
  });

  it("does not log an unchanged reading twice", () => {
    const base = run(fresh(), enter(), { type: "pathway", id: "respiratory", ...meta() }, { type: "value", mid: "spo2", value: "96", ...meta() });
    const again = run(base, { type: "value", mid: "spo2", value: "96", ...meta() });
    expect(again.log).toHaveLength(base.log.length);
  });

  it("keeps separate state per pathway", () => {
    const s = run(
      fresh(),
      enter(),
      { type: "pathway", id: "cardiovascular", ...meta() },
      { type: "symptom", id: "chest", ...meta() },
      { type: "pathway", id: "respiratory", ...meta() },
    );
    expect(s.session.pathways.respiratory).toBeUndefined();
    expect(s.session.pathways.cardiovascular?.symptoms.chest).toBe(true);
  });

  it("marks every crew and Flight Surgeon log entry as simulated", () => {
    const crew = { id: "c1", kind: "crew" as const, priority: "urgent" as const, pathwayId: null, sentAt: meta().at, message: "m" };
    const doc = { ...crew, id: "d1", kind: "surgeon" as const };
    const s = run(
      fresh(),
      enter(),
      { type: "send", comm: crew, ...meta() },
      { type: "send", comm: doc, ...meta() },
      { type: "deliver", commId: "c1", ...meta() },
      { type: "ack", commId: "c1", ...meta() },
      { type: "ack", commId: "d1", ...meta() },
    );
    const comms = s.log.filter((e) => e.kind === "crew" || e.kind === "surgeon");
    expect(comms).toHaveLength(5);
    expect(comms.every((e) => e.simulated && /SIMULATED/.test(e.text))).toBe(true);
    expect(s.session.comms.find((c) => c.id === "c1")?.ackAt).toBeDefined();
  });

  it("never acknowledges by itself: delivery alone sets no acknowledgement", () => {
    const crew = { id: "c1", kind: "crew" as const, priority: "immediate" as const, pathwayId: null, sentAt: meta().at, message: "m" };
    const s = run(fresh(), enter(), { type: "send", comm: crew, ...meta() }, { type: "deliver", commId: "c1", ...meta() });
    expect(s.session.comms[0].deliveredAt).toBeDefined();
    expect(s.session.comms[0].ackAt).toBeUndefined();
  });

  it("keeps the log (append-only) when the session ends", () => {
    const s1 = run(fresh(), enter(), { type: "note", text: "  felt dizzy at 11:58  ", ...meta() });
    const s2 = run(s1, { type: "end", ...meta() });
    expect(s2.session.active).toBe(false);
    expect(s2.log).toHaveLength(s1.log.length + 1);
    expect(s2.log.slice(0, s1.log.length)).toEqual(s1.log);
    expect(s1.log[1].text).toBe("Note: felt dizzy at 11:58");
  });

  it("ignores actions when no session is active", () => {
    const s = run(fresh(), { type: "note", text: "x", ...meta() }, { type: "symptom", id: "chest", ...meta() });
    expect(s.log).toHaveLength(0);
  });
});

describe("messages and log text", () => {
  const ctx = {
    pathway: P.pathways.cardiovascular,
    state: st({
      symptoms: { chest: true },
      values: { hr: "118", when: "rest" },
      checked: { stop: "2026-11-14T12:01:00.000Z" },
    }),
    forWhom: "self" as const,
    level: "immediate" as const,
  };

  it("labels the crew request as simulated, includes what was entered, and makes no diagnosis", () => {
    const m = buildCrewMessage({ ...ctx, extra: "Floating near the lab module" });
    expect(m).toMatch(/^\[SIMULATED\]/);
    expect(m).toMatch(/Priority: Immediate/);
    expect(m).toMatch(/Chest pain, pressure or tightness/);
    expect(m).toMatch(/Heart rate: 118 BPM/);
    expect(m).toMatch(/Floating near the lab module/);
    expect(m).toMatch(/no diagnosis/i);
  });

  it("builds a Flight Surgeon report with checklist progress and crew status", () => {
    const r = buildSurgeonReport({ ...ctx, startedAt: "2026-11-14T12:00:00.000Z", comms: [] });
    expect(r).toMatch(/^\[SIMULATED\]/);
    expect(r).toMatch(/1 of 8 steps completed/);
    expect(r).toMatch(/\[x\] Stop what you are doing/);
    expect(r).toMatch(/Crew assistance: not requested yet/);
    expect(r).toMatch(/no diagnosis/i);
  });

  it("still produces a message when no pathway is chosen", () => {
    const m = buildCrewMessage({ pathway: null, state: undefined, forWhom: "crew", level: "prompt" });
    expect(m).toMatch(/Area of concern: Not selected/);
    expect(m).toMatch(/Another crew member/);
  });

  it("exports the log oldest first and flags simulated entries", () => {
    const text = formatLogText([
      { id: "2", at: "2026-11-14T12:00:05.000Z", sessionId: "S", kind: "crew", pathwayId: null, text: "later", simulated: true },
      { id: "1", at: "2026-11-14T12:00:01.000Z", sessionId: "S", kind: "note", pathwayId: null, text: "earlier", simulated: false },
    ]);
    expect(text.indexOf("earlier")).toBeLessThan(text.indexOf("later"));
    expect(text).toMatch(/2026-11-14 12:00:05 UTC \| CREW \| SIMULATED \| later/);
  });

  it("drops malformed stored log entries", () => {
    const good = { id: "1", at: "2026-11-14T12:00:00.000Z", sessionId: "S", kind: "note", pathwayId: null, text: "ok", simulated: false };
    expect(parseStoredLog(JSON.stringify([good, { id: 2 }, null, { ...good, kind: "bogus" }, { ...good, at: "nope" }]))).toEqual([good]);
    expect(parseStoredLog("not json")).toEqual([]);
    expect(parseStoredLog(null)).toEqual([]);
  });
});

/* ---------- Voice activation and screens ---------- */

describe("activation phrase", () => {
  it("activates on the word emergency anywhere in the speech", () => {
    expect(matchesActivationPhrase("AETHER, Emergency Situation.")).toBe(true);
    expect(matchesActivationPhrase("this is an emergency")).toBe(true);
    expect(matchesActivationPhrase("EMERGENCY!")).toBe(true);
  });
  it("ignores speech without the whole word", () => {
    expect(matchesActivationPhrase("aether what is my heart rate")).toBe(false);
    expect(matchesActivationPhrase("emergencies are rare")).toBe(false);
    expect(matchesActivationPhrase("")).toBe(false);
  });
});

describe("activation method and standby", () => {
  const at = () => ({ ...meta() });
  it("standby opens the screen without activating or logging", () => {
    const s = run(fresh(), { type: "standby" });
    expect(s.session.open).toBe(true);
    expect(s.session.active).toBe(false);
    expect(s.log).toHaveLength(0);
  });
  it("records voice or manual activation, defaulting to manual", () => {
    const v = run(fresh(), { type: "standby" }, { type: "enter", sessionId: "V", method: "voice", ...at() });
    expect(v.session.method).toBe("voice");
    expect(v.log[0].text).toContain("voice");
    const m = run(fresh(), { type: "enter", sessionId: "M", ...at() });
    expect(m.session.method).toBe("manual");
  });
  it("back-to-categories clears the pathway but keeps what was entered", () => {
    const s = run(fresh(), { type: "enter", sessionId: "S", ...at() }, { type: "pathway", id: "respiratory", ...at() }, { type: "value", mid: "spo2", value: "96", ...at() });
    const back = run(s, { type: "back-to-categories" });
    expect(back.session.pathwayId).toBeNull();
    expect(back.session.lastPathwayId).toBe("respiratory");
    expect(back.session.pathways.respiratory?.values.spo2).toBe("96");
  });
});
