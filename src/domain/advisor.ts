import type { AgentSpec } from "@/domain/agent-spec";
import type { SpecPatch } from "@/domain/spec-path";

export type AdvisoryFinding = {
  id: string;
  ruleId: string;
  paths: string[];
  severity: "blocking" | "recommended" | "optional";
  category: "safety" | "clarity" | "reliability" | "cost" | "portability" | "testing";
  title: string;
  explanation: string;
  evidence: string[];
  patches: SpecPatch[];
  impacts: string[];
};

type FindingInput = Omit<AdvisoryFinding, "id">;
type AdvisorRule = (spec: AgentSpec) => AdvisoryFinding[];

const ADVISOR_RULES: AdvisorRule[] = [
  redundantTeamRule,
  unboundedHandoffCycleRule,
  unusedToolRule,
  writeApprovalRule,
  weakOutputSchemaRule,
  inconsistentBudgetsRule,
  disproportionateBudgetRule,
  restrictedCloudRule,
  persistentUnredactedStateRule,
  missingEvaluationKindsRule,
  modelOnlyEvaluationRule,
  incompatibleOverrideRule,
  confidentialContentTracingRule,
];

export function adviseSpec(
  spec: AgentSpec,
  dismissedIds: ReadonlySet<string> = new Set(),
): AdvisoryFinding[] {
  const severityRank = { blocking: 0, recommended: 1, optional: 2 };
  return ADVISOR_RULES.flatMap((rule) => rule(spec))
    .filter((finding) => !dismissedIds.has(finding.id))
    .sort(
      (left, right) =>
        severityRank[left.severity] - severityRank[right.severity] ||
        left.ruleId.localeCompare(right.ruleId) ||
        left.id.localeCompare(right.id),
    );
}

function redundantTeamRule(spec: AgentSpec): AdvisoryFinding[] {
  if (spec.workflow.topology !== "team") return [];
  const referenced = new Set(
    spec.workflow.nodes
      .filter((node) => node.type === "agent" && node.ref)
      .map((node) => node.ref!),
  );
  if (referenced.size !== 1 || spec.agents.length <= 1) return [];
  const retainedAgents = spec.agents
    .filter((agent) => referenced.has(agent.id))
    .map((agent) => ({ ...agent, handoffs: agent.handoffs.filter((id) => referenced.has(id)) }));
  const unused = spec.agents.filter((agent) => !referenced.has(agent.id));
  const patches: SpecPatch[] = [
    { path: "workflow.topology", value: "single" },
    { path: "agents", value: retainedAgents },
  ];
  if (spec.customization) {
    patches.push({
      path: "customization.agentModelProfiles",
      value: Object.fromEntries(
        Object.entries(spec.customization.agentModelProfiles).filter(([agentId]) =>
          referenced.has(agentId),
        ),
      ),
    });
  }
  return [
    finding({
      ruleId: "simplify-redundant-team",
      paths: ["workflow.topology", "agents"],
      severity: "recommended",
      category: "clarity",
      title: "Use one agent for one meaningful role",
      explanation:
        "The workflow invokes only one agent, so the extra team members add configuration without executable responsibility.",
      evidence: [
        `${referenced.size} of ${spec.agents.length} agents are referenced by workflow nodes.`,
        ...unused.map((agent) => `Unused agent: ${agent.id} (${agent.name}).`),
      ],
      patches,
      impacts: ["Simpler handoffs", "Smaller generated runtime", "Lower maintenance"],
    }),
  ];
}

function unboundedHandoffCycleRule(spec: AgentSpec): AdvisoryFinding[] {
  const cycles = spec.agents.flatMap((agent) =>
    agent.handoffs
      .filter((target) =>
        spec.agents.find((candidate) => candidate.id === target)?.handoffs.includes(agent.id),
      )
      .map((target) => [agent.id, target].sort().join(" <-> ")),
  );
  const uniqueCycles = unique(cycles);
  if (uniqueCycles.length === 0) return [];
  return [
    finding({
      ruleId: "bound-handoff-cycles",
      paths: ["agents", "workflow.termination.maxSteps"],
      severity: "recommended",
      category: "reliability",
      title: "Make cyclic handoffs explicit",
      explanation:
        "Mutual handoffs can consume the full step budget without producing a terminal result.",
      evidence: uniqueCycles.map((cycle) => `Mutual handoff: ${cycle}.`),
      patches: [],
      impacts: ["Runaway-step risk", "Latency", "Cost"],
    }),
  ];
}

