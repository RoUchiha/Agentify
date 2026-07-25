import { z } from "zod";

import { CustomizationSchema } from "@/domain/customization";

export const ARTIFACT_TARGETS = [
  "openai-agents-ts",
  "openai-agents-python",
  "mcp-server",
  "portable-spec",
] as const;
export const DEPLOYMENT_MODES = ["hybrid", "local", "cloud"] as const;
export const PROVIDERS = ["free-auto", "ollama", "groq", "openai", "anthropic", "google"] as const;

const Identifier = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z][a-z0-9_-]*$/);
const JsonSchema = z.record(z.string(), z.unknown());

const MetadataSchema = z
  .object({
    version: z.enum(["1.0", "1.1"]),
    id: Identifier,
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().min(1).max(500),
    revision: z.number().int().positive(),
  })
  .strict();

const ObjectiveSchema = z
  .object({
    goal: z.string().trim().min(8).max(2_000),
    taskTypes: z.array(Identifier).min(1).max(20),
    successCriteria: z.array(z.string().trim().min(3).max(500)).min(1).max(20),
    failureConditions: z.array(z.string().trim().min(3).max(500)).max(20),
    inputSchema: JsonSchema,
    outputSchema: JsonSchema,
  })
  .strict();

const AgentSchema = z
  .object({
    id: Identifier,
    name: z.string().trim().min(1).max(120),
    role: z.string().trim().min(3).max(300),
    instructions: z.string().trim().min(8).max(8_000),
    toolIds: z.array(Identifier).max(50),
    handoffs: z.array(Identifier).max(20),
  })
  .strict();

const ModelPolicySchema = z
  .object({
    mode: z.enum(["free-auto", "fixed", "adaptive"]),
    allowedProviders: z.array(z.enum(PROVIDERS)).min(1),
    preferredProvider: z.enum(PROVIDERS),
    requirements: z.array(z.enum(["structured-output", "tool-use", "vision", "long-context"])),
    fallback: z.enum(["ask", "compatible-provider", "none"]),
  })
  .strict();

const ToolSchema = z
  .object({
    id: Identifier,
    name: z.string().trim().min(1).max(120),
    description: z.string().trim().min(3).max(500),
    mode: z.enum(["read", "write"]),
    risk: z.enum(["low", "medium", "high", "critical"]),
    approval: z.enum(["none", "required"]),
    inputSchema: JsonSchema,
    outputSchema: JsonSchema,
    timeoutMs: z.number().int().min(100).max(120_000),
    idempotent: z.boolean(),
  })
  .strict();

const KnowledgeSchema = z
  .object({
    id: Identifier,
    name: z.string().trim().min(1).max(120),
    kind: z.enum(["file", "url", "api", "vector-store", "inline"]),
    reference: z.string().trim().min(1).max(2_000),
    classification: z.enum(["public", "internal", "confidential", "restricted"]),
    retention: z.enum(["run", "project", "external"]),
  })
  .strict();

const StateSchema = z
  .object({
    key: Identifier,
    schema: JsonSchema,
    visibility: z.enum(["agent", "team", "operator"]),
    persistence: z.enum(["run", "session", "project"]),
    redact: z.boolean(),
  })
  .strict();

const WorkflowNodeSchema = z
  .object({
    id: Identifier,
    type: z.enum([
      "input",
      "agent",
      "tool",
      "knowledge",
      "transform",
      "router",
      "approval",
      "subflow",
      "termination",
    ]),
    ref: Identifier.optional(),
  })
  .strict();

const WorkflowSchema = z
  .object({
    topology: z.enum(["single", "team"]),
    nodes: z.array(WorkflowNodeSchema).min(2).max(100),
    edges: z
      .array(
        z
          .object({
            source: Identifier,
            target: Identifier,
            condition: z.string().trim().min(1).max(500).optional(),
          })
          .strict(),
      )
      .min(1)
      .max(200),
    termination: z
      .object({
        maxSteps: z.number().int().min(1).max(100),
        condition: z.string().trim().min(3).max(500),
      })
      .strict(),
  })
  .strict();

const BudgetSchema = z
  .object({
    retryLimit: z.number().int().min(0).max(5),
    maxSteps: z.number().int().min(1).max(100),
    timeoutMs: z.number().int().min(1_000).max(900_000),
    maxTokens: z.number().int().min(256).max(1_000_000),
    maxCostUsd: z.number().min(0).max(1_000),
  })
  .strict();

const RuntimeSchema = z
  .object({
    target: z.enum(ARTIFACT_TARGETS),
    deploymentMode: z.enum(DEPLOYMENT_MODES),
    sandboxRequired: z.boolean(),
  })
  .strict();

