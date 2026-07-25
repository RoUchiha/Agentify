import { AgentSpecSchema } from "@/domain/agent-spec";
import { resolveFreeAuto } from "@/providers/free-auto";
import { GroqProvider } from "@/providers/groq";
import { OllamaProvider } from "@/providers/ollama";
import {
  executePlayground,
  type PlaygroundRequest,
  type PlaygroundRun,
} from "@/server/playground";

type RouteDependencies = {
  run(request: PlaygroundRequest): Promise<PlaygroundRun>;
};

export function createPlaygroundRoute(dependencies: RouteDependencies) {
  return async function post(request: Request): Promise<Response> {
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return Response.json({ issues: ["Request body must be valid JSON."] }, { status: 400 });
    }

    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return Response.json({ issues: ["Request body must be an object."] }, { status: 400 });
    }
    const value = input as Record<string, unknown>;
    const parsedSpec = AgentSpecSchema.safeParse(value.spec);
    if (!parsedSpec.success) {
      return Response.json(
        { issues: parsedSpec.error.issues.map((issue) => issue.message) },
        { status: 400 },
      );
    }

    const result = await dependencies.run({ spec: parsedSpec.data, input: value.input });
    return Response.json(result, { status: 200 });
  };
}

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
