import { describe, expect, test } from "vitest";

import { AgentSpecSchema } from "@/domain/agent-spec";
import { demoAgentSpec } from "@/domain/demo";

describe("post-build AgentSpec hardening", () => {
  test("rejects workflow references that are not declared by the immutable spec", () => {
    const malformed = [
      {
        ...structuredClone(demoAgentSpec),
        workflow: {
          ...structuredClone(demoAgentSpec.workflow),
          nodes: [
            { id: "triage", type: "agent" as const, ref: "missing-agent" },
            { id: "done", type: "termination" as const },
          ],
        },
      },
      {
        ...structuredClone(demoAgentSpec),
        workflow: {
          ...structuredClone(demoAgentSpec.workflow),
          nodes: [
            { id: "lookup", type: "tool" as const, ref: "missing-tool" },
            { id: "done", type: "termination" as const },
          ],
          edges: [{ source: "lookup", target: "done" }],
        },
      },
      {
        ...structuredClone(demoAgentSpec),
        agents: [
          {
            ...structuredClone(demoAgentSpec.agents[0]),
            handoffs: ["missing-reviewer"],
          },
        ],
      },
    ];

    for (const candidate of malformed) {
      expect(AgentSpecSchema.safeParse(candidate).success).toBe(false);
    }
  });

  test("fails closed across a deterministic malformed-spec corpus", () => {
    const corruptions: unknown[] = [
      { ...structuredClone(demoAgentSpec), surprise: true },
      {
        ...structuredClone(demoAgentSpec),
        agents: [demoAgentSpec.agents[0], demoAgentSpec.agents[0]],
        workflow: { ...demoAgentSpec.workflow, topology: "team" },
      },
      {
        ...structuredClone(demoAgentSpec),
        workflow: {
          ...demoAgentSpec.workflow,
          nodes: demoAgentSpec.workflow.nodes.filter((node) => node.type !== "termination"),
        },
      },
      {
        ...structuredClone(demoAgentSpec),
        budgets: { ...demoAgentSpec.budgets, retryLimit: 99 },
      },
      {
        ...structuredClone(demoAgentSpec),
        tools: [{ ...demoAgentSpec.tools[0], mode: "write", approval: "none" }],
      },
    ];

    expect(corruptions.map((candidate) => AgentSpecSchema.safeParse(candidate).success)).toEqual(
      corruptions.map(() => false),
    );
  });
});
