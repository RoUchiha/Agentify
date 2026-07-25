import { describe, expect, test } from "vitest";

import { demoAgentSpec } from "@/domain/demo";
import { normalizePlannerPayload } from "@/domain/normalize";

describe("normalizePlannerPayload", () => {
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
