/**
 * Emergency Mode — shared types.
 *
 * Design rules baked into the types:
 *  - Nothing here models a diagnosis or a medication. Symptoms are things the person REPORTS; the only
 *    derived value is an escalation level (how urgently to involve people), never a condition.
 *  - Every message sent from the prototype is a `Comm`, and every Comm is simulated.
 */
import type { IconName } from "../../components/ui/Icon";
import type { ParameterId } from "../checker/types";

export type PathwayId = "cardiovascular" | "respiratory" | "infection" | "neuro" | "behavioral" | "adaptation";

/** How urgently other people should be involved. Not a clinical severity. */
export type Level = "prompt" | "urgent" | "immediate";
export const LEVEL_RANK: Record<Level, number> = { prompt: 0, urgent: 1, immediate: 2 };
export type FlagLevel = Exclude<Level, "prompt">;

export interface Symptom {
  id: string;
  label: string;
  /** Selecting this raises the escalation level to at least this value. */
  level?: FlagLevel;
}

export interface ChoiceOption {
  id: string;
  label: string;
  level?: FlagLevel;
}

export type Measurement =
  | { kind: "param"; id: string; parameterId: ParameterId; why: string }
  | { kind: "scale"; id: string; label: string; lowLabel: string; highLabel: string; why: string }
  | { kind: "choice"; id: string; label: string; options: ChoiceOption[]; why: string };

export interface ChecklistItem {
  id: string;
  text: string;
  detail?: string;
}

export interface Pathway {
  id: PathwayId;
  title: string;
  short: string;
  icon: IconName;
  symptoms: Symptom[];
  measurements: Measurement[];
  checklist: ChecklistItem[];
}

export interface ProtocolMeta {
  id: string;
  version: string;
  /** "illustrative" sets must be shown with a visible "not an approved protocol" label. */
  status: "illustrative" | "approved";
  label: string;
  disclaimer: string;
}

export interface ProtocolSet {
  meta: ProtocolMeta;
  pathways: Record<PathwayId, Pathway>;
  order: PathwayId[];
}

/* ---------- Session ---------- */

export type ForWhom = "self" | "crew";
export type ActivationMethod = "voice" | "manual";
export type CommKind = "crew" | "surgeon";

export interface PathwayState {
  /** symptom id -> selected */
  symptoms: Record<string, boolean>;
  /** measurement id -> raw text (param), "0".."10" (scale) or option id (choice) */
  values: Record<string, string>;
  /** checklist item id -> ISO time it was completed */
  checked: Record<string, string>;
}

/** A simulated outgoing message. There is no real transport behind it. */
export interface Comm {
  id: string;
  kind: CommKind;
  priority: Level;
  pathwayId: PathwayId | null;
  sentAt: string;
  deliveredAt?: string;
  ackAt?: string;
  message: string;
}

export interface Session {
  active: boolean;
  /** Whether the emergency screen is showing (a session can stay active while the dashboard is shown). */
  open: boolean;
  id: string | null;
  startedAt: string | null;
  /** How the session was started. Null until activated. */
  method: ActivationMethod | null;
  pathwayId: PathwayId | null;
  /** Most recent category chosen, kept after returning to the category screen so it can be shown as selected. */
  lastPathwayId: PathwayId | null;
  forWhom: ForWhom;
  pathways: Partial<Record<PathwayId, PathwayState>>;
  comms: Comm[];
}

export type LogKind = "session" | "pathway" | "symptom" | "measurement" | "checklist" | "crew" | "surgeon" | "note";

export interface LogEntry {
  id: string;
  at: string;
  sessionId: string;
  kind: LogKind;
  pathwayId: PathwayId | null;
  text: string;
  /** True for anything involving a simulated notification. */
  simulated: boolean;
}

export interface EmergencyState {
  session: Session;
  log: LogEntry[];
}
