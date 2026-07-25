import { AgentSpecSchema, type AgentSpecParseResult } from "@/domain/agent-spec";

export function normalizePlannerPayload(input: unknown): AgentSpecParseResult {
  const parsed = AgentSpecSchema.safeParse(input);
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

function unique(values: string[]): string[] {
  return [...new Set(values)];
}