function unusedToolRule(spec: AgentSpec): AdvisoryFinding[] {
  const referenced = new Set([
    ...spec.agents.flatMap((agent) => agent.toolIds),
    ...spec.workflow.nodes
      .filter((node) => node.type === "tool" && node.ref)
      .map((node) => node.ref!),
  ]);
  const unused = spec.tools.filter((tool) => !referenced.has(tool.id));
  if (unused.length === 0) return [];
  const patches: SpecPatch[] = [
    { path: "tools", value: spec.tools.filter((tool) => referenced.has(tool.id)) },
  ];
  if (spec.customization) {
    patches.push({
      path: "customization.toolPolicies",
      value: spec.customization.toolPolicies.filter((policy) => referenced.has(policy.toolId)),
    });
  }
  return [
    finding({
      ruleId: "remove-unused-tools",
      paths: ["tools"],
      severity: "optional",
      category: "clarity",
      title: "Remove tools no agent can call",
      explanation:
        "Unused tool declarations increase the permission surface and generated package size.",
      evidence: unused.map((tool) => `Unused tool: ${tool.id} (${tool.mode}, ${tool.risk}).`),
      patches,
      impacts: ["Smaller permission surface", "Clearer generated code"],
    }),
  ];
}

function writeApprovalRule(spec: AgentSpec): AdvisoryFinding[] {
  const unconfirmed = spec.tools.filter(
    (tool) =>
      tool.mode === "write" &&
      (tool.risk === "high" || tool.risk === "critical") &&
      !spec.decisions.confirmed.includes(`Authorize high-risk tool: ${tool.id}`),
  );
  if (unconfirmed.length === 0) return [];
  return [
    finding({
      ruleId: "confirm-high-risk-writes",
      paths: unconfirmed.map((tool) => `tools.${spec.tools.indexOf(tool)}.approval`),
      severity: "blocking",
      category: "safety",
      title: "Confirm high-risk write authority",
      explanation:
        "High-risk mutations require an explicit developer decision and runtime approval.",
      evidence: unconfirmed.map((tool) => `${tool.name} is a ${tool.risk}-risk write tool.`),
      patches: [],
      impacts: ["External side effects", "Operator approval"],
    }),
  ];
}

function weakOutputSchemaRule(spec: AgentSpec): AdvisoryFinding[] {
  const schema = spec.objective.outputSchema;
  const required = Array.isArray(schema.required) ? schema.required : [];
  if (schema.type === "object" && required.length > 0) return [];
  return [
    finding({
      ruleId: "strengthen-output-schema",
      paths: ["objective.outputSchema"],
      severity: "recommended",
      category: "clarity",
      title: "Declare required output fields",
      explanation: "A permissive output schema cannot prove that generated results are usable.",
      evidence: ["The output schema has no required object fields."],
      patches: [],
      impacts: ["Structured output reliability", "Downstream integration"],
    }),
  ];
}

function inconsistentBudgetsRule(spec: AgentSpec): AdvisoryFinding[] {
  if (spec.workflow.termination.maxSteps === spec.budgets.maxSteps) return [];
  return [
    finding({
      ruleId: "align-step-budgets",
      paths: ["workflow.termination.maxSteps", "budgets.maxSteps"],
      severity: "blocking",
      category: "reliability",
      title: "Align workflow and runtime step limits",
      explanation: "Two different step ceilings make runtime termination ambiguous.",
      evidence: [
        `Workflow limit: ${spec.workflow.termination.maxSteps}.`,
        `Budget limit: ${spec.budgets.maxSteps}.`,
      ],
      patches: [{ path: "workflow.termination.maxSteps", value: spec.budgets.maxSteps }],
      impacts: ["Deterministic termination"],
    }),
  ];
}

function disproportionateBudgetRule(spec: AgentSpec): AdvisoryFinding[] {
  if (spec.budgets.maxTokens <= 100_000 && spec.budgets.maxCostUsd <= 100) return [];
  return [
    finding({
      ruleId: "disproportionate-budget",
      paths: ["budgets.maxTokens", "budgets.maxCostUsd"],
      severity: "recommended",
      category: "cost",
      title: "Start with a bounded run budget",
      explanation:
        "The current ceiling is unusually high for an unverified generated agent and can be raised after evaluation.",
      evidence: [
        `Maximum tokens: ${spec.budgets.maxTokens}.`,
        `Maximum cost: $${spec.budgets.maxCostUsd}.`,
      ],
      patches: [
        { path: "budgets.maxTokens", value: 64_000 },
        { path: "budgets.maxCostUsd", value: 25 },
      ],
      impacts: ["Lower runaway cost", "Faster failure detection"],
    }),
  ];
}

function restrictedCloudRule(spec: AgentSpec): AdvisoryFinding[] {
  const restricted = spec.knowledge.filter((source) => source.classification === "restricted");
  if (
    spec.runtime.deploymentMode !== "cloud" ||
    restricted.length === 0 ||
    spec.decisions.confirmed.includes("Authorize restricted data for Cloud execution.")
  ) {
    return [];
  }
  return [
    finding({
      ruleId: "restricted-cloud-boundary",
      paths: ["runtime.deploymentMode", "knowledge"],
      severity: "blocking",
      category: "safety",
      title: "Keep restricted data inside an approved boundary",
      explanation:
        "Cloud execution moves restricted knowledge outside the default local trust boundary.",
      evidence: restricted.map((source) => `Restricted source: ${source.id}.`),
      patches: [{ path: "runtime.deploymentMode", value: "hybrid" }],
      impacts: ["Data residency", "Deployment architecture"],
    }),
  ];
}

