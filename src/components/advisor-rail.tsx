"use client";

import { useState } from "react";

import type { AgentSpec } from "@/domain/agent-spec";
import type { AdvisoryFinding } from "@/domain/advisor";
import { applySpecPatches, getSpecValue } from "@/domain/spec-path";

type AdvisorRailProps = {
  spec: AgentSpec;
  findings: AdvisoryFinding[];
  onChange(spec: AgentSpec): void;
  onDismiss(id: string): void;
  onEditPaths?(paths: string[]): void;
};

const SEVERITIES = [
  { id: "blocking", label: "Blocking advice" },
  { id: "recommended", label: "Recommended advice" },
  { id: "optional", label: "Optional advice" },
] as const;

export function AdvisorRail({
  spec,
  findings,
  onChange,
  onDismiss,
  onEditPaths,
}: AdvisorRailProps) {
  if (findings.length === 0) {
    return (
      <aside aria-label="Agent design advisor" className="advisor-rail advisor-clear">
        <p className="eyebrow">Design advisor</p>
        <h2>No active suggestions</h2>
        <p>The accepted spec passes the current deterministic design review.</p>
      </aside>
    );
  }

  return (
    <aside aria-label="Agent design advisor" className="advisor-rail">
      <header>
        <p className="eyebrow">Design advisor</p>
        <h2>Review before applying</h2>
        <p>Suggestions never change the accepted AgentSpec until you explicitly apply them.</p>
      </header>
      {SEVERITIES.map((severity) => {
        const group = findings.filter((finding) => finding.severity === severity.id);
        if (group.length === 0) return null;
        return (
          <fieldset
            aria-label={severity.label}
            className={`advisor-group ${severity.id}`}
            key={severity.id}
          >
            <legend>
              {severity.label} <span>{group.length}</span>
            </legend>
            {group.map((finding) => (
              <FindingCard
                finding={finding}
                key={finding.id}
                onChange={onChange}
                onDismiss={onDismiss}
                onEditPaths={onEditPaths}
                spec={spec}
              />
            ))}
          </fieldset>
        );
      })}
    </aside>
  );
}

function FindingCard({
  spec,
  finding,
  onChange,
  onDismiss,
  onEditPaths,
}: Omit<AdvisorRailProps, "findings"> & { finding: AdvisoryFinding }) {
  const [reviewing, setReviewing] = useState(false);
  const [issue, setIssue] = useState<string>();

  function applySuggestion() {
    const result = applySpecPatches(spec, finding.patches);
    if (!result.success) {
      setIssue(
        "This suggestion no longer applies to the accepted spec. Edit the fields or refresh the advice.",
      );
      return;
    }
    setIssue(undefined);
    onChange(result.data);
  }

  return (
    <article className="advisor-card">
      <div className="advisor-card-heading">
        <span>{finding.category}</span>
        <h3>{finding.title}</h3>
      </div>
      <p>{finding.explanation}</p>
      <details>
        <summary>Why this was suggested</summary>
        <ul>
          {finding.evidence.map((evidence) => (
            <li key={evidence}>{evidence}</li>
          ))}
        </ul>
      </details>
      <div className="advisor-impacts">
        {finding.impacts.map((impact) => (
          <span key={impact}>{impact}</span>
        ))}
      </div>
      {reviewing && finding.patches.length > 0 && (
        <div aria-label="Suggestion preview" className="advisor-preview">
          {finding.patches.map((patch) => (
            <div key={patch.path}>
              <code>{patch.path}</code>
              <span>
                {formatValue(safeGetValue(spec, patch.path))} → {formatValue(patch.value)}
              </span>
            </div>
          ))}
        </div>
      )}
      {issue && (
        <p className="inline-error" role="alert">
          {issue}
        </p>
      )}
      <div className="advisor-actions">
        {finding.patches.length > 0 && !reviewing && (
          <button onClick={() => setReviewing(true)} type="button">
            Review change
          </button>
        )}
        {finding.patches.length > 0 && reviewing && (
          <button className="primary-action" onClick={applySuggestion} type="button">
            Apply suggestion
          </button>
        )}
        <button onClick={() => onEditPaths?.(finding.paths)} type="button">
          Edit fields
        </button>
        <button onClick={() => onDismiss(finding.id)} type="button">
          Dismiss
        </button>
      </div>
    </article>
  );
}

function safeGetValue(spec: AgentSpec, path: string): unknown {
  try {
    return getSpecValue(spec, path);
  } catch {
    return undefined;
  }
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (value === undefined) return "unavailable";
  return JSON.stringify(value);
}
