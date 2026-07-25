import type { DeploymentMode } from "@/domain/agent-spec";
import { AgentSpecSchema } from "@/domain/agent-spec";
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
  const parsed = AgentSpecSchema.safeParse(proposed);
  if (!parsed.success) {
    return {
      status: "invalid_spec",
      provider: resolution.provider,
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }

  return {
    status: "ready",
    spec: parsed.data,
    provider: {
      id: resolution.provider,
      dataBoundary: resolution.dataBoundary,
      reason: resolution.reason,
    },
  };
}
