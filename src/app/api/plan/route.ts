import { GroqProvider } from "@/providers/groq";
import { OllamaProvider } from "@/providers/ollama";
import { planAgent } from "@/server/planner";
import { createPlanRoute } from "@/server/routes/plan";

export const POST = createPlanRoute({
  plan: async (request) => {
    const groqKey = process.env.GROQ_API_KEY;
    const ollamaBaseUrl = process.env.OLLAMA_BASE_URL;
    const ollamaModel = process.env.OLLAMA_MODEL;
    return planAgent(request, {
      availability: {
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
      },
      providers: {
        ...(groqKey ? { groq: new GroqProvider({ apiKey: groqKey }) } : {}),
        ...(ollamaBaseUrl && ollamaModel
          ? { ollama: new OllamaProvider({ baseUrl: ollamaBaseUrl, model: ollamaModel }) }
          : {}),
      },
    });
  },
});
