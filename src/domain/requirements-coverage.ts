import { AgentSpecSchema, type AgentSpec } from "@/domain/agent-spec";

export type RequirementImpact = "permission" | "privacy" | "cost" | "portability" | "deployment";

export type GapOption = {
  id: string;
  label: string;
  value: unknown;
  effort: "easiest" | "moderate" | "advanced";
  explanation: string;
};

export type RequirementGap = {
  id: string;
  path: string;
  severity: "blocking" | "advisory";
  question: string;
  reason: string;
  recommended: GapOption;
  alternatives: GapOption[];
  impacts: RequirementImpact[];
  safeDefaultEligible: boolean;
};

export type RequirementsCoverage = {
  complete: boolean;
  gaps: RequirementGap[];
  defaults: string[];
  assumptions: string[];
  risks: RequirementImpact[];
};

type CoverageRule = {
  id: string;
  evaluate(spec: AgentSpec): RequirementGap[];
};

const unresolvedDecisionRule: CoverageRule = {
  id: "unresolved-decisions",
  evaluate: (spec) =>
    spec.decisions.unresolved.map((decision, index) =>
      gapForDecision(decision, `decisions.unresolved.${index}`),
    ),
};

const missingModelProfileRule: CoverageRule = {
  id: "missing-model-profile",
  evaluate: (spec) => {
    if (
      !spec.customization ||
      spec.models.mode === "free-auto" ||
      spec.customization.modelProfiles.length > 0
    ) {
      return [];
    }

    return [
      {
        id: "model-primary-profile",
        path: "customization.modelProfiles",
        severity: "blocking",
        question: "Which model profile should the agents use?",
        reason:
          "Fixed and adaptive model policies need an executable primary profile before packaging.",
        recommended: option(
          "free-auto-profile",
          "Start with Free Auto",
          { provider: "free-auto", model: "automatic" },
          "easiest",
          "Uses the first compatible free provider and keeps the provider replaceable.",
        ),
        alternatives: [
          option(
            "groq-profile",
            "Use Groq",
            { provider: "groq", model: "llama-3.3-70b-versatile" },
            "moderate",
            "Fast hosted inference; a GROQ_API_KEY reference is needed for live use.",
          ),
          option(
            "ollama-profile",
            "Use local Ollama",
            { provider: "ollama", model: "llama3.2" },
            "advanced",
            "Keeps inference local but requires an Ollama runtime.",
          ),
        ],
        impacts: ["cost", "portability", "deployment"],
        safeDefaultEligible: true,
      },
    ];
  },
};

const writeApprovalRule: CoverageRule = {
  id: "write-approval",
  evaluate: (spec) =>
    spec.tools
      .filter(
        (tool) =>
          tool.mode === "write" &&
          (tool.risk === "high" || tool.risk === "critical") &&
          !spec.decisions.confirmed.includes(`Authorize high-risk tool: ${tool.id}`),
      )
      .map((tool) => ({
        id: `write-authorization-${tool.id}`,
        path: `tools.${spec.tools.indexOf(tool)}.approval`,
        severity: "blocking" as const,
        question: `Authorize ${tool.name} to perform high-risk writes?`,
        reason: "High-risk external mutations require an explicit operator decision.",
        recommended: option(
          "keep-disabled",
          "Keep this write disabled",
          false,
          "easiest",
          "Builds without granting the high-risk write capability.",
        ),
        alternatives: [
          option(
            "runtime-approval",
            "Require approval on every write",
            "runtime",
            "moderate",
            "Allows the write only after a runtime operator approval.",
          ),
        ],
        impacts: ["permission", "privacy"],
        safeDefaultEligible: false,
      })),
};

