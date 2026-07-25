import type { AgentSpec, ArtifactTarget } from "@/domain/agent-spec";

export type ArtifactSelection =
  | {
      status: "selected";
      target: ArtifactTarget;
      source: "spec" | "override";
      reason: string;
    }
  | {
      status: "incompatible";
      target: ArtifactTarget;
      code: "mcp_requires_tools";
      reason: string;
    };

export function selectArtifact(spec: AgentSpec, override?: ArtifactTarget): ArtifactSelection {
  const target = override ?? spec.runtime.target;
  if (target === "mcp-server" && spec.tools.length === 0) {
    return {
      status: "incompatible",
      target,
      code: "mcp_requires_tools",
      reason: "An MCP server must expose at least one declared tool.",
    };
  }

  return {
    status: "selected",
    target,
    source: override === undefined ? "spec" : "override",
    reason: selectionReason(target),
  };
}

function selectionReason(target: ArtifactTarget): string {
  const reasons: Record<ArtifactTarget, string> = {
    "openai-agents-ts": "TypeScript is the selected runnable Agents SDK target.",
    "openai-agents-python": "Python is the selected runnable Agents SDK target.",
    "mcp-server": "The declared tools will be packaged as an MCP server.",
    "portable-spec": "A portable JSON/YAML specification bundle is sufficient.",
  };
  return reasons[target];
}
