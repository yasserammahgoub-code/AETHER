import { useEffect, useState } from "react";
import { LEVEL_INFO, utcTime } from "../../lib/emergency/engine";
import { LEVEL_RANK, type Comm, type CommKind, type Level } from "../../lib/emergency/types";
import { Icon, type IconName } from "../ui/Icon";
import { EmPanel, focusRing, SimBadge } from "./ui";

interface KindConfig {
  title: string;
  icon: IconName;
  intro: string;
  open: string;
  send: string;
  noteLabel: string;
  steps: [string, string, string];
  demo: string;
  nobody: string;
}

const CONFIG: Record<CommKind, KindConfig> = {
  crew: {
    title: "Request crew assistance",
    icon: "users",
    intro: "Asks a crew member to come to you. The request includes what you have entered so far.",
    open: "Request crew assistance",
    send: "Send simulated request",
    noteLabel: "Add a note for the crew (optional)",
    steps: ["Sent", "Delivered", "Acknowledged"],
    demo: "Simulate crew acknowledgement",
    nobody: "No crew member was actually contacted.",
  },
  surgeon: {
    title: "Flight Surgeon notification",
    icon: "radio",
    intro: "Sends a structured report of what you entered. The report contains no diagnosis.",
    open: "Notify Flight Surgeon",
    send: "Send simulated notification",
    noteLabel: "Add a note for the Flight Surgeon (optional)",
    steps: ["Queued", "Delivered", "Receipt confirmed"],
    demo: "Simulate receipt confirmation",
    nobody: "No Flight Surgeon was actually contacted. AETHER gives no medical advice; any reply would come from a real Flight Surgeon.",
  },
};

/** Where the latest request stands. Always a simulated state: nothing here is ever transmitted. */
function statusOf(comms: Comm[], cfg: KindConfig): { label: string; sent: boolean } {
  const last = comms[comms.length - 1];
  if (!last) return { label: "Not sent", sent: false };
  if (last.ackAt) return { label: `${cfg.steps[2]} (demo)`, sent: true };
  if (last.deliveredAt) return { label: cfg.steps[1], sent: true };
  return { label: cfg.steps[0], sent: true };
}

const LEVELS: Level[] = ["immediate", "urgent", "prompt"];

function Stepper({ steps, at }: { steps: string[]; at: (string | undefined)[] }) {
  return (
    <ol className="grid grid-cols-3 gap-2">
      {steps.map((label, i) => {
        const t = at[i];
        return (
          <li
            key={label}
            className={`rounded-lg border border-dashed px-2 py-1.5 text-xs leading-snug ${
              t ? "border-neon-cyan/70 bg-cyan-900/40 text-cyan-50" : "border-cyan-200/25 text-cyan-100/60"
            }`}
          >
            <span className="flex items-center gap-1 font-semibold">
              {t ? <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} /> : <Icon name="clock" className="h-3.5 w-3.5" />}
              {label}
            </span>
            <span className="block">{t ? utcTime(t) : "Waiting"}</span>
          </li>
        );
      })}
    </ol>
  );
}

function SentItem({ comm, cfg, onAck }: { comm: Comm; cfg: KindConfig; onAck: (id: string) => void }) {
  return (
    <li className="sim-box p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-cyan-50">
          Sent {utcTime(comm.sentAt)}, priority {LEVEL_INFO[comm.priority].label}
        </span>
        <SimBadge />
      </div>
      <div className="mt-2">
        <Stepper steps={cfg.steps} at={[comm.sentAt, comm.deliveredAt, comm.ackAt]} />
      </div>
      <p className="mt-2 text-xs leading-snug text-cyan-100/90">Simulated. {cfg.nobody}</p>
      {!comm.ackAt && comm.deliveredAt && (
        <button
          type="button"
          onClick={() => onAck(comm.id)}
          className={`mt-2 rounded-lg border border-dashed border-neon-cyan/80 px-3 py-1.5 text-xs font-semibold text-neon-cyan hover:bg-cyan-900/40 ${focusRing}`}
        >
          Demo control: {cfg.demo}
        </button>
      )}
      <details className="mt-2 text-xs text-cyan-100/90">
        <summary className={`cursor-pointer ${focusRing}`}>Show message text</summary>
        <pre className="mt-1.5 max-h-48 overflow-auto whitespace-pre-wrap rounded-md bg-black/30 p-2 font-mono text-[11px] leading-relaxed">
          {comm.message}
        </pre>
      </details>
    </li>
  );
}

interface Props {
  kind: CommKind;
  comms: Comm[];
  composing: boolean;
  suggested: Level;
  onCompose: () => void;
  onCancel: () => void;
  buildMessage: (extra: string) => string;
  onSend: (priority: Level, message: string) => void;
  onAck: (id: string) => void;
  /** Navy styling for the expanded workflow screen. */
  blue?: boolean;
}

