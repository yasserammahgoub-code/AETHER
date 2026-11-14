import { useEffect, useRef, useState } from "react";
import { useNow } from "../../hooks/useNow";
import type { Emergency } from "../../hooks/useEmergency";
import {
  buildCrewMessage,
  buildSurgeonReport,
  escalationFor,
  utcTime,
} from "../../lib/emergency/engine";
import type { ActivationMethod, CommKind, PathwayId } from "../../lib/emergency/types";
import type { LiveVitals } from "../../types";
import { Icon } from "../ui/Icon";
import { CommCard } from "./CommCard";
import { EventLog } from "./EventLog";
import { PathwayPicker } from "./PathwayPicker";
import { PathwayWorkspace } from "./PathwayWorkspace";
import { AetherLogo, focusRing, MethodBadge, SafetyNote, SimBanner } from "./ui";
import { VoicePanel } from "./VoicePanel";

interface Props {
  emergency: Emergency;
  live: LiveVitals;
}

function elapsed(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = String(Math.floor((s % 3600) / 60)).padStart(h ? 2 : 1, "0");
  const sec = String(s % 60).padStart(2, "0");
  return h ? `${h}:${m}:${sec}` : `${m}:${sec}`;
}

/** Dedicated full-screen emergency interface. Mounted only while the screen is open. */
export function EmergencyMode({ emergency, live }: Props) {
  const { session, log } = emergency.state;
  const { protocols } = emergency;
  const now = useNow(1000);
  const [compose, setCompose] = useState<CommKind | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  // Move focus into the screen on open and hand it back to the opener on close.
  // The opener lives in a ref so React StrictMode's extra mount/unmount in dev cannot overwrite it.
  useEffect(() => {
    if (!openerRef.current) openerRef.current = document.activeElement as HTMLElement | null;
    headingRef.current?.focus();
    return () => {
      const opener = openerRef.current;
      window.setTimeout(() => opener?.focus?.(), 0);
    };
  }, []);

  const pathway = session.pathwayId ? protocols.pathways[session.pathwayId] : null;
  const pState = session.pathwayId ? session.pathways[session.pathwayId] : undefined;
  const escalation = escalationFor(pathway, pState);
  const ctx = { pathway, state: pState, forWhom: session.forWhom, level: escalation.level };

  const entries = log.filter((e) => e.sessionId === session.id);
  const startedMs = session.startedAt ? Date.parse(session.startedAt) : now.getTime();

  // Pathway shown as "last selected" on screen 1 after returning from a workflow.
  const lastPathway: PathwayId | null = session.lastPathwayId;

  const activate = (method: ActivationMethod) => emergency.enter(method);
  // Choosing a category, or sending a request, from standby starts the session manually first.
  const ensureActive = () => {
    if (!session.active) emergency.enter("manual");
  };
  const choose = (id: PathwayId) => {
    ensureActive();
    emergency.selectPathway(id);
  };

  const openCompose = (k: CommKind) => {
    setCompose(k);
    window.setTimeout(() => document.getElementById(`emg-${k}-panel`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 0);
  };

  /** Crew assistance, Flight Surgeon notification and event log. `blue` = navy styling on screen 2. */
  const aside = (blue: boolean) => (
    <aside id="emg-actions" aria-label="Crew, Flight Surgeon and event log" className="flex min-w-0 flex-col gap-4">
      <div id="emg-crew-panel">
        <CommCard
          kind="crew"
          blue={blue}
          comms={session.comms.filter((c) => c.kind === "crew")}
          composing={compose === "crew"}
          suggested={escalation.level}
          onCompose={() => setCompose("crew")}
          onCancel={() => setCompose(null)}
          buildMessage={(extra) => buildCrewMessage({ ...ctx, extra })}
          onSend={(priority, message) => {
            ensureActive();
            emergency.sendComm("crew", priority, message, session.pathwayId);
          }}
          onAck={emergency.acknowledge}
        />
      </div>
      <div id="emg-surgeon-panel">
        <CommCard
          kind="surgeon"
          blue={blue}
          comms={session.comms.filter((c) => c.kind === "surgeon")}
          composing={compose === "surgeon"}
          suggested={escalation.level}
          onCompose={() => setCompose("surgeon")}
          onCancel={() => setCompose(null)}
          buildMessage={(extra) => buildSurgeonReport({ ...ctx, extra, startedAt: session.startedAt, comms: session.comms })}
          onSend={(priority, message) => {
            ensureActive();
            emergency.sendComm("surgeon", priority, message, session.pathwayId);
          }}
          onAck={emergency.acknowledge}
        />
      </div>
      <EventLog
        entries={entries}
        all={log}
        onNote={emergency.addNote}
        canNote={session.active}
        blue={blue}
        listClass={blue ? "max-h-[300px]" : "max-h-[240px]"}
      />
    </aside>
  );

  return (
    <div
      className="emg-root fixed inset-0 z-50 overflow-y-auto overscroll-contain text-emg-ink"
      role="dialog"
      aria-modal="true"
      aria-labelledby="emg-title"
    >
      <div className="emg-stripe sticky top-0 z-10" aria-hidden="true" />
      <div className="mx-auto flex max-w-[1760px] flex-col gap-4 p-3 pb-28 sm:p-5 xl:pb-5">
        <header className="flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl border border-white/10 bg-black/25 px-4 py-3">
          <AetherLogo />
          <div className="flex items-center gap-3">
            <span className={`${session.active ? "emg-pulse bg-neon-red" : "bg-amber-600"} grid h-11 w-11 shrink-0 place-items-center rounded-full text-white`}>
              <Icon name="alert" className="h-6 w-6" filled strokeWidth={1.4} />
            </span>
            <div className="min-w-0">
              <h1 id="emg-title" ref={headingRef} tabIndex={-1} className="text-xl font-extrabold tracking-wide text-white focus:outline-none sm:text-2xl">
                {session.active ? "EMERGENCY MODE" : "EMERGENCY MODE: STANDBY"}
              </h1>
              <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-emg-mute">
                {session.active ? (
                  <>
                    <span>
                      Activated {session.startedAt ? utcTime(session.startedAt) : "n/a"}, running {elapsed(now.getTime() - startedMs)}
                    </span>
                    <MethodBadge method={session.method} />
                  </>
                ) : (
                  <span>Not activated yet. Say the phrase or use the manual button.</span>
                )}
              </p>
            </div>
          </div>
          <div className="ml-auto flex flex-wrap gap-2.5">
            <button
              type="button"
              onClick={emergency.closeView}
              className={`flex items-center gap-2 rounded-xl border border-blue-300/50 bg-blue-950/60 px-4 py-2.5 text-[15px] font-semibold text-emg-ink hover:bg-blue-900/60 ${focusRing}`}
            >
              <Icon name="arrowLeft" className="h-5 w-5" />
              Back to Health Analytics
            </button>
            {session.active && (
              <button
                type="button"
                onClick={() => setConfirmEnd(true)}
                className={`rounded-xl border border-red-300/70 bg-neon-red/90 px-4 py-2.5 text-[15px] font-bold text-white hover:brightness-110 ${focusRing}`}
              >
                End Emergency Session
              </button>
            )}
          </div>
        </header>

        {confirmEnd && (
          <div role="alertdialog" aria-labelledby="emg-end-title" className="rounded-2xl border border-white/60 bg-emg-700 p-4">
            <p id="emg-end-title" className="text-base font-semibold text-white">
              End this emergency session?
            </p>
            <p className="mt-1 text-sm leading-snug text-emg-ink/90">
              Your entries are cleared from the screen, but the event log stays on this device. Simulated messages are not recalled,
              and the Flight Surgeon and crew keep whatever they received. Use Back to Health Analytics to leave the session open.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                autoFocus
                onClick={() => {
                  setConfirmEnd(false);
                  setCompose(null);
                  emergency.end();
                  emergency.closeView();
                }}
                className={`rounded-lg bg-white px-4 py-2 text-sm font-bold text-red-800 hover:bg-red-50 ${focusRing}`}
              >
                End session
              </button>
              <button
                type="button"
                onClick={() => setConfirmEnd(false)}
                className={`rounded-lg border border-white/70 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 ${focusRing}`}
              >
                Keep session open
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          <SimBanner />
          <SafetyNote />
        </div>

        {session.pathwayId ? (
          <PathwayWorkspace
            protocols={protocols}
            pathwayId={session.pathwayId}
            state={pState}
            forWhom={session.forWhom}
            live={live}
            startedAt={session.startedAt}
            method={session.method}
            aside={aside(true)}
            onSelectPathway={emergency.selectPathway}
            onBack={emergency.backToCategories}
            onForWhom={emergency.setForWhom}
            onToggleSymptom={emergency.toggleSymptom}
            onValue={emergency.setValue}
            onToggleCheck={emergency.toggleCheck}
            onCompose={openCompose}
          />
        ) : (
          /* Screen 1: voice activation and category selection, with communication and the log beside them. */
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(380px,430px)]">
            <div className="flex min-w-0 flex-col gap-4">
              <VoicePanel active={session.active} method={session.method} startedAt={session.startedAt} onActivate={activate} />
              <PathwayPicker protocols={protocols} selected={lastPathway} active={session.active} onSelect={choose} />
            </div>
            {aside(false)}
          </div>
        )}
      </div>

      {/* Small screens: the two actions stay one tap away while scrolling. */}
      <div className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-2 gap-2 border-t border-white/30 bg-emg-950/95 p-2.5 backdrop-blur xl:hidden">
        <button
          type="button"
          onClick={() => openCompose("crew")}
          className={`flex items-center justify-center gap-2 rounded-xl bg-neon-red px-3 py-3 text-[15px] font-bold text-white ${focusRing}`}
        >
          <Icon name="users" className="h-5 w-5" />
          Crew assistance
        </button>
        <button
          type="button"
          onClick={() => openCompose("surgeon")}
          className={`flex items-center justify-center gap-2 rounded-xl border border-white/70 px-3 py-3 text-[15px] font-bold text-white ${focusRing}`}
        >
          <Icon name="radio" className="h-5 w-5" />
          Flight Surgeon
        </button>
      </div>
    </div>
  );
}
