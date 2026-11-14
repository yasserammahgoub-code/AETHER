import { useState } from "react";
import { DailyMissionsPanel } from "./components/DailyMissionsPanel";
import { EmergencyMode } from "./components/emergency/EmergencyMode";
import { EnvironmentStrip } from "./components/EnvironmentStrip";
import { Header } from "./components/Header";
import { Icon } from "./components/ui/Icon";
import { HealthInsightPanel } from "./components/HealthInsightPanel";
import { ParameterCheckerPage } from "./components/ParameterCheckerPage";
import { ParameterCheckerPanel } from "./components/ParameterCheckerPanel";
import { Sidebar } from "./components/Sidebar";
import { TrendsPanel } from "./components/TrendsPanel";
import { VitalsHologramPanel } from "./components/VitalsHologramPanel";
import { INITIAL_MISSIONS, TRENDS, type NavId } from "./data/demo";
import { useEmergency } from "./hooks/useEmergency";
import { useLiveVitals } from "./hooks/useLiveVitals";
import { useParameterChecker } from "./hooks/useParameterChecker";
import { useNow } from "./hooks/useNow";
import { countAlerts, formatUtc, overallStatus } from "./lib/health";
import type { Mission } from "./types";

export default function App() {
  const [nav, setNav] = useState<NavId>("analytics");
  const [missions, setMissions] = useState<Mission[]>(INITIAL_MISSIONS);

  const live = useLiveVitals();
  const now = useNow();

  const checker = useParameterChecker();
  const emergency = useEmergency();
  const { session } = emergency.state;

  // Header status combines live telemetry with anything the Parameter Checker has flagged this session.
  const flagged = checker.flagged;
  const alerts = countAlerts(live.current) + flagged.length;
  const liveStatus = overallStatus(countAlerts(live.current));
  const checkStatus = flagged.some((r) => r.state === "red") ? "red" : flagged.length ? "amber" : "green";
  const rank = { green: 0, amber: 1, red: 2 } as const;
  const status = rank[checkStatus] > rank[liveStatus] ? checkStatus : liveStatus;
  const note = flagged.length
    ? `Parameter Checker: ${flagged.map((r) => `${r.parameterLabel.replace(/ \(.*\)$/, "")} ${r.state.toUpperCase()}`).join(", ")}.`
    : undefined;

  // An active session reopens as it was; otherwise the screen opens in standby (voice listening + manual button).
  const openEmergency = () => (session.active ? emergency.enter() : emergency.standby());

  const selectNav = (id: NavId) => {
    if (id === "emergency") return openEmergency();
    setNav(id);
  };

  const toggleMission = (id: string) =>
    setMissions((ms) => ms.map((m) => (m.id === id ? { ...m, done: !m.done } : m)));

  const sleep = TRENDS.find((t) => t.id === "sleep")!.data;

  return (
    <>
    {/* While Emergency Mode is open the dashboard is inert: unreachable by keyboard, pointer and screen readers. */}
    <div className="mx-auto flex min-h-screen max-w-[1760px] flex-col gap-4 p-3 sm:p-4 lg:p-5" inert={session.open}>
      {session.active && !session.open && (
        <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/50 bg-neon-red/90 px-5 py-3 text-white shadow-[0_0_28px_rgba(255,40,40,0.5)]">
          <Icon name="alert" className="h-6 w-6 shrink-0" filled strokeWidth={1.4} />
          <p className="min-w-0 flex-1 text-[15px] font-semibold">
            Emergency session in progress
            {session.pathwayId ? `: ${emergency.protocols.pathways[session.pathwayId].title}` : ""}.
          </p>
          <button
            type="button"
            onClick={openEmergency}
            className="rounded-lg bg-white px-4 py-2 text-sm font-bold text-red-800 hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            Return to Emergency Mode
          </button>
        </div>
      )}
      <Header
        compact={nav === "parameter"}
        status={status}
        alerts={alerts}
        note={note}
        lastAssessment={formatUtc(now)}
        emergencyActive={session.active}
        onEmergency={openEmergency}
      />

      <div className="grid flex-1 gap-4 lg:grid-cols-[235px_minmax(0,1fr)]">
        <Sidebar active={nav} onSelect={selectNav} emergencyActive={session.active} />

        <main className="flex min-w-0 flex-col gap-4">
          {nav === "parameter" ? (
            <ParameterCheckerPage checker={checker} live={live.current} now={now} />
          ) : nav === "missions" ? (
            <>
              <DailyMissionsPanel missions={missions} onToggle={toggleMission} />
              <EnvironmentStrip />
            </>
          ) : (
            <>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
            <VitalsHologramPanel live={live} />
            <TrendsPanel />
          </div>

          <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.1fr)]">
            <HealthInsightPanel sleep={sleep} />
            <ParameterCheckerPanel checker={checker} onOpenAnalysis={() => setNav("parameter")} />
            <div className="lg:col-span-2 2xl:col-span-1">
              <DailyMissionsPanel missions={missions} onToggle={toggleMission} />
            </div>
          </div>

          <EnvironmentStrip />
            </>
          )}
        </main>
      </div>

    </div>
    {session.open && <EmergencyMode emergency={emergency} live={live.current} />}
    </>
  );
}