const EvaluationSchema = z
  .object({
    id: Identifier,
    kind: z.enum(["positive", "negative", "boundary", "policy", "adversarial"]),
    input: z.unknown(),
    expected: z.unknown(),
    provenance: z.enum(["user-provided", "spec-derived", "adapter-conformance", "hardening"]),
  })
  .strict();

const DecisionSchema = z
  .object({
    confirmed: z.array(z.string().trim().min(1).max(500)),
    assumptions: z.array(z.string().trim().min(1).max(500)),
    warnings: z.array(z.string().trim().min(1).max(500)),
    unresolved: z.array(z.string().trim().min(1).max(500)),
  })
  .strict();

export const AgentSpecSchema = z
  .object({
    metadata: MetadataSchema,
    objective: ObjectiveSchema,
    agents: z.array(AgentSchema).min(1).max(20),
    models: ModelPolicySchema,
    tools: z.array(ToolSchema).max(50),
    knowledge: z.array(KnowledgeSchema).max(50),
    state: z.array(StateSchema).max(100),
    workflow: WorkflowSchema,
    budgets: BudgetSchema,
    runtime: RuntimeSchema,
    evaluations: z.array(EvaluationSchema).min(1).max(100),
    decisions: DecisionSchema,
    customization: CustomizationSchema.optional(),
  })
  .strict()
  .superRefine((spec, context) => {
    enforceUniqueIds(spec.agents, "agent", context);
    enforceUniqueIds(spec.tools, "tool", context);
    enforceUniqueIds(spec.workflow.nodes, "workflow node", context);

    const toolIds = new Set(spec.tools.map((tool) => tool.id));
    const agentIds = new Set(spec.agents.map((agent) => agent.id));
    const knowledgeIds = new Set(spec.knowledge.map((source) => source.id));
    const stateKeys = new Set(spec.state.map((entry) => entry.key));
    for (const agent of spec.agents) {
      for (const toolId of agent.toolIds) {
        if (!toolIds.has(toolId)) {
          context.addIssue({
            code: "custom",
            path: ["agents"],
            message: `Agent ${agent.id} references undeclared tool ${toolId}.`,
          });
        }
      }
      for (const handoffId of agent.handoffs) {
        if (!agentIds.has(handoffId)) {
          context.addIssue({
            code: "custom",
            path: ["agents"],
            message: `Agent ${agent.id} references undeclared handoff ${handoffId}.`,
          });
        }
      }
    }

    for (const tool of spec.tools) {
      if (tool.mode === "write" && tool.approval !== "required") {
        context.addIssue({
          code: "custom",
          path: ["tools"],
          message: `Write tool ${tool.id} requires approval.`,
        });
      }
    }

    const nodeIds = new Set(spec.workflow.nodes.map((node) => node.id));
    for (const node of spec.workflow.nodes) {
      const referenceSet =
        node.type === "agent"
          ? agentIds
          : node.type === "tool"
            ? toolIds
            : node.type === "knowledge"
              ? knowledgeIds
              : undefined;
      if (referenceSet && (!node.ref || !referenceSet.has(node.ref))) {
        context.addIssue({
          code: "custom",
          path: ["workflow", "nodes"],
          message: `Workflow ${node.type} node ${node.id} requires a declared reference.`,
        });
      }
    }
    for (const edge of spec.workflow.edges) {
      if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
        context.addIssue({
          code: "custom",
          path: ["workflow", "edges"],
          message: `Workflow edge ${edge.source} -> ${edge.target} references an undeclared node.`,
        });
      }
    }

    if (!spec.workflow.nodes.some((node) => node.type === "termination")) {
      context.addIssue({
        code: "custom",
        path: ["workflow", "nodes"],
        message: "Workflow requires a termination node.",
      });
    }

    if (spec.workflow.topology === "single" && spec.agents.length !== 1) {
      context.addIssue({
        code: "custom",
        path: ["agents"],
        message: "Single-agent topology requires exactly one agent.",
      });
    }

    if (spec.workflow.termination.maxSteps !== spec.budgets.maxSteps) {
      context.addIssue({
        code: "custom",
        path: ["budgets", "maxSteps"],
        message: "Workflow and budget step limits must match.",
      });
    }

    if (spec.metadata.version === "1.0" && spec.customization) {
      context.addIssue({
        code: "custom",
        path: ["metadata", "version"],
        message: "Customization requires AgentSpec version 1.1.",
      });
    }

    const customization = spec.customization;
    if (!customization) return;

    const profileIds = uniqueReferenceIds(
      customization.modelProfiles,
      "model profile",
      ["customization", "modelProfiles"],
      context,
    );
    uniqueReferenceIds(
      customization.guardrails,
      "guardrail",
      ["customization", "guardrails"],
      context,
    );
    uniqueReferenceIds(customization.hooks, "hook", ["customization", "hooks"], context);
    uniqueReferenceIds(
      customization.workflow.checkpoints,
      "checkpoint",
      ["customization", "workflow", "checkpoints"],
      context,
    );

    for (const profile of customization.modelProfiles) {
      for (const fallbackId of profile.fallbackProfileIds) {
        enforceReference(
          profileIds,
          fallbackId,
          ["customization", "modelProfiles"],
          `Model profile ${profile.id} references undeclared fallback ${fallbackId}.`,
          context,
        );
      }
    }
    for (const [agentId, profileId] of Object.entries(customization.agentModelProfiles)) {
      enforceReference(
        agentIds,
        agentId,
        ["customization", "agentModelProfiles"],
        `Model profile mapping references undeclared agent ${agentId}.`,
        context,
      );
      enforceReference(
        profileIds,
        profileId,
        ["customization", "agentModelProfiles"],
        `Agent ${agentId} references undeclared model profile ${profileId}.`,
        context,
      );
    }
    for (const policy of customization.toolPolicies) {
      enforceReference(
        toolIds,
        policy.toolId,
        ["customization", "toolPolicies"],
        `Tool policy references undeclared tool ${policy.toolId}.`,
        context,
      );
    }
    for (const policy of customization.knowledgePolicies) {
      enforceReference(
        knowledgeIds,
        policy.knowledgeId,
        ["customization", "knowledgePolicies"],
        `Knowledge policy references undeclared source ${policy.knowledgeId}.`,
        context,
      );
    }
    for (const policy of customization.statePolicies) {
      enforceReference(
        stateKeys,
        policy.stateKey,
        ["customization", "statePolicies"],
        `State policy references undeclared state ${policy.stateKey}.`,
        context,
      );
      for (const agentId of policy.mutableBy) {
        enforceReference(
          agentIds,
          agentId,
          ["customization", "statePolicies"],
          `State policy ${policy.stateKey} references undeclared agent ${agentId}.`,
          context,
        );
      }
    }
    for (const policy of customization.workflow.nodePolicies) {
      enforceReference(
        nodeIds,
        policy.nodeId,
        ["customization", "workflow", "nodePolicies"],
        `Node policy references undeclared node ${policy.nodeId}.`,
        context,
      );
      if (policy.failureTarget) {
        enforceReference(
          nodeIds,
          policy.failureTarget,
          ["customization", "workflow", "nodePolicies"],
          `Node policy ${policy.nodeId} references undeclared failure target ${policy.failureTarget}.`,
          context,
        );
      }
    }
    for (const policy of customization.workflow.edgePolicies) {
      enforceReference(
        nodeIds,
        policy.source,
        ["customization", "workflow", "edgePolicies"],
        `Edge policy references undeclared source ${policy.source}.`,
        context,
      );
      enforceReference(
        nodeIds,
        policy.target,
        ["customization", "workflow", "edgePolicies"],
        `Edge policy references undeclared target ${policy.target}.`,
        context,
      );
    }
    for (const checkpoint of customization.workflow.checkpoints) {
      enforceReference(
        nodeIds,
        checkpoint.afterNodeId,
        ["customization", "workflow", "checkpoints"],
        `Checkpoint ${checkpoint.id} references undeclared node ${checkpoint.afterNodeId}.`,
        context,
      );
    }
  });

