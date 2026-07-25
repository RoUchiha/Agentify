import { describe, expect, test } from "vitest";

import { demoAgentSpec } from "@/domain/demo";
import { normalizePlannerPayload } from "@/domain/normalize";

describe("normalizePlannerPayload", () => {
  test("conservatively removes undeclared handoffs and uses the lower step limit", () => {
    const proposed = structuredClone(demoAgentSpec) as unknown as {
      agents: Array<{ handoffs: string[] }>;
      workflow: { termination: { maxSteps: number } };
      budgets: { maxSteps: number };
    };
    proposed.agents[0].handoffs = ["undeclared-reviewer"];
    proposed.workflow.termination.maxSteps = 12;
    proposed.budgets.maxSteps = 8;

    const result = normalizePlannerPayload(proposed);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.agents[0].handoffs).toEqual([]);
      expect(result.data.workflow.termination.maxSteps).toBe(8);
      expect(result.data.budgets.maxSteps).toBe(8);
    }
  });

  test("deduplicates decision evidence without changing confirmed facts", () => {
    const result = normalizePlannerPayload({
      ...demoAgentSpec,
      decisions: {
        confirmed: ["Use Hybrid execution by default.", "Use Hybrid execution by default."],
        assumptions: ["Use Hybrid execution by default.", "Knowledge is public."],
        warnings: ["Review retention.", "Review retention."],
        unresolved: [],
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.decisions).toEqual({
        confirmed: ["Use Hybrid execution by default."],
        assumptions: ["Knowledge is public."],
        warnings: ["Review retention."],
        unresolved: [],
      });
    }
  });

  test("returns contract issues for malformed planner payloads", () => {
    const result = normalizePlannerPayload({ objective: "missing everything else" });

    expect(result.success).toBe(false);
  });
});
