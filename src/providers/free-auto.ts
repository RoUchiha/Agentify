import type { ProviderAvailability } from "@/providers/types";

export type FreeAutoInput = {
  ollama: ProviderAvailability;
  groq: ProviderAvailability;
};

export type FreeAutoResolution =
  | {
      status: "selected";
      provider: "ollama" | "groq";
      model?: string;
      dataBoundary: "local" | "cloud";
      reason: string;
    }
  | {
      status: "connection_required";
      providers: ["ollama", "groq"];
      reason: string;
      retryAfterSeconds?: number;
    };

export function resolveFreeAuto(input: FreeAutoInput): FreeAutoResolution {
  if (input.ollama.available) {
    return {
      status: "selected",
      provider: "ollama",
      model: input.ollama.model,
      dataBoundary: "local",
      reason: "A capable local Ollama model is available, so project data stays local.",
    };
  }

  if (input.groq.available) {
    return {
      status: "selected",
      provider: "groq",
      dataBoundary: "cloud",
      reason: "Ollama is unavailable; configured Groq Free Cloud will plan this agent.",
    };
  }

  return {
    status: "connection_required",
    providers: ["ollama", "groq"],
    reason: "Connect a local Ollama model or configure Groq Free Cloud.",
    ...(input.groq.retryAfterSeconds === undefined
      ? {}
      : { retryAfterSeconds: input.groq.retryAfterSeconds }),
  };
}