function persistentUnredactedStateRule(spec: AgentSpec): AdvisoryFinding[] {
  const exposed = spec.state.filter(
    (entry) =>
      !entry.redact &&
      (entry.persistence === "project" || spec.customization?.runtime.persistence === "project"),
  );
  if (exposed.length === 0) return [];
  return [
    finding({
      ruleId: "persistent-unredacted-state",
      paths: ["state"],
      severity: "blocking",
      category: "safety",
      title: "Redact state before project persistence",
      explanation:
        "Long-lived unredacted state can retain sensitive content beyond the current run.",
      evidence: exposed.map((entry) => `Unredacted persistent state: ${entry.key}.`),
      patches: [
        {
          path: "state",
          value: spec.state.map((entry) =>
            exposed.some((candidate) => candidate.key === entry.key)
              ? { ...entry, redact: true }
              : entry,
          ),
        },
      ],
      impacts: ["Privacy", "Retention"],
    }),
  ];
}

function missingEvaluationKindsRule(spec: AgentSpec): AdvisoryFinding[] {
  const kinds = new Set(spec.evaluations.map((evaluation) => evaluation.kind));
  if (["negative", "boundary", "policy", "adversarial"].some((kind) => kinds.has(kind as never))) {
    return [];
  }
  const generatedId = uniqueEvaluationId(spec, "generated-boundary-case");
  return [
    finding({
      ruleId: "missing-evaluation-kinds",
      paths: ["evaluations"],
      severity: "recommended",
      category: "testing",
      title: "Add a negative or boundary evaluation",
      explanation: "Positive-only tests do not show how the agent fails or refuses unsafe input.",
      evidence: [`Configured evaluation kinds: ${[...kinds].join(", ")}.`],
      patches: [
        {
          path: "evaluations",
          value: [
            ...spec.evaluations,
            {
              id: generatedId,
              kind: "boundary",
              input: { generatedBoundaryCase: true },
              expected: { safeFailure: true },
              provenance: "spec-derived",
            },
          ],
        },
      ],
      impacts: ["Failure-mode coverage", "Regression confidence"],
    }),
  ];
}

function modelOnlyEvaluationRule(): AdvisoryFinding[] {
  return [];
}

function incompatibleOverrideRule(spec: AgentSpec): AdvisoryFinding[] {
  const overrides = spec.customization?.frameworkOverrides ?? [];
  const incompatible = overrides.filter((override) => override.target !== spec.runtime.target);
  if (incompatible.length === 0) return [];
  return [
    finding({
      ruleId: "incompatible-framework-override",
      paths: ["customization.frameworkOverrides", "runtime.target"],
      severity: "blocking",
      category: "portability",
      title: "Match framework overrides to the artifact target",
      explanation: "A target-specific override cannot be compiled by a different runtime adapter.",
      evidence: incompatible.map(
        (override) => `${override.target} override conflicts with ${spec.runtime.target}.`,
      ),
      patches: [
        {
          path: "customization.frameworkOverrides",
          value: overrides.filter((override) => override.target === spec.runtime.target),
        },
      ],
      impacts: ["Build compatibility", "Portability"],
    }),
  ];
}

function confidentialContentTracingRule(spec: AgentSpec): AdvisoryFinding[] {
  const sensitive = spec.knowledge.filter(
    (source) => source.classification === "confidential" || source.classification === "restricted",
  );
  const observability = spec.customization?.observability;
  if (!observability?.contentCapture || observability.redactSensitive || sensitive.length === 0) {
    return [];
  }
  return [
    finding({
      ruleId: "confidential-content-tracing",
      paths: ["customization.observability.contentCapture"],
      severity: "blocking",
      category: "safety",
      title: "Do not capture unredacted sensitive content",
      explanation:
        "Content tracing would export confidential or restricted values without redaction.",
      evidence: sensitive.map((source) => `${source.classification} source: ${source.id}.`),
      patches: [
        { path: "customization.observability.contentCapture", value: false },
        { path: "customization.observability.redactSensitive", value: true },
      ],
      impacts: ["Privacy", "Trace usefulness"],
    }),
  ];
}

function finding(input: FindingInput): AdvisoryFinding {
  const digest = stableDigest(JSON.stringify(input.evidence));
  return {
    ...input,
    id: `${input.ruleId}:${input.paths.join(",")}:${digest}`,
  };
}

function stableDigest(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function uniqueEvaluationId(spec: AgentSpec, base: string): string {
  const ids = new Set(spec.evaluations.map((evaluation) => evaluation.id));
  if (!ids.has(base)) return base;
  let suffix = 2;
  while (ids.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
