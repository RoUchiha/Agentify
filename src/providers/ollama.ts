import {
  buildAgentRunMessages,
  buildAgentSpecMessages,
  parseProviderJson,
} from "@/providers/prompt";
import {
  ProviderRequestError,
  type PlannerProvider,
  type ProviderPlanInput,
  type ProviderRunInput,
  type ProviderRunOutput,
} from "@/providers/types";

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

  async run(input: ProviderRunInput): Promise<ProviderRunOutput> {
    const messages = buildAgentRunMessages(input.spec, input.input);
    const response = await this.fetcher(`${this.baseUrl}/api/generate`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt: messages.map((message) => `${message.role}: ${message.content}`).join("\n\n"),
        format: "json",
        stream: false,
      }),
      signal: AbortSignal.timeout(input.spec.budgets.timeoutMs),
    });

    if (!response.ok) {
      throw new ProviderRequestError("Local Ollama could not run this agent.", response.status);
    }

    const body = (await response.json()) as {
      response?: unknown;
      prompt_eval_count?: number;
      eval_count?: number;
    };
    const parsed = parseProviderJson(body.response);
    const result =
      typeof parsed === "object" && parsed !== null
        ? (parsed as ProviderRunOutput)
        : { output: parsed };
    return {
      ...result,
      usage: result.usage ?? {
        inputTokens: body.prompt_eval_count,
        outputTokens: body.eval_count,
      },
    };
  }
}
