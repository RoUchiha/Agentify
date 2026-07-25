import { describe, expect, test } from "vitest";

import { demoAgentSpec } from "@/domain/demo";
import { applyGraphEdit, toVisualGraph } from "@/domain/graph";

describe("visual graph projection", () => {
  test("projects declared workflow nodes and edges with agent labels", () => {
    const graph = toVisualGraph(demoAgentSpec);

    expect(graph.nodes).toEqual([
      { id: "triage", kind: "agent", label: "Triage agent", ref: "triage-agent" },
      { id: "done", kind: "termination", label: "Stop" },
    ]);
    expect(graph.edges).toEqual([{ source: "triage", target: "done" }]);
  });

  test("applies an agent instruction edit without mutating the prior spec", () => {
    const result = applyGraphEdit(demoAgentSpec, {
      type: "update-agent-instructions",
      agentId: "triage-agent",
      instructions: "Classify requests and cite exactly one source.",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.spec.agents[0].instructions).toBe(
        "Classify requests and cite exactly one source.",
      );
      expect(result.spec.tools).toEqual(demoAgentSpec.tools);
    }
    expect(demoAgentSpec.agents[0].instructions).not.toMatch(/exactly one/);
  });

  test("rejects edits to an undeclared agent and preserves the valid spec", () => {
    const result = applyGraphEdit(demoAgentSpec, {
      type: "update-agent-instructions",
      agentId: "missing-agent",
      instructions: "Do something safe.",
    });

    expect(result).toEqual({
      success: false,
      previousSpec: demoAgentSpec,
      issues: ["Agent missing-agent is not declared."],
    });
  });
});
