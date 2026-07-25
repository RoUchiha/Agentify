import type { AgentSpec } from "@/domain/agent-spec";
import {
  answerRequirement,
  applyAllSafeDefaults,
  type GapOption,
  type RequirementGap,
  type RequirementsCoverage,
} from "@/domain/requirements-coverage";

export function QuickFollowups({
  spec,
  coverage,
  onChange,
}: {
  spec: AgentSpec;
  coverage: RequirementsCoverage;
  onChange(spec: AgentSpec): void;
}) {
  const blocking = coverage.gaps.filter((gap) => gap.severity === "blocking");
  const current = blocking[0];
  const safeDefaults = blocking.filter((gap) => gap.safeDefaultEligible);

  if (!current) {
    return (
      <section className="quick-followups panel quick-complete">
        <div>
          <p className="eyebrow">Quick Build coverage</p>
          <h2>Ready for a test run</h2>
        </div>
        <p aria-live="polite">All required decisions are covered.</p>
      </section>
    );
  }

  return (
    <section aria-labelledby="quick-followup-title" className="quick-followups panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Required decision · 1 of {blocking.length}</p>
          <h2 id="quick-followup-title">{current.question}</h2>
        </div>
        <code>{current.path}</code>
      </div>
      <p className="followup-reason">{current.reason}</p>
      <div className="impact-row" aria-label="Decision impacts">
        {current.impacts.map((impact) => (
          <span key={impact}>{impact}</span>
        ))}
      </div>
      <OptionCard
        gap={current}
        label="Recommended · easiest"
        onSelect={(selected) => onChange(answerRequirement(spec, current, selected))}
        option={current.recommended}
        recommended
      />
      {current.alternatives.length > 0 && (
        <div className="followup-alternatives">
          <p>Other valid approaches</p>
          {current.alternatives.map((alternative) => (
            <OptionCard
              gap={current}
              key={alternative.id}
              label={effortLabel(alternative)}
              onSelect={(selected) => onChange(answerRequirement(spec, current, selected))}
              option={alternative}
            />
          ))}
        </div>
      )}
      {safeDefaults.length > 0 && (
        <button
          className="secondary-action safe-defaults-action"
          onClick={() => onChange(applyAllSafeDefaults(spec, coverage))}
          type="button"
        >
          Use all safe defaults
        </button>
      )}
      <p className="safe-default-note">
        Safe defaults never choose credentials, writes, public deployment, data residency, or
        retention for you.
      </p>
    </section>
  );
}

function OptionCard({
  option,
  label,
  recommended = false,
  onSelect,
}: {
  gap: RequirementGap;
  option: GapOption;
  label: string;
  recommended?: boolean;
  onSelect(option: GapOption): void;
}) {
  return (
    <article className={`followup-option ${recommended ? "recommended" : ""}`}>
      <div>
        <span>{label}</span>
        <strong>{option.label}</strong>
        <p>{option.explanation}</p>
      </div>
      <button
        aria-label={`Choose ${option.label}`}
        className={recommended ? "primary-action" : "secondary-action"}
        onClick={() => onSelect(option)}
        type="button"
      >
        Choose
      </button>
    </article>
  );
}

function effortLabel(option: GapOption): string {
  return `${option.effort[0]!.toUpperCase()}${option.effort.slice(1)} option`;
}
