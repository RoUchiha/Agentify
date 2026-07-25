import { describe, expect, test, vi } from "vitest";

import { demoAgentSpec } from "@/domain/demo";
import { GroqProvider } from "@/providers/groq";
import { OllamaProvider } from "@/providers/ollama";
import { ProviderRequestError } from "@/providers/types";

describe("provider adapters", () => {
  test("Groq sends a server-side bearer credential and parses structured output", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({
        choices: [{ message: { content: JSON.stringify(demoAgentSpec) } }],
      }),
    );
    const provider = new GroqProvider({ apiKey: "server-secret", fetcher });

    await expect(provider.plan({ prompt: "Build a support agent." })).resolves.toEqual(
      demoAgentSpec,
    );
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.groq.com/openai/v1/chat/completions",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer server-secret" }),
      }),
    );
  });

  test("Groq preserves retry-after seconds on rate limiting", async () => {
    const provider = new GroqProvider({
      apiKey: "server-secret",
      fetcher: vi.fn().mockResolvedValue(
        new Response("limited", { status: 429, headers: { "retry-after": "7" } }),
      ),
    });

    await expect(provider.plan({ prompt: "Build a support agent." })).rejects.toMatchObject({
      status: 429,
      retryAfterSeconds: 7,
    } satisfies Partial<ProviderRequestError>);
  });

  test("Ollama requests JSON output through the paired local runner", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      Response.json({ response: JSON.stringify(demoAgentSpec) }),
    );
    const provider = new OllamaProvider({
      baseUrl: "http://127.0.0.1:11434",
      model: "qwen3",
      fetcher,
    });

    await expect(provider.plan({ prompt: "Build a support agent." })).resolves.toEqual(
      demoAgentSpec,
    );
    expect(fetcher).toHaveBeenCalledWith(
      "http://127.0.0.1:11434/api/generate",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
