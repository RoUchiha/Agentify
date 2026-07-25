import { buildAgentSpecMessages, parseProviderJson } from "@/providers/prompt";
import { ProviderRequestError, type PlannerProvider, type ProviderPlanInput } from "@/providers/types";

type Fetcher = typeof fetch;

export class OllamaProvider implements PlannerProvider {
  readonly id = "ollama" as const;
  private readonly baseUrl: string;
  private readonly fetcher: Fetcher;
  private readonly model: string;

  constructor(options: { baseUrl: string; model: string; fetcher?: Fetcher }) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.model = options.model;
    this.fetcher = options.fetcher ?? fetch;
  }

  async plan(input: ProviderPlanInput): Promise<unknown> {
    const messages = buildAgentSpecMessages(input.prompt);
    const response = await this.fetcher(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: messages.map((message) => `${message.role}: ${message.content}`).join("\n\n"),
        format: "json",
        stream: false,
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      throw new ProviderRequestError("Local Ollama could not plan this agent.", response.status);
    }

    const body = (await response.json()) as { response?: unknown };
    return parseProviderJson(body.response);
  }
}
