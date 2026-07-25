import type { AgentSpec } from "@/domain/agent-spec";

export const demoAgentSpec: AgentSpec = {
  metadata: {
    version: "1.0",
    id: "support-triage",
    name: "Support triage",
    description: "Classifies support requests and recommends the next safe action.",
    revision: 1,
  },
  objective: {
    goal: "Triage support requests with evidence and a bounded recommendation.",
    taskTypes: ["support-triage"],
    successCriteria: ["Every recommendation includes a category and evidence."],
    failureConditions: ["The agent attempts an undeclared action."],
    inputSchema: { type: "object", required: ["ticket"] },
    outputSchema: { type: "object", required: ["category", "evidence"] },
  },
  agents: [
    {
      id: "triage-agent",
      name: "Triage agent",
      role: "Support request classifier",
      instructions: "Classify each request using only declared tools and cite the evidence used.",
      toolIds: ["search-kb"],
      handoffs: [],
    },
  ],
  models: {
    mode: "free-auto",
    allowedProviders: ["ollama", "groq"],
    preferredProvider: "free-auto",
    requirements: ["structured-output"],
    fallback: "ask",
  },
  tools: [
    {
      id: "search-kb",
      name: "Search knowledge base",
      description: "Find relevant support documentation.",
      mode: "read",
      risk: "low",
      approval: "none",
      inputSchema: { type: "object", required: ["query"] },
      outputSchema: { type: "object", required: ["results"] },
      timeoutMs: 10_000,
      idempotent: true,
    },
  ],
  knowledge: [],
  state: [],
  workflow: {
    topology: "single",
    nodes: [
      { id: "triage", type: "agent", ref: "triage-agent" },
      { id: "done", type: "termination" },
    ],
    edges: [{ source: "triage", target: "done" }],
    termination: {
      maxSteps: 8,
      condition: "Stop after returning a schema-valid recommendation.",
    },
  },
  budgets: {
    retryLimit: 2,
    maxSteps: 8,
    timeoutMs: 60_000,
    maxTokens: 8_000,
    maxCostUsd: 0,
  },
  runtime: {
    target: "openai-agents-ts",
    deploymentMode: "hybrid",
    sandboxRequired: true,
  },
  evaluations: [
    {
      id: "triage-happy-path",
      kind: "positive",
      input: { ticket: "I cannot reset my password." },
      expected: { category: "account-access" },
      provenance: "spec-derived",
    },
  ],
  decisions: {
    confirmed: ["Use Hybrid execution by default."],
    assumptions: [],
    warnings: [],
    unresolved: [],
  },
};
