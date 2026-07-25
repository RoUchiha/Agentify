import { describe, expect, test } from "vitest";

import type { AgentSpec } from "@/domain/agent-spec";
import { adviseSpec } from "@/domain/advisor";
import { materializeCustomization } from "@/domain/customization";
import { demoAgentSpec } from "@/domain/demo";
import { applySpecPatches } from "@/domain/spec-path";

describe("Advanced Build advisor", () => {
  test("recommends a simpler single-agent design without auto-applying it", () => {
    const spec = redundantTeamSpec();
    const original = structuredClone(spec);

    const findings = adviseSpec(spec);

    expect(findings).toContainEqual(
      expect.objectContaining({
        ruleId: "simplify-redundant-team",
        severity: "recommended",
        patches: expect.any(Array),
      }),
    );
    expect(spec).toEqual(original);
    expect(spec.workflow.topology).toBe("team");
  });

  test("blocks content tracing for confidential knowledge without redaction", () => {
    const spec = materializeCustomization({
      ...demoAgentSpec,
      knowledge: [
        {
          id: "customer-records",
          name: "Customer records",
          kind: "api",
          reference: "customer-records-api",
          classification: "confidential",
          retention: "run",
        },
      ],
    });
    spec.customization!.observability.contentCapture = true;
    spec.customization!.observability.redactSensitive = false;

    expect(adviseSpec(spec)).toContainEqual(
      expect.objectContaining({
        ruleId: "confidential-content-tracing",
        severity: "blocking",
        paths: ["customization.observability.contentCapture"],
        patches: [
          {
            path: "customization.observability.contentCapture",
            value: false,
          },
          {
            path: "customization.observability.redactSensitive",
            value: true,
          },
        ],
      }),
    );
  });

  test("suggests bounded cost and test coverage with valid explicit patches", () => {
    const spec = materializeCustomization({
      ...demoAgentSpec,
      budgets: {
        ...demoAgentSpec.budgets,
        maxTokens: 250_000,
        maxCostUsd: 200,
      },
    });
    const findings = adviseSpec(spec);
    const budget = findings.find((finding) => finding.ruleId === "disproportionate-budget");

    expect(budget).toMatchObject({
      severity: "recommended",
      category: "cost",
    });
    const applied = applySpecPatches(spec, budget!.patches);
    expect(applied.success).toBe(true);
    if (applied.success) {
      expect(applied.data.budgets.maxTokens).toBe(64_000);
      expect(applied.data.budgets.maxCostUsd).toBe(25);
    }
    expect(findings.some((finding) => finding.ruleId === "missing-evaluation-kinds")).toBe(true);
  });

  test("keeps dismissals stable until evidence changes", () => {
    const spec = redundantTeamSpec();
    const first = adviseSpec(spec);
    const finding = first.find((candidate) => candidate.ruleId === "simplify-redundant-team")!;

    expect(adviseSpec(spec, new Set([finding.id]))).not.toContainEqual(
      expect.objectContaining({ id: finding.id }),
    );

    const changed = structuredClone(spec);
    changed.agents[1]!.name = "Different redundant worker";
    const changedFinding = adviseSpec(changed).find(
      (candidate) => candidate.ruleId === "simplify-redundant-team",
    )!;
    expect(changedFinding.id).not.toBe(finding.id);
  });

  test("finds unused tools and persistent unredacted state", () => {
    const spec = materializeCustomization({
      ...demoAgentSpec,
      tools: [
        ...demoAgentSpec.tools,
        {
          ...demoAgentSpec.tools[0],
          id: "unused-search",
          name: "Unused search",
        },
      ],
      state: [
        {
          key: "conversation",
          schema: { type: "object" },
          visibility: "team",
          persistence: "project",
          redact: false,
        },
      ],
    });
    spec.customization!.runtime.persistence = "project";

    const findings = adviseSpec(spec);

    expect(findings).toContainEqual(
      expect.objectContaining({ ruleId: "remove-unused-tools" }),
    );
    expect(findings).toContainEqual(
      expect.objectContaining({
        ruleId: "persistent-unredacted-state",
        severity: "blocking",
      }),
    );
  });
});

function redundantTeamSpec(): AgentSpec {
  const spec = materializeCustomization({
    ...demoAgentSpec,
    agents: [
      demoAgentSpec.agents[0],
      {
        id: "idle-agent",
        name: "Idle agent",
        role: "Unused duplicate classifier",
        instructions: "Wait without handling tasks or receiving any workflow handoff.",
        toolIds: [],
        handoffs: [],
      },
    ],
    workflow: { ...demoAgentSpec.workflow, topology: "team" },
  });
  return spec;
}
