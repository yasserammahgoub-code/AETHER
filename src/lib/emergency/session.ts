/**
 * Emergency session reducer. Pure: timestamps and ids arrive inside each action,
 * so replaying the same actions always gives the same state.
 *
 * The event log is append-only. Nothing here edits or removes an entry, and ending a session keeps the log.
 */
import { describeMeasurement, EMPTY_PATHWAY_STATE, LEVEL_INFO, whomLabel } from "./engine";
import { ILLUSTRATIVE_PROTOCOLS } from "./pathways";
import type {
  ActivationMethod,
  Comm,
  EmergencyState,
  ForWhom,
  LogEntry,
  LogKind,
  PathwayId,
  PathwayState,
  Session,
} from "./types";

export const MAX_LOG = 2000;
const protocols = ILLUSTRATIVE_PROTOCOLS;

export function initialSession(): Session {
  return {
    active: false,
    open: false,
    id: null,
    startedAt: null,
    method: null,
    pathwayId: null,
    lastPathwayId: null,
    forWhom: "self",
    pathways: {},
    comms: [],
  };
}

interface Meta {
  at: string;
  uid: string;
}

export type Action =
  | ({ type: "enter"; sessionId: string; method?: ActivationMethod } & Meta)
  | { type: "standby" }
  | { type: "back-to-categories" }
  | { type: "close-view" }
  | ({ type: "end" } & Meta)
  | ({ type: "pathway"; id: PathwayId } & Meta)
  | ({ type: "for"; who: ForWhom } & Meta)
  | ({ type: "symptom"; id: string } & Meta)
  | ({ type: "value"; mid: string; value: string } & Meta)
  | ({ type: "check"; id: string } & Meta)
  | ({ type: "send"; comm: Comm } & Meta)
  | ({ type: "deliver"; commId: string } & Meta)
  | ({ type: "ack"; commId: string } & Meta)
  | ({ type: "note"; text: string } & Meta);

function log(
  state: EmergencyState,
  m: Meta,
  kind: LogKind,
  text: string,
  opts: { simulated?: boolean; pathwayId?: PathwayId | null } = {},
): LogEntry[] {
  const entry: LogEntry = {
    id: m.uid,
    at: m.at,
    sessionId: state.session.id ?? "none",
    kind,
    pathwayId: opts.pathwayId ?? state.session.pathwayId,
    text,
    simulated: opts.simulated ?? false,
  };
  const next = [...state.log, entry];
  return next.length > MAX_LOG ? next.slice(next.length - MAX_LOG) : next;
}

function patchPathway(s: Session, fn: (p: PathwayState) => PathwayState): Session {
  if (!s.pathwayId) return s;
  const cur = s.pathways[s.pathwayId] ?? EMPTY_PATHWAY_STATE;
  return { ...s, pathways: { ...s.pathways, [s.pathwayId]: fn(cur) } };
}

