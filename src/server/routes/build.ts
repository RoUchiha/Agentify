import {
  HarnessBuilderError,
  type BuildAgentInput,
  type BuildResult,
} from "@/connectors/harness-builder";
import { AgentSpecSchema, ARTIFACT_TARGETS, DEPLOYMENT_MODES } from "@/domain/agent-spec";

type RouteDependencies = {
  build(input: BuildAgentInput): Promise<BuildResult>;
};

export function createBuildRoute(dependencies: RouteDependencies) {
  return async function post(request: Request): Promise<Response> {
    let input: unknown;
    try {
      input = await request.json();
    } catch {
      return Response.json({ issues: ["Request body must be valid JSON."] }, { status: 400 });
    }
    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return Response.json({ issues: ["Request body must be an object."] }, { status: 400 });
    }

    const value = input as Record<string, unknown>;
    const spec = AgentSpecSchema.safeParse(value.spec);
    if (!spec.success) {
      return Response.json(
        { issues: spec.error.issues.map((issue) => issue.message) },
        { status: 400 },
      );
    }
    if (!ARTIFACT_TARGETS.includes(value.target as (typeof ARTIFACT_TARGETS)[number])) {
      return Response.json({ issues: ["Unsupported artifact target."] }, { status: 400 });
    }
    if (!DEPLOYMENT_MODES.includes(value.executionProfile as (typeof DEPLOYMENT_MODES)[number])) {
      return Response.json({ issues: ["Unsupported execution profile."] }, { status: 400 });
    }

    try {
      const result = await dependencies.build({
        spec: spec.data,
        target: value.target as BuildAgentInput["target"],
        executionProfile: value.executionProfile as BuildAgentInput["executionProfile"],
      });
      return Response.json(result, {
        status: result.status === "packaged" ? 200 : 422,
      });
    } catch (error) {
      if (error instanceof HarnessBuilderError) {
        return Response.json(
          { status: "harness_builder_error", issues: error.issues },
          { status: error.status || 502 },
        );
      }
      return Response.json(
        { status: "harness_builder_unavailable", issues: ["HarnessBuilder is unavailable."] },
        { status: 502 },
      );
    }
  };
}
