import { describe, expect, test } from "vitest";

import type { ArtifactTarget } from "@/domain/agent-spec";
import { demoAgentSpec } from "@/domain/demo";
import { selectArtifact } from "@/domain/artifact-selector";

describe("selectArtifact", () => {
  test.each<ArtifactTarget>([
    "openai-agents-ts",
    "openai-agents-python",
    "mcp-server",
    "portable-spec",
  ])("honors a compatible explicit %s target", (target) => {
    const spec = {
      ...demoAgentSpec,
      runtime: { ...demoAgentSpec.runtime, target },
    };

    expect(selectArtifact(spec)).toMatchObject({ target, source: "spec" });
  });

  test("rejects MCP output when the agent exposes no tools", () => {
    const spec = {
      ...demoAgentSpec,
      agents: [{ ...demoAgentSpec.agents[0], toolIds: [] }],
      tools: [],
      runtime: { ...demoAgentSpec.runtime, target: "mcp-server" as const },
    };

    expect(selectArtifact(spec)).toMatchObject({
      status: "incompatible",
      code: "mcp_requires_tools",
    });
  });

  test("allows an Advanced override when capabilities are compatible", () => {
    expect(selectArtifact(demoAgentSpec, "openai-agents-python")).toMatchObject({
      status: "selected",
      target: "openai-agents-python",
      source: "override",
    });
  });
});
