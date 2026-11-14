import { useCallback, useEffect, useReducer } from "react";
import { ILLUSTRATIVE_PROTOCOLS } from "../lib/emergency/pathways";
import { initialSession, LOG_STORAGE_KEY, parseStoredLog, reduce, type Action } from "../lib/emergency/session";
import type { ActivationMethod, Comm, CommKind, EmergencyState, ForWhom, Level, PathwayId } from "../lib/emergency/types";

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const meta = () => ({ at: new Date().toISOString(), uid: uid() });

/** Delay before a simulated message is marked "delivered". Purely cosmetic. */
const SIM_DELIVERY_MS: Record<CommKind, number> = { crew: 1200, surgeon: 1800 };

function init(): EmergencyState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(LOG_STORAGE_KEY);
  } catch {
    /* storage unavailable: the log simply starts empty */
  }
  return { session: initialSession(), log: parseStoredLog(raw) };
}

/**
 * Emergency Mode state. The session lives in memory; the event log is also kept in localStorage so it survives
 * a reload. Notifications are simulated: `sendComm` only records a message and, after a short delay, marks it
 * delivered. Acknowledgement happens only through an explicit demo control.
 */
export function useEmergency() {
  const [state, dispatch] = useReducer(reduce, undefined, init);

  useEffect(() => {
    try {
      window.localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(state.log));
    } catch {
      /* ignore quota / privacy-mode errors; the in-memory log still works */
    }
  }, [state.log]);

  const send = useCallback((a: Action) => dispatch(a), []);

  const enter = useCallback(
    (method: ActivationMethod = "manual") => send({ type: "enter", sessionId: new Date().toISOString(), method, ...meta() }),
    [send],
  );
  const standby = useCallback(() => send({ type: "standby" }), [send]);
  const backToCategories = useCallback(() => send({ type: "back-to-categories" }), [send]);
  const closeView = useCallback(() => send({ type: "close-view" }), [send]);
  const end = useCallback(() => send({ type: "end", ...meta() }), [send]);
  const selectPathway = useCallback((id: PathwayId) => send({ type: "pathway", id, ...meta() }), [send]);
  const setForWhom = useCallback((who: ForWhom) => send({ type: "for", who, ...meta() }), [send]);
  const toggleSymptom = useCallback((id: string) => send({ type: "symptom", id, ...meta() }), [send]);
  const setValue = useCallback((mid: string, value: string) => send({ type: "value", mid, value, ...meta() }), [send]);
  const toggleCheck = useCallback((id: string) => send({ type: "check", id, ...meta() }), [send]);
  const addNote = useCallback((text: string) => send({ type: "note", text, ...meta() }), [send]);
  const acknowledge = useCallback((commId: string) => send({ type: "ack", commId, ...meta() }), [send]);

  const sendComm = useCallback(
    (kind: CommKind, priority: Level, message: string, pathwayId: PathwayId | null) => {
      const m = meta();
      const comm: Comm = { id: uid(), kind, priority, pathwayId, sentAt: m.at, message };
      send({ type: "send", comm, ...m });
      window.setTimeout(() => send({ type: "deliver", commId: comm.id, ...meta() }), SIM_DELIVERY_MS[kind]);
    },
    [send],
  );

  return {
    state,
    protocols: ILLUSTRATIVE_PROTOCOLS,
    enter,
    standby,
    backToCategories,
    closeView,
    end,
    selectPathway,
    setForWhom,
    toggleSymptom,
    setValue,
    toggleCheck,
    addNote,
    sendComm,
    acknowledge,
  };
}

export type Emergency = ReturnType<typeof useEmergency>;
