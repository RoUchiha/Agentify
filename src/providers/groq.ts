import { buildAgentSpecMessages, parseProviderJson } from "@/providers/prompt";
import { ProviderRequestError, type PlannerProvider, type ProviderPlanInput } from "@/providers/types";

type Fetcher = typeof fetch;

export class GroqProvider implements PlannerProvider {
  readonly id = "groq" as const;
  private readonly apiKey: string;
  private readonly fetcher: Fetcher;
  private readonly model: string;

  constructor(options: { apiKey: string; fetcher?: Fetcher; model?: string }) {
    this.apiKey = options.apiKey;
    this.fetcher = options.fetcher ?? fetch;
    this.model = options.model ?? "llama-3.3-70b-versatile";
  }

  async plan(input: ProviderPlanInput): Promise<unknown> {
    const response = await this.fetcher("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: buildAgentSpecMessages(input.prompt),
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw providerError(response, "Groq could not plan this agent.");
    }

    const body = (await response.json()) as {
      choices?: Array<{ message?: { content?: unknown } }>;
    };
    return parseProviderJson(body.choices?.[0]?.message?.content);
  }
}

function providerError(response: Response, message: string): ProviderRequestError {
  const retryAfter = response.headers.get("retry-after");
  const parsed = retryAfter === null ? undefined : Number.parseInt(retryAfter, 10);
  return new ProviderRequestError(
    message,
    response.status,
    Number.isFinite(parsed) ? parsed : undefined,
  );
}
