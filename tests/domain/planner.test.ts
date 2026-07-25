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

  test("returns a ready spec after bounded provider relationship normalization", async () => {
    const proposed = structuredClone(demoAgentSpec) as unknown as {
      agents: Array<{ handoffs: string[] }>;
      workflow: { termination: { maxSteps: number } };
      budgets: { maxSteps: number };
    };
    proposed.agents[0].handoffs = ["undeclared-reviewer"];
    proposed.workflow.termination.maxSteps = 12;
    proposed.budgets.maxSteps = 8;

    const result = await planAgent(
      { prompt: "Build a safe support triage agent.", deploymentMode: "hybrid" },
      {
        availability: {
          ollama: { provider: "ollama", available: false, dataBoundary: "local" },
          groq: { provider: "groq", available: true, dataBoundary: "cloud" },
        },
        providers: {
          groq: {
            id: "groq",
            plan: vi.fn().mockResolvedValue(proposed),
            run: vi.fn(),
          },
        },
      },
    );

    expect(result).toMatchObject({
      status: "ready",
      spec: {
        agents: [{ handoffs: [] }],
        workflow: { termination: { maxSteps: 8 } },
        budgets: { maxSteps: 8 },
      },
    });
  });

  test("returns a deterministic no-tool baseline when provider output violates the contract", async () => {
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

    expect(result).toMatchObject({
      status: "ready",
      provider: { id: "groq", dataBoundary: "cloud" },
      spec: {
        objective: { goal: "Build a useful support agent." },
        tools: [],
        runtime: { deploymentMode: "hybrid" },
        decisions: {
          warnings: [
            "The provider proposal was invalid, so Agentify emitted a safe no-tool baseline for review.",
          ],
        },
      },
    });
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