const restrictedCloudRule: CoverageRule = {
  id: "restricted-cloud",
  evaluate: (spec) => {
    if (
      spec.runtime.deploymentMode !== "cloud" ||
      !spec.knowledge.some((source) => source.classification === "restricted") ||
      spec.decisions.confirmed.includes("Authorize restricted data for Cloud execution.")
    ) {
      return [];
    }
    return [
      {
        id: "restricted-cloud-authorization",
        path: "runtime.deploymentMode",
        severity: "blocking",
        question: "May restricted knowledge leave the local runtime?",
        reason: "Cloud execution would move restricted data across a trust boundary.",
        recommended: option(
          "use-hybrid",
          "Use Hybrid execution",
          "hybrid",
          "easiest",
          "Keeps sensitive operations local while preserving hosted orchestration.",
        ),
        alternatives: [
          option(
            "authorize-cloud",
            "Explicitly authorize Cloud",
            "cloud",
            "advanced",
            "Permits restricted sources in Cloud after an explicit data-governance decision.",
          ),
        ],
        impacts: ["privacy", "deployment"],
        safeDefaultEligible: false,
      },
    ];
  },
};

const missingEvaluationRule: CoverageRule = {
  id: "missing-evaluation",
  evaluate: (spec) =>
    spec.evaluations.length > 0
      ? []
      : [
          {
            id: "evaluation-smoke-case",
            path: "evaluations",
            severity: "blocking",
            question: "What deterministic smoke case should verify this agent?",
            reason: "Every generated agent needs at least one repeatable acceptance check.",
            recommended: option(
              "schema-smoke-case",
              "Generate a schema-valid smoke case",
              true,
              "easiest",
              "Uses the declared input and output contracts without model-based grading.",
            ),
            alternatives: [],
            impacts: ["portability"],
            safeDefaultEligible: true,
          },
        ],
};

const incompatibleTargetRule: CoverageRule = {
  id: "incompatible-target",
  evaluate: (spec) =>
    (spec.customization?.frameworkOverrides ?? [])
      .filter((override) => override.target !== spec.runtime.target)
      .map((override, index) => ({
        id: `incompatible-target-${index}`,
        path: `customization.frameworkOverrides.${index}.target`,
        severity: "blocking" as const,
        question: `Should the ${override.target} override be removed or should the build target change?`,
        reason: `The current ${spec.runtime.target} target cannot compile a ${override.target} override.`,
        recommended: option(
          "remove-incompatible-override",
          "Remove the incompatible override",
          override.target,
          "easiest",
          "Keeps the selected artifact target and removes only the incompatible target override.",
        ),
        alternatives: [
          option(
            "change-target",
            `Change target to ${override.target}`,
            override.target,
            "moderate",
            "Changes the generated runtime to match the override.",
          ),
        ],
        impacts: ["portability", "deployment"],
        safeDefaultEligible: false,
      })),
};

const RULES: CoverageRule[] = [
  unresolvedDecisionRule,
  missingModelProfileRule,
  writeApprovalRule,
  restrictedCloudRule,
  missingEvaluationRule,
  incompatibleTargetRule,
];

export function analyzeRequirements(spec: AgentSpec): RequirementsCoverage {
  const gaps = RULES.flatMap((rule) => rule.evaluate(spec));
  return {
    complete: gaps.every((gap) => gap.severity !== "blocking"),
    gaps,
    defaults: collectAppliedDefaults(spec),
    assumptions: [...spec.decisions.assumptions],
    risks: unique(gaps.flatMap((gap) => gap.impacts)),
  };
}

export function answerRequirement(
  spec: AgentSpec,
  gap: RequirementGap,
  selected: GapOption,
): AgentSpec {
  const allowed = [gap.recommended, ...gap.alternatives].find(
    (candidate) => candidate.id === selected.id,
  );
  if (!allowed) {
    throw new Error("Unsupported requirement answer.");
  }

  let updated: AgentSpec;
  if (gap.id === "model-primary-profile") {
    updated = applyModelProfile(spec, allowed);
  } else if (gap.id === "decision-runtime-deployment-mode") {
    updated = applyDeploymentMode(spec, gap, allowed);
  } else if (gap.id.startsWith("decision-")) {
    updated = applyDecision(spec, gap, allowed);
  } else if (gap.id.startsWith("write-authorization-")) {
    updated = applyWriteDecision(spec, gap, allowed);
  } else if (gap.id === "restricted-cloud-authorization") {
    updated = applyRestrictedCloudDecision(spec, allowed);
  } else if (gap.id.startsWith("incompatible-target-")) {
    updated = applyTargetDecision(spec, gap, allowed);
  } else {
    throw new Error("Unsupported requirement answer.");
  }

  return AgentSpecSchema.parse(updated);
}

