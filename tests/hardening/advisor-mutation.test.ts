import { describe, expect, test } from "vitest";

import type { AgentSpec } from "@/domain/agent-spec";
import { adviseSpec } from "@/domain/advisor";
import { materializeCustomization } from "@/domain/customization";
import { demoAgentSpec } from "@/domain/demo";
import { applySpecPatches } from "@/domain/spec-path";

describe("post-feature advisor mutation coverage", () => {
  test.each(blockingCases())(
    "removes $ruleId after the unsafe condition is repaired",
    ({ ruleId, unsafe, repair }) => {
      expect(adviseSpec(unsafe()).some((finding) => finding.ruleId === ruleId)).toBe(true);
      expect(adviseSpec(repair(unsafe())).some((finding) => finding.ruleId === ruleId)).toBe(false);
    },
  );

  test("rejects an advisor patch mutated outside the AgentSpec contract", () => {
    const spec = materializeCustomization({
      ...demoAgentSpec,
      budgets: {
        ...demoAgentSpec.budgets,
        maxTokens: 250_000,
        maxCostUsd: 200,
      },
    });
    const finding = adviseSpec(spec).find(
      (candidate) => candidate.ruleId === "disproportionate-budget",
    )!;

    const result = applySpecPatches(spec, [
      ...finding.patches.slice(0, -1),
      { path: "budgets.maxCostUsd", value: -1 },
    ]);

    expect(result.success).toBe(false);
  });
});

function blockingCases(): Array<{
  ruleId: string;
  unsafe(): AgentSpec;
  repair(spec: AgentSpec): AgentSpec;
}> {
  return [
    {
      ruleId: "confirm-high-risk-writes",
      unsafe: highRiskWriteSpec,
      repair: (spec) => ({
        ...spec,
        decisions: {
          ...spec.decisions,
          confirmed: [...spec.decisions.confirmed, "Authorize high-risk tool: update-ticket"],
        },
      }),
    },
    {
      ruleId: "align-step-budgets",
      unsafe: () =>
        ({
          ...materializeCustomization(demoAgentSpec),
          workflow: {
            ...demoAgentSpec.workflow,
            termination: { ...demoAgentSpec.workflow.termination, maxSteps: 7 },
          },
        }) as AgentSpec,
      repair: (spec) => ({
        ...spec,
        workflow: {
          ...spec.workflow,
          termination: { ...spec.workflow.termination, maxSteps: spec.budgets.maxSteps },
        },
      }),
    },
    {
      ruleId: "restricted-cloud-boundary",
      unsafe: restrictedCloudSpec,
      repair: (spec) => ({
        ...spec,
        runtime: { ...spec.runtime, deploymentMode: "hybrid" },
      }),
    },
    {
      ruleId: "persistent-unredacted-state",
      unsafe: persistentStateSpec,
      repair: (spec) => ({
        ...spec,
        state: spec.state.map((entry) => ({ ...entry, redact: true })),
      }),
    },
    {
      ruleId: "incompatible-framework-override",
      unsafe: incompatibleOverrideSpec,
      repair: (spec) => ({
        ...spec,
        customization: {
          ...spec.customization!,
          frameworkOverrides: [],
        },
      }),
    },
    {
      ruleId: "confidential-content-tracing",
      unsafe: confidentialTracingSpec,
      repair: (spec) => ({
        ...spec,
        customization: {
          ...spec.customization!,
          observability: {
            ...spec.customization!.observability,
            redactSensitive: true,
          },
        },
      }),
    },
  ];
}

function highRiskWriteSpec(): AgentSpec {
  return materializeCustomization({
    ...demoAgentSpec,
    agents: [
      {
        ...demoAgentSpec.agents[0],
        toolIds: ["search-kb", "update-ticket"],
      },
    ],
    tools: [
      ...demoAgentSpec.tools,
      {
        id: "update-ticket",
        name: "Update ticket",
        description: "Mutate a support ticket after approval.",
        mode: "write",
        risk: "high",
        approval: "required",
        inputSchema: { type: "object" },
        outputSchema: { type: "object" },
        timeoutMs: 10_000,
        idempotent: true,
      },
    ],
  });
}

function restrictedCloudSpec(): AgentSpec {
  return materializeCustomization({
    ...demoAgentSpec,
    runtime: { ...demoAgentSpec.runtime, deploymentMode: "cloud" },
    knowledge: [
      {
        id: "restricted-records",
        name: "Restricted records",
        kind: "api",
        reference: "records-api",
        classification: "restricted",
        retention: "run",
      },
    ],
  });
}

function persistentStateSpec(): AgentSpec {
  const spec = materializeCustomization({
    ...demoAgentSpec,
    state: [
      {
        key: "history",
        schema: { type: "object" },
        visibility: "agent",
        persistence: "project",
        redact: false,
      },
    ],
  });
  spec.customization!.runtime.persistence = "project";
  return spec;
}

function incompatibleOverrideSpec(): AgentSpec {
  const spec = materializeCustomization(demoAgentSpec);
  spec.customization!.frameworkOverrides = [
    { target: "mcp-server", transport: "stdio", instructions: "" },
  ];
  return spec;
}

function confidentialTracingSpec(): AgentSpec {
  const spec = materializeCustomization({
    ...demoAgentSpec,
    knowledge: [
      {
        id: "confidential-records",
        name: "Confidential records",
        kind: "api",
        reference: "records-api",
        classification: "confidential",
        retention: "run",
      },
    ],
  });
  spec.customization!.observability.contentCapture = true;
  spec.customization!.observability.redactSensitive = false;
  return spec;
}
