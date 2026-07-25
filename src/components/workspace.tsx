"use client";

import { useState } from "react";

import {
  BuildModeToggle,
  type BuildMode,
} from "@/components/build-mode-toggle";
import { AdvancedStudio } from "@/components/advanced-studio";
import { DesignSummary } from "@/components/design-summary";
import { ArtifactDelivery } from "@/components/artifact-delivery";
import { ProgressRail } from "@/components/progress-rail";
import { Playground, runPlaygroundFromApi, type PlaygroundRunner } from "@/components/playground";
import { PromptIntake } from "@/components/prompt-intake";
import { ProviderStatus } from "@/components/provider-status";
import { QuickFollowups } from "@/components/quick-followups";
import { VisualCanvas } from "@/components/visual-canvas";
import type { AgentSpec, DeploymentMode } from "@/domain/agent-spec";
import type { BuildAgentInput, BuildResult } from "@/connectors/harness-builder";
import { materializeCustomization } from "@/domain/customization";
import { toVisualGraph } from "@/domain/graph";
import { evaluateSpec } from "@/domain/policy";
import { analyzeRequirements } from "@/domain/requirements-coverage";
import type { PlanAgentResult } from "@/server/planner";
import type { PlaygroundRun } from "@/server/playground";

export type Planner = (request: {
  prompt: string;
  deploymentMode: DeploymentMode;
}) => Promise<PlanAgentResult>;
export type BuildRunner = (request: BuildAgentInput) => Promise<BuildResult>;

type WorkspaceStatus =
  | "draft"
  | "planning"
  | "needs_attention"
  | "ready"
  | "testing"
  | "building"
  | "packaged"
  | "failed";

type WorkspaceProps = {
  planner?: Planner;
  playgroundRunner?: PlaygroundRunner;
  buildRunner?: BuildRunner;
  autoContinue?: boolean;
};

