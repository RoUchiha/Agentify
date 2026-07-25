import type { AgentSpec } from "@/domain/agent-spec";
import { analyzeRequirements } from "@/domain/requirements-coverage";

export type SpecIssue = {
  code:
    | "destructive_authorization_required"
    | "unresolved_decision"
    | "restricted_cloud_confirmation_required";
  message: string;
  toolId?: string;
  path?: string;
};

export type RuntimeApproval = {
  toolId: string;
  timing: "runtime";
};

export type SpecDecision = {
  status: "ready" | "needs_attention";
  approvals: RuntimeApproval[];
  issues: SpecIssue[];
};

export function evaluateSpec(spec: AgentSpec): SpecDecision {
  const issues: SpecIssue[] = analyzeRequirements(spec)
    .gaps.filter((gap) => gap.path.startsWith("decisions.unresolved."))
    .map((gap) => ({
      code: "unresolved_decision",
      message: gap.question,
      path: gap.path,
    }));
  const approvals: RuntimeApproval[] = [];

  for (const tool of spec.tools) {
    if (tool.mode !== "write") {
      continue;
    }

    approvals.push({ toolId: tool.id, timing: "runtime" });
    if (
      (tool.risk === "high" || tool.risk === "critical") &&
      !spec.decisions.confirmed.includes(`Authorize high-risk tool: ${tool.id}`)
    ) {
      issues.push({
        code: "destructive_authorization_required",
        toolId: tool.id,
        message: `Confirm the high-risk write capability ${tool.name} before building.`,
      });
    }
  }

  if (
    spec.runtime.deploymentMode === "cloud" &&
    spec.knowledge.some((source) => source.classification === "restricted") &&
    !spec.decisions.confirmed.includes("Authorize restricted data for Cloud execution.")
  ) {
    issues.push({
      code: "restricted_cloud_confirmation_required",
      message: "Restricted knowledge requires explicit confirmation before Cloud execution.",
    });
  }

  return {
    status: issues.length === 0 ? "ready" : "needs_attention",
    approvals,
    issues,
  };
}
