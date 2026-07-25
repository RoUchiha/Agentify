export type StudioSection = {
  id: string;
  label: string;
  description: string;
  roots: string[];
  raw?: boolean;
};

export type FieldHint = {
  label?: string;
  description?: string;
  enumValues?: readonly string[];
  multiline?: boolean;
  json?: boolean;
};

export type ArrayTemplate = {
  label: string;
  value: unknown;
};

export type OptionalFieldTemplate = {
  key: string;
  label: string;
  value: unknown;
};

export const EDITABLE_ROOT_PATHS = [
  "metadata",
  "objective",
  "agents",
  "models",
  "tools",
  "knowledge",
  "state",
  "workflow",
  "budgets",
  "runtime",
  "evaluations",
  "decisions",
  "customization.modelProfiles",
  "customization.agentModelProfiles",
  "customization.toolPolicies",
  "customization.knowledgePolicies",
  "customization.statePolicies",
  "customization.workflow",
  "customization.guardrails",
  "customization.hooks",
  "customization.reliability",
  "customization.runtime",
  "customization.observability",
  "customization.delivery",
  "customization.providerOverrides",
  "customization.frameworkOverrides",
] as const;

export const STUDIO_SECTIONS: StudioSection[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Identity, revision, confirmed decisions, assumptions, warnings, and open questions.",
    roots: ["metadata", "decisions"],
  },
  {
    id: "objective",
    label: "Objective and schemas",
    description: "Goals, accepted task types, success criteria, failures, and JSON contracts.",
    roots: ["objective"],
  },
  {
    id: "agents",
    label: "Agents and instructions",
    description: "Roles, instructions, callable tools, handoffs, and model assignments.",
    roots: ["agents", "customization.agentModelProfiles"],
  },
  {
    id: "models",
    label: "Models and providers",
    description: "Routing policy, model profiles, sampling, tool choice, fallback, and timeouts.",
    roots: ["models", "customization.modelProfiles"],
  },
  {
    id: "tools",
    label: "Tools and permissions",
    description: "Tool contracts, write authority, approvals, connections, retries, caching, and credentials.",
    roots: ["tools", "customization.toolPolicies"],
  },
  {
    id: "knowledge",
    label: "Knowledge",
    description: "Sources, classifications, retention, retrieval, freshness, citations, and failure policy.",
    roots: ["knowledge", "customization.knowledgePolicies"],
  },
  {
    id: "state",
    label: "Memory and state",
    description: "State schemas, visibility, persistence, redaction, initialization, writers, and conflicts.",
    roots: ["state", "customization.statePolicies"],
  },
  {
    id: "workflow",
    label: "Workflow",
    description: "Topology, nodes, edges, routing conditions, retries, loops, checkpoints, and termination.",
    roots: ["workflow", "customization.workflow"],
  },
  {
    id: "guardrails",
    label: "Guardrails and approvals",
    description: "Input, output, tool, and handoff rules with explicit actions and severity.",
    roots: ["customization.guardrails"],
  },
  {
    id: "hooks",
    label: "Hooks and lifecycle",
    description: "Lifecycle events, handler references, execution locations, timeouts, and failure behavior.",
    roots: ["customization.hooks"],
  },
  {
    id: "budgets",
    label: "Budgets and reliability",
    description: "Steps, tokens, cost, timeout, retry, concurrency, and failure behavior.",
    roots: ["budgets", "customization.reliability"],
  },
  {
    id: "runtime",
    label: "Runtime and sandbox",
    description: "Artifact target, deployment boundary, network, filesystem, streaming, and persistence.",
    roots: ["runtime", "customization.runtime"],
  },
  {
    id: "evaluations",
    label: "Evaluations",
    description: "Positive, negative, boundary, policy, and adversarial acceptance cases.",
    roots: ["evaluations"],
  },
  {
    id: "observability",
    label: "Observability",
    description: "Traces, logs, metrics, content capture, sampling, redaction, retention, and exporters.",
    roots: ["customization.observability"],
  },
  {
    id: "delivery",
    label: "Delivery and targets",
    description: "Package identity and the spec, tests, CI, README, and environment artifacts to include.",
    roots: ["customization.delivery"],
  },
  {
    id: "overrides",
    label: "Provider/framework overrides",
    description: "Provider-specific connection settings and target-specific runtime behavior.",
    roots: ["customization.providerOverrides", "customization.frameworkOverrides"],
  },
  {
    id: "raw",
    label: "Raw AgentSpec",
    description: "Edit the complete strict portable contract directly.",
    roots: [],
    raw: true,
  },
];

