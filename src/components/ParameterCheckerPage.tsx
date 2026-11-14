import type { ParameterChecker } from "../hooks/useParameterChecker";
import type { LiveVitals } from "../types";
import { AetherCheckerPanel } from "./AetherCheckerPanel";
import { AssessmentPanel } from "./AssessmentPanel";
import { HealthTrendsPanel } from "./HealthTrendsPanel";
import { ReferenceRulesPanel } from "./ReferenceRulesPanel";

interface Props {
  checker: ParameterChecker;
  live: LiveVitals;
  now: Date;
}

/**
 * AETHER Parameter Checker page: one large trend graph over three panels (checker, assessment, reference rules).
 * The previous full-analysis layout is kept, unmounted, in ParameterCheckerPageClassic.tsx.
 */
export function ParameterCheckerPage({ checker, live, now }: Props) {
  return (
    <>
      <HealthTrendsPanel checker={checker} live={live} now={now} />
      <div className="grid gap-4 lg:grid-cols-3">
        <AetherCheckerPanel checker={checker} />
        <AssessmentPanel checker={checker} />
        <ReferenceRulesPanel checker={checker} />
      </div>
    </>
  );
}