export function applyAllSafeDefaults(
  spec: AgentSpec,
  coverage: RequirementsCoverage = analyzeRequirements(spec),
): AgentSpec {
  return coverage.gaps
    .filter((gap) => gap.safeDefaultEligible)
    .reduce(
      (current, gap) => answerRequirement(current, gap, gap.recommended),
      structuredClone(spec),
    );
}

function gapForDecision(decision: string, path: string): RequirementGap {
  const normalized = decision.toLowerCase();
  if (/(where|how).*(run|host|deploy)/.test(normalized)) {
    return {
      id: "decision-runtime-deployment-mode",
      path,
      severity: "blocking",
      question: decision,
      reason: "The runtime boundary determines what can remain local and what must be hosted.",
      recommended: option(
        "hybrid",
        "Use Hybrid execution",
        "hybrid",
        "easiest",
        "Keeps sensitive actions local while allowing hosted orchestration.",
      ),
      alternatives: [
        option("local", "Run fully local", "local", "moderate", "Requires a local runtime."),
        option("cloud", "Run in Cloud", "cloud", "moderate", "Requires hosted credentials."),
      ],
      impacts: ["privacy", "deployment"],
      safeDefaultEligible: true,
    };
  }
  if (/\bcrm\b|salesforce|hubspot/.test(normalized)) {
    return {
      id: "decision-crm-destination",
      path,
      severity: "blocking",
      question: decision,
      reason:
        "A CRM write changes external records and needs an explicit destination and authority.",
      recommended: option(
        "read-only",
        "Start read-only without a CRM write",
        "read-only",
        "easiest",
        "Returns a recommendation without changing any CRM record.",
      ),
      alternatives: [
        option(
          "hubspot",
          "Connect HubSpot with approvals",
          "hubspot",
          "moderate",
          "Adds an approval-gated HubSpot write integration.",
        ),
        option(
          "salesforce",
          "Connect Salesforce with approvals",
          "salesforce",
          "advanced",
          "Adds an approval-gated Salesforce integration.",
        ),
      ],
      impacts: ["permission", "deployment"],
      safeDefaultEligible: false,
    };
  }

  const sensitive =
    /api key|credential|secret|password/.test(normalized) ||
    /delete|write|send|message|email|publish/.test(normalized) ||
    /public|region|residen/.test(normalized) ||
    /retain|retention|store/.test(normalized);
  const identity = slug(decision).slice(0, 48) || "unresolved";
  return {
    id: `decision-${identity}`,
    path,
    severity: "blocking",
    question: decision,
    reason: sensitive
      ? "This choice changes credentials, permissions, data handling, or deployment and cannot be assumed."
      : "The requested behavior depends on a decision that is not present in the spec.",
    recommended: option(
      "operator-checkpoint",
      sensitive ? "Keep this capability disabled" : "Add an operator checkpoint",
      false,
      "easiest",
      sensitive
        ? "Builds the rest of the agent without granting this capability."
        : "Pauses at runtime until an operator supplies the missing decision.",
    ),
    alternatives: [
      option(
        "explicit-configuration",
        "Configure it explicitly",
        true,
        "moderate",
        "Records the developer-selected behavior in the spec.",
      ),
    ],
    impacts: sensitive ? sensitiveImpacts(normalized) : ["portability"],
    safeDefaultEligible: false,
  };
}

function applyModelProfile(spec: AgentSpec, selected: GapOption): AgentSpec {
  if (!spec.customization) throw new Error("Unsupported requirement answer.");
  const value = selected.value as { provider: string; model: string };
  const profile = {
    id: "primary",
    provider: value.provider,
    model: value.model,
    temperature: 0.2,
    topP: 1,
    maxOutputTokens: spec.budgets.maxTokens,
    reasoningEffort: "none" as const,
    toolChoice: spec.tools.length > 0 ? ("auto" as const) : ("none" as const),
    parallelToolCalls: false,
    structuredOutput: "required" as const,
    timeoutMs: spec.budgets.timeoutMs,
    fallbackProfileIds: [],
  };
  return {
    ...structuredClone(spec),
    models: {
      ...spec.models,
      mode: value.provider === "free-auto" ? "free-auto" : "fixed",
      preferredProvider: value.provider as AgentSpec["models"]["preferredProvider"],
    },
    customization: {
      ...spec.customization,
      modelProfiles: [profile] as AgentSpec["customization"] extends infer C
        ? C extends { modelProfiles: infer P }
          ? P
          : never
        : never,
      agentModelProfiles: Object.fromEntries(spec.agents.map((agent) => [agent.id, "primary"])),
    },
  };
}

