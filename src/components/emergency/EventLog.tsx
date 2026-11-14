import { useState } from "react";
import { formatLogText, utcTime } from "../../lib/emergency/engine";
import type { LogEntry, LogKind } from "../../lib/emergency/types";
import { Icon } from "../ui/Icon";
import { EmPanel, focusRing, SimBadge } from "./ui";

const KIND_LABEL: Record<LogKind, string> = {
  session: "Session",
  pathway: "Pathway",
  symptom: "Symptom",
  measurement: "Reading",
  checklist: "Checklist",
  crew: "Crew",
  surgeon: "Surgeon",
  note: "Note",
};

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

interface Props {
  /** Entries of the current session, oldest first. */
  entries: LogEntry[];
  /** Every stored entry, across sessions, for export. */
  all: LogEntry[];
  onNote: (text: string) => void;
  /** Notes are recorded only in an active session. */
  canNote?: boolean;
  blue?: boolean;
  /** Height class for the scrolling list. */
  listClass?: string;
}

export function EventLog({ entries, all, onNote, canNote = true, blue = false, listClass = "max-h-[260px]" }: Props) {
  const [note, setNote] = useState("");
  const submit = () => {
    if (!note.trim()) return;
    onNote(note);
    setNote("");
  };
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
  const earlier = all.length - entries.length;

  return (
    <EmPanel title="Emergency event log" icon="list" tone={blue ? "blue" : "red"} right={<span className="text-sm text-emg-mute">{entries.length} this session</span>}>
      <div className="flex gap-2">
        <label htmlFor="emg-note" className="sr-only">
          Add a note to the event log
        </label>
        <input
          id="emg-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          maxLength={300}
          placeholder="Add a factual note, e.g. what you were doing"
          className={`min-w-0 flex-1 rounded-lg border border-emg-line/60 bg-emg-900 px-3 py-2 text-sm text-emg-ink placeholder:text-emg-mute/60 ${focusRing}`}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!canNote || !note.trim()}
          className={`shrink-0 rounded-lg border border-emg-line/70 bg-emg-700 px-3.5 text-sm font-semibold text-white enabled:hover:bg-emg-line/60 disabled:opacity-45 ${focusRing}`}
        >
          Add note
        </button>
      </div>

      <div role="log" aria-live="polite" aria-label="Emergency event log, newest first" className={`mt-3 overflow-y-auto pr-1 ${listClass}`}>
      <ol className="flex flex-col gap-1.5">
        {entries.length === 0 && (
          <li className="rounded-lg border border-emg-line/30 bg-emg-950/60 px-3 py-2 text-sm text-emg-mute">
            {canNote ? "No events yet." : "Standby. Events are recorded once Emergency Mode is activated."}
          </li>
        )}
        {[...entries].reverse().map((e) => (
          <li key={e.id} className="rounded-lg border border-emg-line/30 bg-emg-950/60 px-3 py-2">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
              <time dateTime={e.at} className="font-mono text-emg-mute">
                {utcTime(e.at)}
              </time>
              <span className="rounded bg-emg-700 px-1.5 py-0.5 font-semibold text-emg-ink">{KIND_LABEL[e.kind]}</span>
              {e.simulated && <SimBadge />}
            </div>
            <p className="mt-1 text-sm leading-snug text-emg-ink">{e.text}</p>
          </li>
        ))}
      </ol>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => download(`aether-emergency-log-${stamp}.txt`, formatLogText(all), "text/plain")}
          className={`flex items-center gap-2 rounded-lg border border-emg-line/60 px-3 py-2 text-sm font-medium text-emg-ink hover:bg-emg-800 ${focusRing}`}
        >
          <Icon name="download" className="h-4 w-4" />
          Download .txt
        </button>
        <button
          type="button"
          onClick={() => download(`aether-emergency-log-${stamp}.json`, JSON.stringify(all, null, 2), "application/json")}
          className={`flex items-center gap-2 rounded-lg border border-emg-line/60 px-3 py-2 text-sm font-medium text-emg-ink hover:bg-emg-800 ${focusRing}`}
        >
          <Icon name="download" className="h-4 w-4" />
          Download .json
        </button>
      </div>
      <p className="mt-2 text-xs leading-snug text-emg-mute">
        Entries are added automatically and cannot be edited or deleted. The log is kept on this device
        {earlier > 0 ? `, including ${earlier} earlier ${earlier === 1 ? "entry" : "entries"} from previous sessions` : ""}. Downloads
        include every stored entry.
      </p>
    </EmPanel>
  );
}
