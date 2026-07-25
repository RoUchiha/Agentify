"use client";

import { useEffect, useMemo, useState } from "react";

import { ConfigField } from "@/components/config-field";
import { SpecEditor } from "@/components/spec-editor";
import {
  fieldLabel,
  STUDIO_SECTIONS,
  type StudioSection,
} from "@/components/studio-sections";
import type { AgentSpec } from "@/domain/agent-spec";
import { applySpecPatches, getSpecValue } from "@/domain/spec-path";

export function AdvancedStudio({
  spec,
  onChange,
}: {
  spec: AgentSpec;
  onChange(spec: AgentSpec): void;
}) {
  const [activeId, setActiveId] = useState(STUDIO_SECTIONS[0]!.id);
  const active = STUDIO_SECTIONS.find((section) => section.id === activeId)!;
  const initialDrafts = useMemo(() => draftRoots(spec, active), [spec, active]);
  const [drafts, setDrafts] = useState<Record<string, unknown>>(initialDrafts);
  const [issues, setIssues] = useState<string[]>([]);

  useEffect(() => {
    setDrafts(initialDrafts);
    setIssues([]);
  }, [initialDrafts]);

  function applySection() {
    const result = applySpecPatches(
      spec,
      active.roots.map((path) => ({ path, value: drafts[path] })),
    );
    if (!result.success) {
      setIssues(
        result.error.issues.map(
          (issue) => `${issue.path.join(".") || "root"}: ${issue.message}`,
        ),
      );
      return;
    }
    setIssues([]);
    onChange(result.data);
  }

  return (
    <section aria-label="Advanced Build studio" className="advanced-studio">
      <nav aria-label="Advanced configuration sections" className="studio-navigation">
        {STUDIO_SECTIONS.map((section) => (
          <button
            aria-current={section.id === active.id ? "page" : undefined}
            key={section.id}
            onClick={() => setActiveId(section.id)}
            type="button"
          >
            {section.label}
          </button>
        ))}
      </nav>
      <div className="studio-workspace">
        <header className="studio-heading">
          <div>
            <p className="eyebrow">Advanced Build</p>
            <h2>{active.label}</h2>
            <p>{active.description}</p>
          </div>
          {!active.raw && (
            <div className="button-row">
              <button
                className="secondary-action"
                onClick={() => setDrafts(draftRoots(spec, active))}
                type="button"
              >
                Reset section
              </button>
              <button className="primary-action" onClick={applySection} type="button">
                Apply section
              </button>
            </div>
          )}
        </header>
        {issues.length > 0 && (
          <div className="inline-error" role="alert">
            <strong>Fix this section before it replaces the accepted spec.</strong>
            <ul>
              {issues.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </div>
        )}
        {active.raw ? (
          <SpecEditor onChange={onChange} spec={spec} />
        ) : (
          <div className="studio-fields">
            {active.roots.map((root) => (
              <ConfigField
                key={root}
                label={fieldLabel(root)}
                onChange={(value) => setDrafts((current) => ({ ...current, [root]: value }))}
                path={root}
                value={drafts[root]}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function draftRoots(spec: AgentSpec, section: StudioSection): Record<string, unknown> {
  return Object.fromEntries(
    section.roots.map((root) => [root, structuredClone(getSpecValue(spec, root))]),
  );
}
