import { AgentSpecSchema, type AgentSpec, type DeploymentMode } from "@/domain/agent-spec";
import { normalizePlannerPayload } from "@/domain/normalize";
import { resolveFreeAuto, type FreeAutoInput } from "@/providers/free-auto";
import type { PlannerProvider } from "@/providers/types";

export type PlanAgentRequest = {
  prompt: string;
  deploymentMode: DeploymentMode;
};

export type PlannerDependencies = {
  availability: FreeAutoInput;
  providers: Partial<Record<"ollama" | "groq", PlannerProvider>>;
};

export type PlanAgentResult =
  | {
      status: "ready";
      spec: ReturnType<typeof AgentSpecSchema.parse>;
      provider: { id: "ollama" | "groq"; dataBoundary: "local" | "cloud"; reason: string };
    }
  | {
      status: "connection_required";
      providers: ["ollama", "groq"];
      reason: string;
      retryAfterSeconds?: number;
    }
  | { status: "invalid_spec"; provider: "ollama" | "groq"; issues: string[] };

export async function planAgent(
  request: PlanAgentRequest,
  dependencies: PlannerDependencies,
): Promise<PlanAgentResult> {
  const resolution = resolveFreeAuto(dependencies.availability);
  if (resolution.status === "connection_required") {
    return resolution;
  }

  const provider = dependencies.providers[resolution.provider];
  if (!provider) {
    return {
      status: "connection_required",
      providers: ["ollama", "groq"],
      reason: `The selected ${resolution.provider} provider is not configured.`,
    };
  }

  const proposed = await provider.plan(request);
  const parsed = normalizePlannerPayload(proposed);
  const spec = parsed.success ? parsed.data : buildSafeBaseline(request);

  return {
    status: "ready",
    spec,
    provider: {
      id: resolution.provider,
      dataBoundary: resolution.dataBoundary,
      reason: resolution.reason,
    },
  };
}

function buildSafeBaseline(request: PlanAgentRequest): AgentSpec {
  const goal = request.prompt.slice(0, 2_000);
  return AgentSpecSchema.parse({
    metadata: {
      version: "1.0",
      id: "generated-agent",
      name: "Generated agent",
      description: "A safe no-tool baseline compiled from the requested outcome.",
      revision: 1,
    },
    objective: {
      goal,
      taskTypes: ["custom-agent"],
      successCriteria: ["Return a result that directly addresses the requested goal."],
      failureConditions: ["The agent claims that an undeclared tool or action was executed."],
      inputSchema: { type: "object" },
      outputSchema: { type: "object" },
    },
    agents: [
      {
        id: "generated-agent",
        name: "Generated agent",
        role: "Safe no-tool baseline",
        instructions: `Complete the requested goal without external tools or side effects. Requested goal: ${goal}`,
        toolIds: [],
        handoffs: [],
      },
    ],
    models: {
      mode: "free-auto",
      allowedProviders: ["ollama", "groq"],
      preferredProvider: "free-auto",
      requirements: ["structured-output"],
      fallback: "ask",
    },
    tools: [],
    knowledge: [],
    state: [],
    workflow: {
      topology: "single",
      nodes: [
        { id: "agent", type: "agent", ref: "generated-agent" },
        { id: "done", type: "termination" },
      ],
      edges: [{ source: "agent", target: "done" }],
      termination: {
        maxSteps: 8,
        condition: "Stop after returning one schema-valid result.",
      },
    },
    budgets: {
      retryLimit: 2,
      maxSteps: 8,
      timeoutMs: 60_000,
      maxTokens: 8_000,
      maxCostUsd: 0,
    },
    runtime: {
      target: "openai-agents-ts",
      deploymentMode: request.deploymentMode,
      sandboxRequired: true,
    },
    evaluations: [
      {
        id: "baseline-goal",
        kind: "positive",
        input: { request: goal },
        expected: { status: "completed" },
        provenance: "spec-derived",
      },
    ],
    decisions: {
      confirmed: [`Use ${request.deploymentMode} execution.`],
      assumptions: [],
      warnings: [
        "The provider proposal was invalid, so Agentify emitted a safe no-tool baseline for review.",
      ],
      unresolved: [],
    },
  });
}
