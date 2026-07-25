import type { AgentSpec, DeploymentMode, ProviderId } from "@/domain/agent-spec";

export type ProviderAvailability = {
  provider: "ollama" | "groq";
  available: boolean;
  dataBoundary: "local" | "cloud";
  model?: string;
  reason?: string;
  retryAfterSeconds?: number;
};

export type ProviderPlanInput = {
  prompt: string;
  deploymentMode?: DeploymentMode;
};

export type ProviderRunInput = {
  spec: AgentSpec;
  input: unknown;
};

export type ProviderRunOutput = {
  output: unknown;
  usage?: { inputTokens?: number; outputTokens?: number };
  toolRequest?: {
    toolId: string;
    arguments: unknown;
  };
};

export interface PlannerProvider {
  id: Extract<ProviderId, "ollama" | "groq">;
  plan(input: ProviderPlanInput): Promise<unknown>;
  run?(input: ProviderRunInput): Promise<ProviderRunOutput>;
}

export class ProviderRequestError extends Error {
  readonly status: number;
  readonly retryAfterSeconds?: number;

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.name = "ProviderRequestError";
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
