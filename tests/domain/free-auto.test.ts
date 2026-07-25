import { describe, expect, test } from "vitest";

import { resolveFreeAuto } from "@/providers/free-auto";

describe("resolveFreeAuto", () => {
  test("selects a capable local Ollama model before Groq", () => {
    expect(
      resolveFreeAuto({
        ollama: {
          provider: "ollama",
          available: true,
          model: "qwen3",
          dataBoundary: "local",
        },
        groq: { provider: "groq", available: true, dataBoundary: "cloud" },
      }),
    ).toMatchObject({
      status: "selected",
      provider: "ollama",
      model: "qwen3",
      dataBoundary: "local",
    });
  });

  test("selects Groq when Ollama is unavailable", () => {
    expect(
      resolveFreeAuto({
        ollama: { provider: "ollama", available: false, dataBoundary: "local" },
        groq: { provider: "groq", available: true, dataBoundary: "cloud" },
      }),
    ).toMatchObject({ status: "selected", provider: "groq", dataBoundary: "cloud" });
  });

  test("returns connection_required when neither provider is usable", () => {
    expect(
      resolveFreeAuto({
        ollama: { provider: "ollama", available: false, dataBoundary: "local" },
        groq: { provider: "groq", available: false, dataBoundary: "cloud" },
      }),
    ).toEqual({
      status: "connection_required",
      providers: ["ollama", "groq"],
      reason: "Connect a local Ollama model or configure Groq Free Cloud.",
    });
  });

  test("preserves Groq cooldown evidence", () => {
    expect(
      resolveFreeAuto({
        ollama: { provider: "ollama", available: false, dataBoundary: "local" },
        groq: {
          provider: "groq",
          available: false,
          dataBoundary: "cloud",
          retryAfterSeconds: 12,
        },
      }),
    ).toMatchObject({ status: "connection_required", retryAfterSeconds: 12 });
  });
});
