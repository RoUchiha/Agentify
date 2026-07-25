import { ProviderRequestError } from "@/providers/types";
import type { PlanAgentRequest, PlanAgentResult } from "@/server/planner";

type RouteDependencies = {
  plan(request: PlanAgentRequest): Promise<PlanAgentResult>;
};

export function createPlanRoute(dependencies: RouteDependencies) {
  return async function post(request: Request): Promise<Response> {
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return Response.json({ issues: ["Request body must be valid JSON."] }, { status: 400 });
    }

    const parsed = parsePlanRequest(input);
    if (!parsed.ok) {
      return Response.json({ issues: parsed.issues }, { status: 400 });
    }

    try {
      const result = await dependencies.plan(parsed.request);
      return Response.json(result, {
        status:
          result.status === "connection_required"
            ? 503
            : result.status === "invalid_spec"
              ? 422
              : 200,
      });
    } catch (error) {
      if (error instanceof ProviderRequestError) {
        return Response.json(
          {
            status: "provider_unavailable",
            issues: [error.message],
            retryAfterSeconds: error.retryAfterSeconds,
          },
          { status: error.status },
        );
      }
      return Response.json({ issues: ["Agent planning failed safely."] }, { status: 502 });
    }
  };
}

function parsePlanRequest(
  input: unknown,
): { ok: true; request: PlanAgentRequest } | { ok: false; issues: string[] } {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return { ok: false, issues: ["Request body must be an object."] };
  }
  const value = input as Record<string, unknown>;
  if (typeof value.prompt !== "string" || value.prompt.trim().length < 8) {
    return { ok: false, issues: ["Prompt must contain at least 8 characters."] };
  }
  if (!["hybrid", "local", "cloud"].includes(String(value.deploymentMode))) {
    return { ok: false, issues: ["Deployment mode must be hybrid, local, or cloud."] };
  }
  return {
    ok: true,
    request: {
      prompt: value.prompt.trim(),
      deploymentMode: value.deploymentMode as PlanAgentRequest["deploymentMode"],
    },
  };
}