export function Workspace(props: WorkspaceProps) {
  const planner = props.planner ?? planFromApi;
  const playgroundRunner = props.playgroundRunner ?? runPlaygroundFromApi;
  const buildRunner = props.buildRunner ?? buildFromApi;
  const autoContinue = props.autoContinue ?? props.planner === undefined;
  const [status, setStatus] = useState<WorkspaceStatus>("draft");
  const [spec, setSpec] = useState<AgentSpec>();
  const [provider, setProvider] = useState<
    { id: "ollama" | "groq"; dataBoundary: "local" | "cloud"; reason: string } | undefined
  >();
  const [issue, setIssue] = useState<string>();
  const [mode, setMode] = useState<BuildMode>("quick");
  const [tested, setTested] = useState(false);
  const [buildResult, setBuildResult] = useState<BuildResult>();
  const [building, setBuilding] = useState(false);
  const [buildIssue, setBuildIssue] = useState<string>();
  const [playgroundResult, setPlaygroundResult] = useState<PlaygroundRun>();
  const coverage = spec ? analyzeRequirements(spec) : undefined;
  const blockingGapCount =
    coverage?.gaps.filter((gap) => gap.severity === "blocking").length ?? 0;
  const blockedReason =
    blockingGapCount > 0
      ? `Resolve ${blockingGapCount} required decision${blockingGapCount === 1 ? "" : "s"}`
      : undefined;

  async function design(request: { prompt: string; deploymentMode: DeploymentMode }) {
    setStatus("planning");
    setIssue(undefined);
    try {
      const result = await planner(request);
      if (result.status === "ready") {
        const acceptedSpec = materializeCustomization(result.spec);
        setSpec(acceptedSpec);
        setProvider(result.provider);
        const decision = evaluateSpec(acceptedSpec);
        const nextCoverage = analyzeRequirements(acceptedSpec);
        setStatus(nextCoverage.complete ? decision.status : "needs_attention");
        setTested(false);
        setBuildResult(undefined);
        setPlaygroundResult(undefined);
        if (autoContinue && nextCoverage.complete && decision.status === "ready") {
          await runAutomaticPipeline(acceptedSpec);
        }
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

  async function runAutomaticPipeline(plannedSpec: AgentSpec) {
    setStatus("testing");
    const playgroundRun = await playgroundRunner({
      spec: plannedSpec,
      input: plannedSpec.evaluations[0]?.input ?? {},
    });
    setPlaygroundResult(playgroundRun);
    setTested(true);
    if (playgroundRun.status !== "completed") {
      setStatus(playgroundRun.status === "needs_approval" ? "needs_attention" : "failed");
      setIssue(
        playgroundRun.trace.at(-1)?.detail ??
          "The automatic Playground run did not reach a safe completion.",
      );
      return;
    }

    setStatus("building");
    setBuilding(true);
    try {
      const result = await buildRunner({
        spec: plannedSpec,
        target: plannedSpec.runtime.target,
        executionProfile: plannedSpec.runtime.deploymentMode,
      });
      setBuildResult(result);
      setStatus(result.status === "packaged" ? "packaged" : "failed");
    } finally {
      setBuilding(false);
    }
  }

  async function build() {
    if (!spec) {
      return;
    }
    if (!analyzeRequirements(spec).complete) {
      setBuildIssue("Resolve the required Quick Build decisions before packaging.");
      setStatus("needs_attention");
      return;
    }
    setBuilding(true);
    setStatus("building");
    setBuildIssue(undefined);
    try {
      const result = await buildRunner({
        spec,
        target: spec.runtime.target,
        executionProfile: spec.runtime.deploymentMode,
      });
      setBuildResult(result);
      setStatus(result.status === "packaged" ? "packaged" : "failed");
    } catch (error) {
      setBuildIssue(error instanceof Error ? error.message : "HarnessBuilder is unavailable.");
      setStatus("failed");
    } finally {
      setBuilding(false);
    }
  }

  function acceptSpec(nextSpec: AgentSpec, automatic = false) {
    const nextCoverage = analyzeRequirements(nextSpec);
    const decision = evaluateSpec(nextSpec);
    setSpec(nextSpec);
    setStatus(nextCoverage.complete ? decision.status : "needs_attention");
    setTested(false);
    setBuildResult(undefined);
    setBuildIssue(undefined);
    setPlaygroundResult(undefined);
    if (automatic && autoContinue && nextCoverage.complete && decision.status === "ready") {
      void runAutomaticPipeline(nextSpec);
    }
  }

  return (
    <main className="workspace-shell">
      <header className="workspace-header">
        <div>
          <p className="eyebrow">Agentify / describe → verify → deliver</p>
          <h1>Describe the agent you need.</h1>
          <p className="workspace-lede">
            Start with the outcome. Inspect every assumption before HarnessBuilder turns it into a
            tested package.
          </p>
        </div>
        <div className="header-controls">
          <BuildModeToggle mode={mode} onChange={setMode} />
          <span className={`run-state ${status}`} role="status">
            {statusLabel(status)}
          </span>
        </div>
      </header>

      <ProgressRail
        active={
          buildResult?.status === "packaged"
            ? "Deliver"
            : building || buildResult
              ? "Build"
              : tested
                ? "Test"
                : spec
                  ? "Design"
                  : "Describe"
        }
      />

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
              {mode === "quick" && coverage && (
                <QuickFollowups
                  coverage={coverage}
                  onChange={(nextSpec) => acceptSpec(nextSpec, true)}
                  spec={spec}
                />
              )}
              {mode === "advanced" && (
                <div className="advanced-grid">
                  <VisualCanvas graph={toVisualGraph(spec)} />
                  <AdvancedStudio
                    onChange={(nextSpec) => acceptSpec(nextSpec)}
                    spec={spec}
                  />
                </div>
              )}
              <Playground
                blockedReason={blockedReason}
                onRunComplete={(result) => {
                  setTested(true);
                  setPlaygroundResult(result);
                }}
                runner={playgroundRunner}
                runResult={playgroundResult}
                spec={spec}
              />
              <ArtifactDelivery
                blockedReason={blockedReason}
                building={building}
                issue={buildIssue}
                onBuild={build}
                result={buildResult}
              />
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
  if (!response.ok) {
    const errorBody =
      typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const issues = Array.isArray(errorBody.issues)
      ? errorBody.issues.filter((issue): issue is string => typeof issue === "string")
      : [];
    const reason = typeof errorBody.reason === "string" ? errorBody.reason : undefined;
    const retryAfter =
      typeof errorBody.retryAfterSeconds === "number"
        ? ` Try again in ${errorBody.retryAfterSeconds} seconds.`
        : "";
    throw new Error(
      `${issues.join(" ") || reason || "Agent planning failed safely."}${retryAfter}`,
    );
  }
  if (!("status" in body)) {
    throw new Error(body.issues?.join(" ") || "Agent planning failed safely.");
  }
  return body;
}

async function buildFromApi(request: BuildAgentInput): Promise<BuildResult> {
  const response = await fetch("/api/build", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  const body = (await response.json()) as BuildResult | { issues?: string[] };
  if (!response.ok || !("buildId" in body)) {
    const issues =
      "issues" in body && Array.isArray(body.issues)
        ? body.issues.filter((issue): issue is string => typeof issue === "string")
        : undefined;
    throw new Error(issues?.join(" ") || "HarnessBuilder could not package this agent.");
  }
  return body;
}

function statusLabel(status: WorkspaceStatus): string {
  const labels: Record<WorkspaceStatus, string> = {
    draft: "Awaiting brief",
    planning: "Planning with Free Auto",
    needs_attention: "Needs attention",
    ready: "Ready to test",
    testing: "Running spec evaluation",
    building: "Building with HarnessBuilder",
    packaged: "Verified package ready",
    failed: "Planning failed",
  };
  return labels[status];
}
