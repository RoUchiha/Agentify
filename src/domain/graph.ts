import { AgentSpecSchema, type AgentSpec } from "@/domain/agent-spec";

export type VisualNode = {
  id: string;
  kind: AgentSpec["workflow"]["nodes"][number]["type"];
  label: string;
  ref?: string;
};

export type VisualGraph = {
  nodes: VisualNode[];
  edges: Array<{ source: string; target: string; condition?: string }>;
};

export type GraphEdit = {
  type: "update-agent-instructions";
  agentId: string;
  instructions: string;
};

export type GraphEditResult =
  | { success: true; spec: AgentSpec }
  | { success: false; previousSpec: AgentSpec; issues: string[] };

export function toVisualGraph(spec: AgentSpec): VisualGraph {
  return {
    nodes: spec.workflow.nodes.map((node) => {
      const referencedAgent =
        node.type === "agent" ? spec.agents.find((agent) => agent.id === node.ref) : undefined;
      const referencedTool =
        node.type === "tool" ? spec.tools.find((tool) => tool.id === node.ref) : undefined;
      return {
        id: node.id,
        kind: node.type,
        label:
          referencedAgent?.name ??
          referencedTool?.name ??
          (node.type === "termination" ? "Stop" : titleCase(node.type)),
        ...(node.ref === undefined ? {} : { ref: node.ref }),
      };
    }),
    edges: spec.workflow.edges.map((edge) => ({ ...edge })),
  };
}

export function applyGraphEdit(spec: AgentSpec, edit: GraphEdit): GraphEditResult {
  const index = spec.agents.findIndex((agent) => agent.id === edit.agentId);
  if (index < 0) {
    return {
      success: false,
      previousSpec: spec,
      issues: [`Agent ${edit.agentId} is not declared.`],
    };
  }

  const agents = spec.agents.map((agent, agentIndex) =>
    agentIndex === index ? { ...agent, instructions: edit.instructions.trim() } : agent,
  );
  const parsed = AgentSpecSchema.safeParse({ ...spec, agents });
  if (!parsed.success) {
    return {
      success: false,
      previousSpec: spec,
      issues: parsed.error.issues.map((issue) => issue.message),
    };
  }

  return { success: true, spec: parsed.data };
}

function titleCase(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1).replaceAll("-", " ")}`;
}