export type AgentSpec = z.infer<typeof AgentSpecSchema>;
export type AgentSpecParseResult = ReturnType<typeof AgentSpecSchema.safeParse>;
export type ArtifactTarget = (typeof ARTIFACT_TARGETS)[number];
export type DeploymentMode = (typeof DEPLOYMENT_MODES)[number];
export type ProviderId = (typeof PROVIDERS)[number];

function enforceUniqueIds(
  values: ReadonlyArray<{ id: string }>,
  label: string,
  context: z.RefinementCtx,
): void {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value.id)) {
      context.addIssue({
        code: "custom",
        message: `Duplicate ${label} identifier ${value.id}.`,
      });
    }
    seen.add(value.id);
  }
}

function uniqueReferenceIds(
  values: ReadonlyArray<{ id: string }>,
  label: string,
  path: PropertyKey[],
  context: z.RefinementCtx,
): Set<string> {
  const ids = new Set<string>();
  for (const value of values) {
    if (ids.has(value.id)) {
      context.addIssue({
        code: "custom",
        path,
        message: `Duplicate ${label} identifier ${value.id}.`,
      });
    }
    ids.add(value.id);
  }
  return ids;
}

function enforceReference(
  declared: ReadonlySet<string>,
  reference: string,
  path: PropertyKey[],
  message: string,
  context: z.RefinementCtx,
): void {
  if (!declared.has(reference)) {
    context.addIssue({ code: "custom", path, message });
  }
}
