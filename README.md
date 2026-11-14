# AETHER — Astronaut Health Companion

**Live demo: <https://yasserammahgoub-code.github.io/aether/>**

React + TypeScript + Tailwind CSS v4 (Vite). Charts are dependency-free custom SVG components.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build
```

## Voice activation

- Works in Chrome and Edge, needs internet and microphone permission. If voice is unavailable, use the manual button.
- Say "AETHER, Emergency Situation." (the word "emergency" anywhere in speech activates it).

## Structure

- `src/App.tsx` – page composition and shared state (missions, emergency dialog, live vitals)
- `src/data/demo.ts` – illustrative demo data (14-day trends, missions, parameter ranges)
- `src/lib/health.ts` – live-vitals status/alert logic
- `src/lib/checker/` – Parameter Checker: `rules.ts` (ILLUSTRATIVE rule set), `engine.ts` (validation, quality, reference/baseline/trend logic, explanations, next steps), `types.ts`, `engine.test.ts`
- `src/lib/emergency/` – Emergency Mode: `pathways.ts` (ILLUSTRATIVE protocol set: six pathways), `engine.ts` (escalation, range-check display, simulated message/report text, log export), `session.ts` (pure reducer, append-only event log, log persistence), `types.ts`, `engine.test.ts`
- `src/hooks/useEmergency.ts` – Emergency Mode state, simulated delivery timers, log persistence
- `src/components/emergency/` – `EmergencyMode` (full-screen red interface), `PathwayPicker`, `PathwayWorkspace`, `Measurements`, `CommCard` (crew + Flight Surgeon), `EventLog`, `ui`
- `src/data/history.ts` – 14-day demo history per parameter
- `src/hooks/useParameterChecker.ts` – shared checker state for the quick panel and full view
- `src/hooks/` – `useLiveVitals` (simulated telemetry), `useElementSize`, `useNow`
- `src/components/` – Header, Sidebar, BodyHologram, VitalsHologramPanel, VitalCard, TrendsPanel,
  `charts/TrendChart`, HealthInsightPanel, ParameterCheckerPanel, DailyMissionsPanel,
  EnvironmentStrip
- `src/index.css` – Tailwind theme tokens + panel/hologram/ECG styles

## Pages

Sidebar order: Health Analytics (landing page, unchanged original layout), Parameter Checker, Emergency Mode, Daily Missions.
Dashboard and Health Records pages are removed.

- **Parameter Checker** (`ParameterCheckerPage.tsx`): large Health Trends graph (`HealthTrendsPanel`, `charts/HealthTrendChart`, 1h/24h/7d)
  over `AetherCheckerPanel` (one dropdown for all 7 parameters), `AssessmentPanel` and `ReferenceRulesPanel`. Uses the slim header variant.
  The previous full-analysis layout is kept, unmounted, as `ParameterCheckerPageClassic.tsx`.
- Graph data (`src/lib/trends.ts`): 7d = last 7 daily values from `DEMO_HISTORY`; 1h / 24h = deterministic illustrative curve around that
  history (no intra-day store exists yet; swap `intradayValue` for a records query), ending in the live reading for HR, BP, SpO₂, temperature;
  every check is plotted at its run time. Sleep is nightly, so it shows 7 nights on every range.
- Emergency log keeps the localStorage key `astra.emergency.log.v1` so logs saved before the rename are not lost.

## Interactive

- Charts: hover/tap for crosshair + tooltip; 3 / 7 / 14-day range selector
- Missions: toggle items; count, Health Score and ring update
- Parameter Checker (quick panel + full view via the sidebar or the panel's link): 7 parameters, unit/context
  selection, measurement-quality checklist, GREEN / YELLOW / RED / UNAVAILABLE, reasons, next steps, trend chart.
  Results feed the header status and alert count. Blood pressure is entered as `SYS/DIA`.
- Body markers and vital cards highlight each other; vitals update live (demo simulation)
- Header status and alert count are derived from the live vitals

## Emergency Mode

Opened from the header button, the sidebar item, or the Parameter Checker's escalation button. It is a dedicated full-screen
crimson interface; the dashboard behind it is `inert` (not reachable by keyboard, pointer or screen reader). **Back to dashboard**
keeps the session running (header button pulses, sidebar shows ACTIVE, a banner offers a way back). **End session** asks to confirm.

Six pathways: cardiovascular warning, respiratory problems, fever and possible infection, neurological and vision concerns,
behavioral health crisis, space adaptation problems. Each has:

- **Symptom selection** – items flagged Immediate/Urgent raise the *escalation level* (how urgently to involve people).
- **Health measurements** – typed readings reuse the Parameter Checker's illustrative range check (glucose and temperature accept
  mmol/L and °F and are stored in mg/dL and °C), plus 0–10 scales and short answers. "Use live reading" fills from simulated telemetry.
- **Response checklist** – timestamped steps; progress feeds the Flight Surgeon report.
- **Request Crew Assistance** and **Flight Surgeon Notification** – compose with priority, note and full message preview, then send.
- **Event log** – every action is logged with a UTC time. Append-only (no edit/delete), persisted in `localStorage`, downloadable as
  `.txt` or `.json`, with notes.

### Safety rules (enforced by tests in `src/lib/emergency/engine.test.ts`)

- AETHER never diagnoses and never recommends or prescribes medication. No pathway text names a condition, a drug, a dose or a
  dosage form, and every checklist says *not* to take any medication unless the Flight Surgeon directs it.
- The escalation level is computed only from which flagged items were selected. It is shown with "not a diagnosis", and the
  lowest level says "this is not an all-clear".
- **Simulation is explicit.** Nothing is ever sent. A permanent banner says so; every message, status, and log entry for crew or Flight
  Surgeon carries a dashed cyan SIMULATED marker (cyan is used for nothing else in this mode) and text such as "No crew member was
  actually contacted". Delivery is marked automatically after a short delay; acknowledgement or receipt only appears if the user presses a
  labelled **Demo control**, so the app never pretends anyone responded.
- The checklists in `pathways.ts` are **illustrative placeholders**, labelled as such in the UI. To use an approved set, provide a
  `ProtocolSet` with `meta.status: "approved"`; the engine and UI need no changes (same pattern as the Parameter Checker rules).
- To make notifications real later, replace the body of `sendComm` in `useEmergency.ts`; keep the simulated labels until a real,
  verified transport exists.

## Notes

- The reference's agency logo is not reproduced; the sidebar has a generic "Space Apps" badge you can
  swap for your official asset (see `Sidebar.tsx`).
- All data is illustrative demo data, not medical information.

## Parameter Checker rules

All thresholds in `src/lib/checker/rules.ts` are **illustrative, not clinically validated** and are labelled as such
in the UI. To use an approved set, provide a `RuleSet` with `meta.status: "approved"`; the engine and UI need no changes.
Principles: reference bands decide GREEN/YELLOW/RED; baseline and trend can raise GREEN to YELLOW only; implausible input or
unmet *required* measurement conditions give UNAVAILABLE (no classification); unmet *caveat* conditions lower confidence.

```bash
npm test    # engine unit tests (vitest)
```
