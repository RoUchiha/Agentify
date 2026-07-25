import { AgentSpecSchema, type AgentSpecParseResult } from "@/domain/agent-spec";

export function normalizePlannerPayload(input: unknown): AgentSpecParseResult {
  const candidate = normalizeConservativeRelationships(input);
  const parsed = AgentSpecSchema.safeParse(candidate);
  if (!parsed.success) {
    return parsed;
  }

  const confirmed = unique(parsed.data.decisions.confirmed);
  const confirmedSet = new Set(confirmed);
  return AgentSpecSchema.safeParse({
    ...parsed.data,
    decisions: {
      confirmed,
      assumptions: unique(parsed.data.decisions.assumptions).filter(
        (assumption) => !confirmedSet.has(assumption),
      ),
      warnings: unique(parsed.data.decisions.warnings),
      unresolved: unique(parsed.data.decisions.unresolved),
    },
  });
}

function normalizeConservativeRelationships(input: unknown): unknown {
  if (!isRecord(input)) {
    return input;
  }

  const candidate = structuredClone(input);
  const agents = Array.isArray(candidate.agents) ? candidate.agents : [];
  const agentIds = new Set(
    agents.flatMap((agent) => (isRecord(agent) && typeof agent.id === "string" ? [agent.id] : [])),
  );
  for (const agent of agents) {
    if (isRecord(agent) && Array.isArray(agent.handoffs)) {
      agent.handoffs = agent.handoffs.filter(
        (handoff): handoff is string => typeof handoff === "string" && agentIds.has(handoff),
      );
    }
  }

  const workflow = isRecord(candidate.workflow) ? candidate.workflow : undefined;
  const termination = workflow && isRecord(workflow.termination) ? workflow.termination : undefined;
  const budgets = isRecord(candidate.budgets) ? candidate.budgets : undefined;
  const workflowMaxSteps = termination?.maxSteps;
  const budgetMaxSteps = budgets?.maxSteps;
  if (
    termination &&
    budgets &&
    typeof workflowMaxSteps === "number" &&
    Number.isInteger(workflowMaxSteps) &&
    typeof budgetMaxSteps === "number" &&
    Number.isInteger(budgetMaxSteps)
  ) {
    const conservativeLimit = Math.min(workflowMaxSteps, budgetMaxSteps);
    termination.maxSteps = conservativeLimit;
    budgets.maxSteps = conservativeLimit;
  }

  return candidate;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