const ENUM_HINTS: Record<string, readonly string[]> = {
  "metadata.version": ["1.0", "1.1"],
  "models.mode": ["free-auto", "fixed", "adaptive"],
  "models.allowedProviders.[]": [
    "free-auto",
    "ollama",
    "groq",
    "openai",
    "anthropic",
    "google",
  ],
  "models.preferredProvider": [
    "free-auto",
    "ollama",
    "groq",
    "openai",
    "anthropic",
    "google",
  ],
  "models.requirements.[]": ["structured-output", "tool-use", "vision", "long-context"],
  "models.fallback": ["ask", "compatible-provider", "none"],
  "tools.[].mode": ["read", "write"],
  "tools.[].risk": ["low", "medium", "high", "critical"],
  "tools.[].approval": ["none", "required"],
  "knowledge.[].kind": ["file", "url", "api", "vector-store", "inline"],
  "knowledge.[].classification": ["public", "internal", "confidential", "restricted"],
  "knowledge.[].retention": ["run", "project", "external"],
  "state.[].visibility": ["agent", "team", "operator"],
  "state.[].persistence": ["run", "session", "project"],
  "workflow.topology": ["single", "team"],
  "workflow.nodes.[].type": [
    "input",
    "agent",
    "tool",
    "knowledge",
    "transform",
    "router",
    "approval",
    "subflow",
    "termination",
  ],
  "runtime.target": [
    "openai-agents-ts",
    "openai-agents-python",
    "mcp-server",
    "portable-spec",
  ],
  "runtime.deploymentMode": ["hybrid", "local", "cloud"],
  "evaluations.[].kind": ["positive", "negative", "boundary", "policy", "adversarial"],
  "evaluations.[].provenance": [
    "user-provided",
    "spec-derived",
    "adapter-conformance",
    "hardening",
  ],
  "customization.modelProfiles.[].provider": [
    "free-auto",
    "ollama",
    "groq",
    "openai",
    "anthropic",
    "google",
  ],
  "customization.modelProfiles.[].reasoningEffort": ["none", "low", "medium", "high"],
  "customization.modelProfiles.[].toolChoice": ["auto", "none", "required"],
  "customization.modelProfiles.[].structuredOutput": ["required", "preferred", "off"],
  "customization.toolPolicies.[].connection": ["none", "function", "http", "mcp"],
  "customization.toolPolicies.[].approvalTiming": ["none", "runtime", "always"],
  "customization.toolPolicies.[].cache": ["none", "run", "session"],
  "customization.knowledgePolicies.[].failureMode": ["stop", "continue", "ask"],
  "customization.statePolicies.[].initialization": ["empty", "input", "constant"],
  "customization.statePolicies.[].conflict": ["reject", "last-write-wins", "merge"],
  "customization.workflow.checkpoints.[].approval": ["none", "operator"],
  "customization.guardrails.[].stage": ["input", "output", "tool", "handoff"],
  "customization.guardrails.[].action": ["block", "redact", "ask", "log"],
  "customization.guardrails.[].severity": ["low", "medium", "high", "critical"],
  "customization.hooks.[].event": [
    "run-start",
    "run-end",
    "model-start",
    "model-end",
    "tool-start",
    "tool-end",
    "handoff",
    "error",
  ],
  "customization.hooks.[].failureMode": ["stop", "continue"],
  "customization.hooks.[].location": ["local", "server", "generated-runtime"],
  "customization.reliability.failureMode": ["stop", "continue", "fallback"],
  "customization.runtime.network": ["none", "declared-only", "unrestricted"],
  "customization.runtime.filesystem": ["none", "sandbox", "declared-paths"],
  "customization.runtime.persistence": ["none", "run", "session", "project"],
  "customization.observability.traceLevel": ["off", "errors", "actions", "full"],
  "customization.observability.logLevel": ["error", "warn", "info", "debug"],
  "customization.observability.exporters.[]": ["console", "otlp", "file"],
  "customization.providerOverrides.[].provider": [
    "groq",
    "ollama",
    "openai",
    "anthropic",
    "google",
  ],
  "customization.providerOverrides.[].serviceTier": ["free", "on-demand"],
  "customization.frameworkOverrides.[].target": [
    "openai-agents-ts",
    "openai-agents-python",
    "mcp-server",
    "portable-spec",
  ],
  "customization.frameworkOverrides.[].transport": ["stdio", "streamable-http"],
};

const LABELS: Record<string, string> = {
  "metadata.name": "Project name",
  "agents.[].id": "Agent identifier",
  "agents.[].name": "Agent name",
  "tools.[].id": "Tool identifier",
  "tools.[].name": "Tool name",
  "budgets.maxTokens": "Maximum tokens",
  "budgets.maxCostUsd": "Maximum cost (USD)",
  "customization.observability.traceLevel": "Trace level",
  "customization.toolPolicies.[].credentialRef": "Credential reference",
};

