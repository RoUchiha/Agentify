import { describe, expect, test } from "vitest";

import { materializeCustomization } from "@/domain/customization";
import { demoAgentSpec } from "@/domain/demo";
import { applySpecPatches, getSpecValue } from "@/domain/spec-path";

describe("AgentSpec immutable paths", () => {
  test("reads nested object and array values", () => {
    const spec = materializeCustomization(demoAgentSpec);

    expect(getSpecValue(spec, "budgets.maxTokens")).toBe(8_000);
    expect(getSpecValue(spec, "agents.0.id")).toBe("triage-agent");
  });

  test("applies validated patches without mutating the accepted spec", () => {
    const original = materializeCustomization(demoAgentSpec);
    const result = applySpecPatches(original, [
      { path: "budgets.maxTokens", value: 4_000 },
      { path: "customization.observability.traceLevel", value: "errors" },
    ]);

    expect(result.success).toBe(true);
    expect(original.budgets.maxTokens).toBe(8_000);
    expect(original.customization?.observability.traceLevel).toBe("actions");
    if (result.success) {
      expect(result.data.budgets.maxTokens).toBe(4_000);
      expect(result.data.customization?.observability.traceLevel).toBe("errors");
    }
  });

  test("returns schema issues for patches that violate the contract", () => {
    const result = applySpecPatches(materializeCustomization(demoAgentSpec), [
      { path: "budgets.maxTokens", value: -1 },
    ]);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["budgets", "maxTokens"]);
    }
  });

  test.each([
    "__proto__.polluted",
    "constructor.prototype.polluted",
    "agents.-1.name",
    "agents.99.name",
    "agents.0.missing",
    "",
  ])("rejects unsafe or missing path %s", (path) => {
    const original = materializeCustomization(demoAgentSpec);
    const result = applySpecPatches(original, [{ path, value: true }]);

    expect(result.success).toBe(false);
    expect(original).not.toHaveProperty("polluted");
  });
});
