import { AgentSpecSchema } from "@/domain/agent-spec";
import type { PlaygroundRequest, PlaygroundRun } from "@/server/playground";

type RouteDependencies = {
  run(request: PlaygroundRequest): Promise<PlaygroundRun>;
};

export function createPlaygroundRoute(dependencies: RouteDependencies) {
  return async function post(request: Request): Promise<Response> {
    const raw = await request.text();
    if (raw.length > 256_000) {
      return Response.json(
        { issues: ["Playground request exceeds the 256 KB limit."] },
        { status: 413 },
      );
    }
    let input: unknown;
    try {
      input = JSON.parse(raw) as unknown;
    } catch {
      return Response.json({ issues: ["Request body must be valid JSON."] }, { status: 400 });
    }

    if (typeof input !== "object" || input === null || Array.isArray(input)) {
      return Response.json({ issues: ["Request body must be an object."] }, { status: 400 });
    }
    const value = input as Record<string, unknown>;
    const parsedSpec = AgentSpecSchema.safeParse(value.spec);
    if (!parsedSpec.success) {
      return Response.json(
        { issues: parsedSpec.error.issues.map((issue) => issue.message) },
        { status: 400 },
      );
    }

    const result = await dependencies.run({ spec: parsedSpec.data, input: value.input });
    return Response.json(result, { status: 200 });
  };
}
