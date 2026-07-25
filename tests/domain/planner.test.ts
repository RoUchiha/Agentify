import { describe, expect, test, vi } from "vitest";

import { demoAgentSpec } from "@/domain/demo";
import { planAgent } from "@/server/planner";
import type { PlannerProvider } from "@/providers/types";

describe("planAgent", () => {
  test("returns a validated spec from the selected provider", async () => {
    const provider: PlannerProvider = {
      id: "groq",
      plan: vi.fn().mockResolvedValue(demoAgentSpec),
      run: vi.fn(),
    };

    const result = await planAgent(
      { prompt: "Build an agent that triages support tickets.", deploymentMode: "hybrid" },
      {
        availability: {
          ollama: { provider: "ollama", available: false, dataBoundary: "local" },
          groq: { provider: "groq", available: true, dataBoundary: "cloud" },
        },
        providers: { groq: provider },
      },
    );

    expect(result).toMatchObject({
      status: "ready",
      spec: demoAgentSpec,
      provider: { id: "groq", dataBoundary: "cloud" },
    });
    expect(provider.plan).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: expect.stringMatching(/triages support/i) }),
    );
  });

  test("returns invalid_spec when provider output violates the contract", async () => {
    const result = await planAgent(
      { prompt: "Build a useful support agent.", deploymentMode: "hybrid" },
      {
        availability: {
          ollama: { provider: "ollama", available: false, dataBoundary: "local" },
          groq: { provider: "groq", available: true, dataBoundary: "cloud" },
        },
        providers: {
          groq: {
            id: "groq",
            plan: vi.fn().mockResolvedValue({ name: "incomplete" }),
            run: vi.fn(),
          },
        },
      },
    );

    expect(result).toMatchObject({ status: "invalid_spec", provider: "groq" });
    if (result.status === "invalid_spec") {
      expect(result.issues.length).toBeGreaterThan(0);
    }
  });

  test("does not call a provider when Free Auto needs a connection", async () => {
    const result = await planAgent(
      { prompt: "Build a useful support agent.", deploymentMode: "hybrid" },
      {
        availability: {
          ollama: { provider: "ollama", available: false, dataBoundary: "local" },
          groq: { provider: "groq", available: false, dataBoundary: "cloud" },
        },
        providers: {},
      },
    );

    expect(result).toMatchObject({ status: "connection_required" });
  });
});