const JSON_PATHS = new Set([
  "objective.inputSchema",
  "objective.outputSchema",
  "tools.[].inputSchema",
  "tools.[].outputSchema",
  "state.[].schema",
  "customization.agentModelProfiles",
  "customization.statePolicies.[].defaultValue",
  "evaluations.[].input",
  "evaluations.[].expected",
]);

const MULTILINE_PATHS = new Set([
  "metadata.description",
  "objective.goal",
  "agents.[].instructions",
  "customization.guardrails.[].rule",
  "customization.frameworkOverrides.[].instructions",
]);

export function getFieldHint(path: string): FieldHint {
  const normalized = normalizePath(path);
  return {
    label: LABELS[normalized],
    enumValues: ENUM_HINTS[normalized],
    json: JSON_PATHS.has(normalized),
    multiline: MULTILINE_PATHS.has(normalized),
  };
}

export function getArrayTemplates(path: string): ArrayTemplate[] {
  const normalized = normalizePath(path);
  const templates = ARRAY_TEMPLATES[normalized];
  if (templates) return templates;
  return [{ label: "Add item", value: "new-value" }];
}

export function getOptionalFieldTemplates(path: string): OptionalFieldTemplate[] {
  return OPTIONAL_FIELD_TEMPLATES[normalizePath(path)] ?? [];
}

export function fieldLabel(path: string): string {
  const hint = getFieldHint(path);
  if (hint.label) return hint.label;
  const raw = path.split(".").at(-1) ?? path;
  return raw
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/^./, (character) => character.toUpperCase());
}

function normalizePath(path: string): string {
  return path.replace(/\.\d+(?=\.|$)/g, ".[]");
}