export function CommCard({ kind, comms, composing, suggested, onCompose, onCancel, buildMessage, onSend, onAck, blue = false }: Props) {
  const cfg = CONFIG[kind];
  const status = statusOf(comms, cfg);
  const [chosen, setChosen] = useState<Level | null>(null);
  const [extra, setExtra] = useState("");
  const priority = chosen ?? suggested;

  // Start each compose session fresh, with the priority following the current escalation level.
  useEffect(() => {
    if (composing) {
      setChosen(null);
      setExtra("");
    }
  }, [composing]);

  const send = () => {
    onSend(priority, buildMessage(extra));
    onCancel();
  };

  const sent = [...comms].reverse();
  const id = `emg-${kind}`;

  return (
    <EmPanel
      title={cfg.title}
      icon={cfg.icon}
      tone={blue ? "blue" : "red"}
      right={
        <span className="flex items-center gap-1.5">
          <span
            className={`rounded-full border px-2.5 py-0.5 text-xs font-bold ${
              status.sent ? "border-dashed border-neon-cyan/80 bg-cyan-950/60 text-neon-cyan" : "border-white/25 text-emg-mute"
            }`}
          >
            Status: {status.label}
          </span>
          <SimBadge />
        </span>
      }
    >
      {!composing ? (
        <>
          <p className="mb-3 text-sm leading-relaxed text-emg-mute">{cfg.intro}</p>
          <button
            type="button"
            onClick={onCompose}
            className={`flex w-full items-center justify-center gap-2.5 rounded-xl border border-red-300/50 bg-gradient-to-b from-red-500 to-red-700 px-5 py-3.5 text-[17px] font-bold text-white shadow-[0_0_20px_rgba(255,40,40,0.4)] hover:brightness-110 ${focusRing}`}
          >
            <Icon name={cfg.icon} className="h-6 w-6" />
            {cfg.open}
          </button>
        </>
      ) : (
        <div className="sim-box flex flex-col gap-3 p-3.5">
          <p className="text-sm leading-snug text-cyan-50">
            <strong className="text-neon-cyan">Simulation.</strong> Sending records this message in the event log only. Nobody
            receives it.
          </p>

          <fieldset>
            <legend className="mb-1.5 text-sm font-semibold text-cyan-50">Priority</legend>
            <div className="grid gap-1.5">
              {LEVELS.map((l) => {
                const on = priority === l;
                return (
                  <label
                    key={l}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-white/80 ${
                      on ? "border-white/70 bg-neon-red/80 text-white" : "border-cyan-200/30 bg-black/20 text-cyan-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`${id}-priority`}
                      checked={on}
                      onChange={() => setChosen(l)}
                      className="mt-1 accent-white"
                    />
                    <span>
                      <span className="font-semibold">{LEVEL_INFO[l].label}</span>
                      {l === suggested && LEVEL_RANK[suggested] > 0 && <span className="ml-1.5 text-xs opacity-90">(matches your selections)</span>}
                      <span className="block text-xs opacity-90">{LEVEL_INFO[l].action}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label htmlFor={`${id}-note`} className="mb-1 block text-sm font-semibold text-cyan-50">
              {cfg.noteLabel}
            </label>
            <textarea
              id={`${id}-note`}
              value={extra}
              onChange={(e) => setExtra(e.target.value)}
              rows={2}
              maxLength={400}
              className={`w-full resize-y rounded-lg border border-cyan-200/40 bg-black/30 px-3 py-2 text-sm text-white ${focusRing}`}
            />
          </div>

          <div>
            <div className="mb-1 text-sm font-semibold text-cyan-50">Message preview</div>
            <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-black/35 p-2.5 font-mono text-[11.5px] leading-relaxed text-cyan-50">
              {buildMessage(extra)}
            </pre>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={send}
              className={`flex items-center gap-2 rounded-lg bg-neon-red px-4 py-2.5 text-[15px] font-bold text-white hover:brightness-110 ${focusRing}`}
            >
              <Icon name="send" className="h-5 w-5" />
              {cfg.send}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className={`rounded-lg border border-cyan-200/50 px-4 py-2.5 text-[15px] font-medium text-cyan-50 hover:bg-cyan-900/40 ${focusRing}`}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {sent.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2.5" aria-label={`${cfg.title}: sent messages`}>
          {sent.map((c) => (
            <SentItem key={c.id} comm={c} cfg={cfg} onAck={onAck} />
          ))}
        </ul>
      )}
    </EmPanel>
  );
}
