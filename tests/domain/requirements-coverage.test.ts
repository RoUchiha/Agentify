import { describe, expect, test } from "vitest";

import type { AgentSpec } from "@/domain/agent-spec";
import { materializeCustomization } from "@/domain/customization";
import { demoAgentSpec } from "@/domain/demo";
import {
  analyzeRequirements,
  answerRequirement,
  applyAllSafeDefaults,
  type RequirementGap,
} from "@/domain/requirements-coverage";

describe("Quick Build requirement coverage", () => {
  test("recommends the easiest safe implementation for an unresolved integration", () => {
    const spec = materializeCustomization({
      ...demoAgentSpec,
      decisions: {
        ...demoAgentSpec.decisions,
        unresolved: ["Which CRM should receive ticket updates?"],
      },
    });

    const coverage = analyzeRequirements(spec);

    expect(coverage.gaps[0]).toMatchObject({
      id: "decision-crm-destination",
      path: "decisions.unresolved.0",
      severity: "blocking",
      question: "Which CRM should receive ticket updates?",
      recommended: {
        label: "Start read-only without a CRM write",
        effort: "easiest",
      },
      impacts: ["permission", "deployment"],
      safeDefaultEligible: false,
    });
    expect(coverage.gaps[0]?.alternatives).toHaveLength(2);
  });

  test("applies only low-risk technical defaults", () => {
    const spec = materializeCustomization({
      ...demoAgentSpec,
      models: {
        ...demoAgentSpec.models,
        mode: "fixed",
        preferredProvider: "groq",
      },
      runtime: { ...demoAgentSpec.runtime, deploymentMode: "cloud" },
      decisions: {
        ...demoAgentSpec.decisions,
        unresolved: [
          "Where should this agent run?",
          "Authorize sending external messages?",
        ],
      },
    });
    const coverage = analyzeRequirements(spec);

    const updated = applyAllSafeDefaults(spec, coverage);

    expect(updated).not.toBe(spec);
    expect(updated.runtime.deploymentMode).toBe("hybrid");
    expect(updated.models).toMatchObject({
      mode: "free-auto",
      preferredProvider: "free-auto",
    });
    expect(updated.customization?.modelProfiles[0]).toMatchObject({
      id: "primary",
      provider: "free-auto",
      model: "automatic",
    });
    expect(updated.decisions.unresolved).toContain("Authorize sending external messages?");
    expect(updated.decisions.unresolved).not.toContain("Where should this agent run?");
  });

  test("applies an explicitly selected high-impact answer immutably", () => {
    const spec = materializeCustomization({
      ...demoAgentSpec,
      decisions: {
        ...demoAgentSpec.decisions,
        unresolved: ["Which CRM should receive ticket updates?"],
      },
    });
    const original = structuredClone(spec);
    const gap = analyzeRequirements(spec).gaps[0]!;

    const updated = answerRequirement(spec, gap, gap.recommended);

    expect(spec).toEqual(original);
    expect(updated.decisions.unresolved).toEqual([]);
    expect(updated.decisions.confirmed).toContain("Start read-only without a CRM write.");
  });

  test("never treats credentials, writes, public deployment, or retention as safe defaults", () => {
    const spec = materializeCustomization({
      ...demoAgentSpec,
      decisions: {
        ...demoAgentSpec.decisions,
        unresolved: [
          "Which API key should be used?",
          "Authorize deleting customer records?",
          "Should this be deployed publicly?",
          "How long should conversations be retained?",
        ],
      },
    });

    const coverage = analyzeRequirements(spec);

    expect(coverage.gaps).toHaveLength(4);
    expect(coverage.gaps.every((gap) => !gap.safeDefaultEligible)).toBe(true);
    expect(applyAllSafeDefaults(spec, coverage).decisions.unresolved).toEqual(
      spec.decisions.unresolved,
    );
  });

  test("rejects unknown answer handlers without mutation", () => {
    const spec = materializeCustomization(demoAgentSpec);
    const original = structuredClone(spec);
    const gap = {
      id: "invented-gap",
      path: "runtime.target",
      severity: "blocking",
      question: "Invent behavior?",
      reason: "This is not a reviewed rule.",
      recommended: {
        id: "invented",
        label: "Invent it",
        value: true,
        effort: "easiest",
        explanation: "Unsafe arbitrary patch.",
      },
      alternatives: [],
      impacts: ["permission"],
      safeDefaultEligible: true,
    } satisfies RequirementGap;

    expect(() => answerRequirement(spec, gap, gap.recommended)).toThrow(
      "Unsupported requirement answer.",
    );
    expect(spec).toEqual(original);
  });

  test("returns a complete result for a ready v1.0 or v1.1 spec", () => {
    expect(analyzeRequirements(demoAgentSpec).complete).toBe(true);
    const customized = materializeCustomization(demoAgentSpec);
    customized.customization!.modelProfiles.push({
      id: "primary",
      provider: "free-auto",
      model: "automatic",
      temperature: 0.2,
      topP: 1,
      maxOutputTokens: 8_000,
      reasoningEffort: "none",
      toolChoice: "auto",
      parallelToolCalls: false,
      structuredOutput: "required",
      timeoutMs: 60_000,
      fallbackProfileIds: [],
    });
    customized.customization!.agentModelProfiles = { "triage-agent": "primary" };

    expect(analyzeRequirements(customized as AgentSpec).complete).toBe(true);
  });
});