function applyDeploymentMode(spec: AgentSpec, gap: RequirementGap, selected: GapOption): AgentSpec {
  const next = applyDecision(spec, gap, selected);
  return {
    ...next,
    runtime: {
      ...next.runtime,
      deploymentMode: selected.value as AgentSpec["runtime"]["deploymentMode"],
    },
  };
}

function applyDecision(spec: AgentSpec, gap: RequirementGap, selected: GapOption): AgentSpec {
  const next = structuredClone(spec);
  next.decisions.unresolved = next.decisions.unresolved.filter(
    (decision) => decision !== gap.question,
  );
  next.decisions.confirmed = unique([
    ...next.decisions.confirmed,
    `${selected.label.replace(/[.?!]+$/, "")}.`,
  ]);
  return next;
}

function applyWriteDecision(spec: AgentSpec, gap: RequirementGap, selected: GapOption): AgentSpec {
  const toolId = gap.id.replace("write-authorization-", "");
  if (selected.id !== "runtime-approval") {
    const next = structuredClone(spec);
    next.agents = next.agents.map((agent) => ({
      ...agent,
      toolIds: agent.toolIds.filter((id) => id !== toolId),
    }));
    next.tools = next.tools.filter((tool) => tool.id !== toolId);
    if (next.customization) {
      next.customization.toolPolicies = next.customization.toolPolicies.filter(
        (policy) => policy.toolId !== toolId,
      );
    }
    return next;
  }
  const next = structuredClone(spec);
  next.decisions.confirmed = unique([
    ...next.decisions.confirmed,
    `Authorize high-risk tool: ${toolId}`,
  ]);
  return next;
}

function applyRestrictedCloudDecision(spec: AgentSpec, selected: GapOption): AgentSpec {
  const next = structuredClone(spec);
  if (selected.id === "authorize-cloud") {
    next.decisions.confirmed = unique([
      ...next.decisions.confirmed,
      "Authorize restricted data for Cloud execution.",
    ]);
  } else {
    next.runtime.deploymentMode = "hybrid";
  }
  return next;
}

function applyTargetDecision(spec: AgentSpec, gap: RequirementGap, selected: GapOption): AgentSpec {
  const next = structuredClone(spec);
  if (!next.customization) throw new Error("Unsupported requirement answer.");
  const index = Number(gap.path.split(".")[2]);
  if (!Number.isInteger(index)) throw new Error("Unsupported requirement answer.");
  if (selected.id === "remove-incompatible-override") {
    next.customization.frameworkOverrides.splice(index, 1);
  } else {
    next.runtime.target = selected.value as AgentSpec["runtime"]["target"];
  }
  return next;
}

function collectAppliedDefaults(spec: AgentSpec): string[] {
  const defaults: string[] = [];
  if (spec.models.preferredProvider === "free-auto") defaults.push("Free Auto model routing");
  if (spec.runtime.deploymentMode === "hybrid") defaults.push("Hybrid execution");
  if (spec.runtime.sandboxRequired) defaults.push("Sandbox required");
  return defaults;
}

function option(
  id: string,
  label: string,
  value: unknown,
  effort: GapOption["effort"],
  explanation: string,
): GapOption {
  return { id, label, value, effort, explanation };
}

function sensitiveImpacts(text: string): RequirementImpact[] {
  const impacts: RequirementImpact[] = [];
  if (/api key|credential|secret|password|delete|write|send|message|email|publish/.test(text)) {
    impacts.push("permission");
  }
  if (/retain|retention|store|region|residen/.test(text)) impacts.push("privacy");
  if (/public|publish|deploy|region|residen/.test(text)) impacts.push("deployment");
  return impacts.length > 0 ? impacts : ["permission"];
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
