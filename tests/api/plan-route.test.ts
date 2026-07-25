import { describe, expect, test, vi } from "vitest";

import { createPlanRoute } from "@/server/routes/plan";
import { demoAgentSpec } from "@/domain/demo";

describe("POST /api/plan", () => {
  test("rejects malformed JSON", async () => {
    const post = createPlanRoute({
      plan: vi.fn(),
    });
    const response = await post(
      new Request("http://localhost/api/plan", {
        method: "POST",
        body: "{",
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ issues: ["Request body must be valid JSON."] });
  });

  test("rejects an empty prompt without calling the planner", async () => {
    const plan = vi.fn();
    const post = createPlanRoute({ plan });
    const response = await post(
      new Request("http://localhost/api/plan", {
        method: "POST",
        body: JSON.stringify({ prompt: " ", deploymentMode: "hybrid" }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(400);
    expect(plan).not.toHaveBeenCalled();
  });

  test("returns a provider-backed AgentSpec", async () => {
    const post = createPlanRoute({
      plan: vi.fn().mockResolvedValue({
        status: "ready",
        spec: demoAgentSpec,
        provider: { id: "groq", dataBoundary: "cloud", reason: "Ollama is unavailable." },
      }),
    });
    const response = await post(
      new Request("http://localhost/api/plan", {
        method: "POST",
        body: JSON.stringify({
          prompt: "Build an agent that triages support tickets.",
          deploymentMode: "hybrid",
        }),
        headers: { "content-type": "application/json" },
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "ready", spec: demoAgentSpec });
  });
});