export function reduce(state: EmergencyState, a: Action): EmergencyState {
  const s = state.session;
  switch (a.type) {
    case "enter": {
      if (s.active) return { ...state, session: { ...s, open: true } };
      const method: ActivationMethod = a.method ?? "manual";
      const session: Session = { ...initialSession(), active: true, open: true, id: a.sessionId, startedAt: a.at, method };
      const base = { ...state, session };
      const how = method === "voice" ? "voice command" : "manual button";
      return { session, log: log(base, a, "session", `Emergency Mode activated by ${how}. No pathway selected yet.`) };
    }
    // Standby: the screen is open and listening, but nothing is activated or logged yet.
    case "standby":
      return s.active || s.open ? state : { ...state, session: { ...s, open: true } };
    case "back-to-categories":
      return s.active && s.pathwayId ? { ...state, session: { ...s, pathwayId: null } } : state;
    case "close-view":
      return s.open ? { ...state, session: { ...s, open: false } } : state;
    case "end": {
      if (!s.active) return state;
      return { session: initialSession(), log: log(state, a, "session", "Emergency session ended. Event log kept on this device.") };
    }
    case "pathway": {
      if (!s.active || s.pathwayId === a.id) return state;
      const title = protocols.pathways[a.id].title;
      const session = { ...s, pathwayId: a.id, lastPathwayId: a.id };
      return { session, log: log({ ...state, session }, a, "pathway", `Pathway selected: ${title}`) };
    }
    case "for": {
      if (!s.active || s.forWhom === a.who) return state;
      return { session: { ...s, forWhom: a.who }, log: log(state, a, "session", `Emergency is for: ${whomLabel(a.who)}`) };
    }
    case "symptom": {
      if (!s.active || !s.pathwayId) return state;
      const symptom = protocols.pathways[s.pathwayId].symptoms.find((x) => x.id === a.id);
      if (!symptom) return state;
      const was = !!(s.pathways[s.pathwayId] ?? EMPTY_PATHWAY_STATE).symptoms[a.id];
      const session = patchPathway(s, (p) => ({ ...p, symptoms: { ...p.symptoms, [a.id]: !was } }));
      return {
        session,
        log: log({ ...state, session }, a, "symptom", `${was ? "Symptom removed" : "Symptom reported"}: ${symptom.label}`),
      };
    }
    case "value": {
      if (!s.active || !s.pathwayId) return state;
      const m = protocols.pathways[s.pathwayId].measurements.find((x) => x.id === a.mid);
      if (!m) return state;
      const prev = (s.pathways[s.pathwayId] ?? EMPTY_PATHWAY_STATE).values[a.mid] ?? "";
      if (prev === a.value) return state;
      const session = patchPathway(s, (p) => ({ ...p, values: { ...p.values, [a.mid]: a.value } }));
      return { session, log: log({ ...state, session }, a, "measurement", describeMeasurement(m, a.value)) };
    }
    case "check": {
      if (!s.active || !s.pathwayId) return state;
      const item = protocols.pathways[s.pathwayId].checklist.find((x) => x.id === a.id);
      if (!item) return state;
      const was = !!(s.pathways[s.pathwayId] ?? EMPTY_PATHWAY_STATE).checked[a.id];
      const session = patchPathway(s, (p) => {
        const checked = { ...p.checked };
        if (was) delete checked[a.id];
        else checked[a.id] = a.at;
        return { ...p, checked };
      });
      return {
        session,
        log: log({ ...state, session }, a, "checklist", `${was ? "Checklist step reopened" : "Checklist step done"}: ${item.text}`),
      };
    }
    case "send": {
      if (!s.active) return state;
      const c = a.comm;
      const where = c.pathwayId ? ` Area: ${protocols.pathways[c.pathwayId].title}.` : "";
      const text =
        c.kind === "crew"
          ? `Crew assistance requested, priority ${LEVEL_INFO[c.priority].label}.${where} SIMULATED: no real alert was sent.`
          : `Flight Surgeon notification sent, priority ${LEVEL_INFO[c.priority].label}.${where} SIMULATED: no real message was sent.`;
      const session = { ...s, comms: [...s.comms, c] };
      return { session, log: log({ ...state, session }, a, c.kind, text, { simulated: true, pathwayId: c.pathwayId }) };
    }
    case "deliver": {
      const c = s.comms.find((x) => x.id === a.commId);
      if (!c || c.deliveredAt) return state;
      const session = { ...s, comms: s.comms.map((x) => (x.id === c.id ? { ...x, deliveredAt: a.at } : x)) };
      const text =
        c.kind === "crew"
          ? "Crew request marked delivered. SIMULATED: nobody was alerted."
          : "Flight Surgeon notification marked delivered. SIMULATED: nobody received it.";
      return { session, log: log({ ...state, session }, a, c.kind, text, { simulated: true, pathwayId: c.pathwayId }) };
    }
    case "ack": {
      const c = s.comms.find((x) => x.id === a.commId);
      if (!c || c.ackAt) return state;
      const session = { ...s, comms: s.comms.map((x) => (x.id === c.id ? { ...x, ackAt: a.at } : x)) };
      const text =
        c.kind === "crew"
          ? "Crew acknowledgement produced by the demo control. SIMULATED: no crew member responded."
          : "Flight Surgeon receipt produced by the demo control. SIMULATED: no Flight Surgeon responded.";
      return { session, log: log({ ...state, session }, a, c.kind, text, { simulated: true, pathwayId: c.pathwayId }) };
    }
    case "note": {
      const text = a.text.trim();
      if (!s.active || !text) return state;
      return { ...state, log: log(state, a, "note", `Note: ${text}`) };
    }
  }
}

/* ---------- Persistence of the log (the session itself is not persisted) ---------- */

// Key keeps its original name on purpose: renaming it would orphan event logs already saved in browsers.
export const LOG_STORAGE_KEY = "astra.emergency.log.v1";

const KINDS: LogKind[] = ["session", "pathway", "symptom", "measurement", "checklist", "crew", "surgeon", "note"];

export function parseStoredLog(raw: string | null): LogEntry[] {
  if (!raw) return [];
  try {
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data.filter(
      (e): e is LogEntry =>
        !!e &&
        typeof e.id === "string" &&
        typeof e.at === "string" &&
        !Number.isNaN(Date.parse(e.at)) &&
        typeof e.sessionId === "string" &&
        typeof e.text === "string" &&
        typeof e.simulated === "boolean" &&
        KINDS.includes(e.kind),
    );
  } catch {
    return [];
  }
}
