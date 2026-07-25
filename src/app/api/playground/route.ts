import { resolveFreeAuto } from "@/providers/free-auto";
import { GroqProvider } from "@/providers/groq";
import { OllamaProvider } from "@/providers/ollama";
import { executePlayground } from "@/server/playground";
import { createPlaygroundRoute } from "@/server/routes/playground";

export const POST = createPlaygroundRoute({
  run: async (request) => {
    const groqKey = process.env.GROQ_API_KEY;
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;
    const ollamaModel = process.env.OLLAMA_MODEL;
    const resolution = resolveFreeAuto({
      ollama: {
        provider: "ollama",
        available: Boolean(ollamaBaseUrl && ollamaModel),
        dataBoundary: "local",
        model: ollamaModel,
      },
      groq: {
        provider: "groq",
        available: Boolean(groqKey),
        dataBoundary: "cloud",
      },
    });

    if (resolution.status === "connection_required") {
      return {
        status: "failed",
        trace: [
          {
            sequence: 1,
            type: "run_failed",
            detail: resolution.reason,
            timestamp: new Date().toISOString(),
          },
        ],
        latencyMs: 0,
        terminalReason: "provider_unavailable",
      };
    }

    const provider =
      resolution.provider === "ollama"
        ? new OllamaProvider({ baseUrl: ollamaBaseUrl!, model: ollamaModel! })
        : new GroqProvider({ apiKey: groqKey! });
    return executePlayground(request, provider);
  },
});
