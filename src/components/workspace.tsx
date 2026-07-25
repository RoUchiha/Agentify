"use client";

import { useState } from "react";

import { DesignSummary } from "@/components/design-summary";
import { ProgressRail } from "@/components/progress-rail";
import { PromptIntake } from "@/components/prompt-intake";
import { ProviderStatus } from "@/components/provider-status";
import { SpecEditor } from "@/components/spec-editor";
import { VisualCanvas } from "@/components/visual-canvas";
import type { AgentSpec, DeploymentMode } from "@/domain/agent-spec";
import { toVisualGraph } from "@/domain/graph";
import type { PlanAgentResult } from "@/server/planner";

export type Planner = (request: {
  prompt: string;
  deploymentMode: DeploymentMode;
}) => Promise<PlanAgentResult>;

type WorkspaceStatus = "draft" | "planning" | "needs_attention" | "ready" | "failed";

export function Workspace({ planner = planFromApi }: { planner?: Planner }) {
  const [status, setStatus] = useState<WorkspaceStatus>("draft");
  const [spec, setSpec] = useState<AgentSpec>();
  const [provider, setProvider] = useState<
    { id: "ollama" | "groq"; dataBoundary: "local" | "cloud"; reason: string } | undefined
  >();
  const [issue, setIssue] = useState<string>();
  const [advanced, setAdvanced] = useState(false);

  async function design(request: { prompt: string; deploymentMode: DeploymentMode }) {
    setStatus("planning");
    setIssue(undefined);
    try {
      const result = await planner(request);
      if (result.status === "ready") {
        setSpec(result.spec);
        setProvider(result.provider);
        setStatus(result.spec.decisions.unresolved.length > 0 ? "needs_attention" : "ready");
        return;
      }
      setSpec(undefined);
      setProvider(undefined);
      setStatus(result.status === "invalid_spec" ? "failed" : "needs_attention");
      setIssue(
        result.status === "invalid_spec"
          ? result.issues.join(" ")
          : `${result.reason}${
              result.retryAfterSeconds === undefined
                ? ""
                : ` Try again in ${result.retryAfterSeconds} seconds.`
            }`,
      );
    } catch (error) {
      setStatus("failed");
      setIssue(error instanceof Error ? error.message : "Planning failed safely.");
    }
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Agent Builder / describe → verify → deliver</p>
          <h1>Describe the agent you need.</h1>
          <p className="workspace-lede">
            Start with the outcome. Inspect every assumption before HarnessBuilder turns it into a
            tested package.
          </p>
        </div>
        <div className="header-controls">
          <label className="advanced-toggle">
            <span>Advanced</span>
            <input
              aria-label="Advanced"
              aria-checked={advanced}
              checked={advanced}
              onChange={(event) => setAdvanced(event.target.checked)}
              role="switch"
              type="checkbox"
            />
          </label>
          <span className={`run-state ${status}`} role="status">
            {statusLabel(status)}
          </span>
        </div>
      </header>

      <ProgressRail active={spec ? "Design" : "Describe"} />

      {issue && (
        <p className="error-banner" role="alert">
          {issue}
        </p>
      )}

      <div className="builder-grid">
        <aside className="intake-column">
          <PromptIntake busy={status === "planning"} onSubmit={design} />
          <ProviderStatus provider={provider} />
        </aside>
        <div className="design-column">
          {spec ? (
            <>
              <DesignSummary spec={spec} />
              {advanced && (
                <div className="advanced-grid">
                  <VisualCanvas graph={toVisualGraph(spec)} />
                  <SpecEditor onChange={setSpec} spec={spec} />
                </div>
              )}
            </>
          ) : (
            <section className="empty-design panel">
              <p className="eyebrow">Design surface</p>
              <h2>Your agent architecture will appear here.</h2>
              <p>
                Free Auto chooses the planning provider. Deterministic validation—not the
                provider—decides whether the result is safe to test.
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

async function planFromApi(request: {
  prompt: string;
  deploymentMode: DeploymentMode;
}): Promise<PlanAgentResult> {
  const response = await fetch("/api/plan", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  const body = (await response.json()) as PlanAgentResult | { issues?: string[] };
  if (!("status" in body)) {
    throw new Error(body.issues?.join(" ") || "Agent planning failed safely.");
  }
  return body;
}

function statusLabel(status: WorkspaceStatus): string {
  const labels: Record<WorkspaceStatus, string> = {
    draft: "Awaiting brief",
    planning: "Planning with Free Auto",
    needs_attention: "Needs attention",
    ready: "Ready to test",
    failed: "Planning failed",
  };
  return labels[status];
}
