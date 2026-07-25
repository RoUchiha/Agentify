import { describe, expect, test } from "vitest";

import { AgentSpecSchema } from "@/domain/agent-spec";
import { demoAgentSpec } from "@/domain/demo";

describe("AgentSpecSchema", () => {
  test("accepts a bounded single-agent specification", () => {
    expect(AgentSpecSchema.safeParse(demoAgentSpec).success).toBe(true);
  });

  test("rejects write tools without required approval", () => {
    const result = AgentSpecSchema.safeParse({
      ...demoAgentSpec,
      tools: [{ ...demoAgentSpec.tools[0], mode: "write", approval: "none" }],
    });

    expect(result.success).toBe(false);
  });

  test("rejects workflows without a termination node", () => {
    const result = AgentSpecSchema.safeParse({
      ...demoAgentSpec,
      workflow: {
        ...demoAgentSpec.workflow,
        nodes: demoAgentSpec.workflow.nodes.filter((node) => node.type !== "termination"),
      },
    });

    expect(result.success).toBe(false);
  });

  test("rejects undeclared workflow edges", () => {
    const result = AgentSpecSchema.safeParse({
      ...demoAgentSpec,
      workflow: {
        ...demoAgentSpec.workflow,
        edges: [{ source: "missing", target: "done" }],
      },
    });

    expect(result.success).toBe(false);
  });

  test("rejects unexpected secret-bearing fields", () => {
    const result = AgentSpecSchema.safeParse({ ...demoAgentSpec, apiKey: "not-allowed" });

    expect(result.success).toBe(false);
  });
});