const ARRAY_TEMPLATES: Record<string, ArrayTemplate[]> = {
  "objective.taskTypes": [{ label: "Add task type", value: "new-task" }],
  "objective.successCriteria": [{ label: "Add success criterion", value: "Describe success." }],
  "objective.failureConditions": [{ label: "Add failure condition", value: "Describe failure." }],
  agents: [
    {
      label: "Add agent",
      value: {
        id: "new-agent",
        name: "New agent",
        role: "Defined agent role",
        instructions: "Follow the declared objective and use only declared capabilities.",
        toolIds: [],
        handoffs: [],
      },
    },
  ],
  "agents.[].toolIds": [{ label: "Add tool reference", value: "tool-id" }],
  "agents.[].handoffs": [{ label: "Add handoff", value: "agent-id" }],
  "models.allowedProviders": [{ label: "Add provider", value: "groq" }],
  "models.requirements": [{ label: "Add requirement", value: "structured-output" }],
  tools: [
    {
      label: "Add tool",
      value: {
        id: "new-tool",
        name: "New tool",
        description: "Declared tool capability.",
        mode: "read",
        risk: "low",
        approval: "none",
        inputSchema: { type: "object" },
        outputSchema: { type: "object" },
        timeoutMs: 10_000,
        idempotent: true,
      },
    },
  ],
  knowledge: [
    {
      label: "Add knowledge source",
      value: {
        id: "new-knowledge",
        name: "New knowledge",
        kind: "inline",
        reference: "Connect or enter the source.",
        classification: "internal",
        retention: "run",
      },
    },
  ],
  state: [
    {
      label: "Add state",
      value: {
        key: "new-state",
        schema: { type: "object" },
        visibility: "agent",
        persistence: "run",
        redact: true,
      },
    },
  ],
  "workflow.nodes": [
    { label: "Add transform node", value: { id: "new-node", type: "transform" } },
  ],
  "workflow.edges": [
    { label: "Add edge", value: { source: "source-node", target: "target-node" } },
  ],
  evaluations: [
    {
      label: "Add evaluation",
      value: {
        id: "new-evaluation",
        kind: "boundary",
        input: {},
        expected: {},
        provenance: "user-provided",
      },
    },
  ],
  "decisions.confirmed": [{ label: "Add confirmed decision", value: "Confirmed decision." }],
  "decisions.assumptions": [{ label: "Add assumption", value: "Assumption to validate." }],
  "decisions.warnings": [{ label: "Add warning", value: "Known warning." }],
  "decisions.unresolved": [{ label: "Add unresolved decision", value: "Decision needed?" }],
  "customization.modelProfiles": [
    {
      label: "Add model profile",
      value: {
        id: "primary",
        provider: "free-auto",
        model: "automatic",
        temperature: 0.2,
        topP: 1,
        maxOutputTokens: 8_000,
        reasoningEffort: "none",
        toolChoice: "auto",
        parallelToolCalls: false,
        structuredOutput: "required",
        timeoutMs: 60_000,
        fallbackProfileIds: [],
      },
    },
  ],
  "customization.modelProfiles.[].fallbackProfileIds": [
    { label: "Add fallback profile", value: "fallback-profile" },
  ],
  "customization.toolPolicies": [
    {
      label: "Add tool policy",
      value: {
        toolId: "tool-id",
        connection: "function",
        approvalTiming: "runtime",
        retries: 1,
        concurrency: 1,
        cache: "none",
      },
    },
  ],
  "customization.knowledgePolicies": [
    {
      label: "Add knowledge policy",
      value: {
        knowledgeId: "knowledge-id",
        freshnessMinutes: 60,
        chunkSize: 1_024,
        topK: 5,
        requireCitations: true,
        failureMode: "ask",
      },
    },
  ],
  "customization.statePolicies": [
    {
      label: "Add state policy",
      value: {
        stateKey: "state-key",
        initialization: "empty",
        defaultValue: null,
        mutableBy: [],
        maxBytes: 65_536,
        conflict: "reject",
      },
    },
  ],
  "customization.statePolicies.[].mutableBy": [
    { label: "Add mutable agent", value: "agent-id" },
  ],
  "customization.workflow.nodePolicies": [
    {
      label: "Add node policy",
      value: { nodeId: "node-id", timeoutMs: 60_000, retries: 1 },
    },
  ],
  "customization.workflow.edgePolicies": [
    {
      label: "Add edge policy",
      value: { source: "source-node", target: "target-node", priority: 0, loopLimit: 0 },
    },
  ],
  "customization.workflow.checkpoints": [
    {
      label: "Add checkpoint",
      value: {
        id: "checkpoint",
        afterNodeId: "node-id",
        approval: "operator",
        persist: false,
      },
    },
  ],
  "customization.guardrails": [
    {
      label: "Add guardrail",
      value: {
        id: "new-guardrail",
        stage: "output",
        rule: "Block output that violates the declared contract.",
        action: "block",
        severity: "high",
      },
    },
  ],
  "customization.hooks": [
    {
      label: "Add hook",
      value: {
        id: "new-hook",
        event: "run-end",
        handlerRef: "handlers/on-run-end",
        timeoutMs: 5_000,
        failureMode: "continue",
        location: "generated-runtime",
      },
    },
  ],
  "customization.observability.exporters": [{ label: "Add exporter", value: "console" }],
  "customization.providerOverrides": [
    {
      label: "Add Groq override",
      value: { provider: "groq", model: "llama-3.3-70b-versatile", serviceTier: "free" },
    },
    {
      label: "Add Ollama override",
      value: {
        provider: "ollama",
        model: "llama3.2",
        baseUrlRef: "OLLAMA_BASE_URL",
        keepAlive: "5m",
      },
    },
    {
      label: "Add OpenAI override",
      value: { provider: "openai", model: "gpt-5-mini", credentialRef: "OPENAI_API_KEY" },
    },
    {
      label: "Add Anthropic override",
      value: {
        provider: "anthropic",
        model: "claude-sonnet-4",
        credentialRef: "ANTHROPIC_API_KEY",
      },
    },
    {
      label: "Add Google override",
      value: { provider: "google", model: "gemini-2.5-flash", credentialRef: "GOOGLE_API_KEY" },
    },
  ],
  "customization.frameworkOverrides": [
    {
      label: "Add TypeScript Agents override",
      value: {
        target: "openai-agents-ts",
        tracingDisabled: false,
        workflowName: "Agentify workflow",
      },
    },
    {
      label: "Add Python Agents override",
      value: {
        target: "openai-agents-python",
        tracingDisabled: false,
        workflowName: "Agentify workflow",
      },
    },
    {
      label: "Add MCP override",
      value: { target: "mcp-server", transport: "stdio", instructions: "" },
    },
    { label: "Add portable override", value: { target: "portable-spec" } },
  ],
};

const OPTIONAL_FIELD_TEMPLATES: Record<string, OptionalFieldTemplate[]> = {
  "workflow.nodes.[]": [{ key: "ref", label: "Ref", value: "agent-id" }],
  "workflow.edges.[]": [{ key: "condition", label: "Condition", value: "always" }],
  "customization.modelProfiles.[]": [{ key: "seed", label: "Seed", value: 0 }],
  "customization.toolPolicies.[]": [
    {
      key: "credentialRef",
      label: "Credential reference",
      value: "CREDENTIAL_ENV",
    },
  ],
  "customization.workflow.nodePolicies.[]": [
    { key: "failureTarget", label: "Failure target", value: "node-id" },
  ],
  "customization.delivery": [
    { key: "packageName", label: "Package name", value: "agent-package" },
  ],
};
