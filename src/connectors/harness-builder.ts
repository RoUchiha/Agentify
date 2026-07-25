import { createHash } from "node:crypto";

import { z } from "zod";

import type { AgentSpec, ArtifactTarget, DeploymentMode } from "@/domain/agent-spec";

export const BUILD_STATUSES = [
  "accepted",
  "planning",
  "generating_tests",
  "verifying_red",
  "generating_implementation",
  "testing",
  "hardening",
  "verifying",
  "packaged",
] as const;

const BuildResultSchema = z
  .object({
    buildId: z.string().min(1),
    status: z.enum(["packaged", "failed"]),
    events: z.array(
      z
        .object({
          status: z.string().min(1),
          evidence: z.string().min(1),
        })
        .strict(),
    ),
    artifact: z
      .object({
        files: z.array(
          z.object({ path: z.string().min(1), content: z.string() }).strict(),
        ),
        manifest: z
          .object({
            formatVersion: z.literal(1),
            specName: z.string(),
            runtime: z.string(),
            modules: z.array(z.string()),
            gates: z.array(z.string()),
            files: z.array(z.string()),
            immutableSpec: z
              .object({ path: z.literal("harness.spec.yaml"), checksum: z.string() })
              .strict(),
            agentSpecVersion: z.literal("1.0"),
            artifactTarget: z.enum([
              "openai-agents-ts",
              "openai-agents-python",
              "mcp-server",
              "portable-spec",
            ]),
            executionProfile: z.enum(["hybrid", "local", "cloud"]),
          })
          .strict(),
        checksums: z.record(z.string(), z.string()),
      })
      .strict(),
    report: z
      .object({
        status: z.enum(["passed", "failed"]),
        gates: z.array(
          z
            .object({
              id: z.string(),
              status: z.enum(["passed", "failed"]),
              blocking: z.literal(true),
              evidence: z.array(z.string()),
            })
            .strict(),
        ),
        generatedAt: z.string().optional(),
        delivery: z
          .object({
            status: z.string(),
            message: z.string(),
          })
          .optional(),
      })
      .strict(),
  })
  .passthrough();

export type BuildResult = z.infer<typeof BuildResultSchema>;

export type BuildAgentInput = {
  spec: AgentSpec;
  target: ArtifactTarget;
  executionProfile: DeploymentMode;
};

export type HarnessBuilderOptions = {
  baseUrl: string;
  serviceToken?: string;
  fetcher?: typeof fetch;
};

export class HarnessBuilderError extends Error {
  readonly status: number;
  readonly issues: string[];
  readonly details?: unknown;

  constructor(status: number, issues: string[], details?: unknown) {
    super(issues.join(" ") || "HarnessBuilder rejected the build.");
    this.name = "HarnessBuilderError";
    this.status = status;
    this.issues = issues;
    this.details = details;
  }
}

export async function buildAgent(
  input: BuildAgentInput,
  options: HarnessBuilderOptions,
): Promise<BuildResult> {
  const idempotencyKey = createIdempotencyKey(input);
  const fetcher = options.fetcher ?? fetch;
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "idempotency-key": idempotencyKey,
    "x-trace-id": idempotencyKey.slice(0, 24),
  };
  if (options.serviceToken) {
    headers.authorization = `Bearer ${options.serviceToken}`;
  }

  const response = await fetcher(
    `${options.baseUrl.replace(/\/+$/, "")}/api/v1/agent-builds`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        contractVersion: "1.0",
        agentSpec: input.spec,
        target: input.target,
        executionProfile: input.executionProfile,
        idempotencyKey,
      }),
      signal: AbortSignal.timeout(120_000),
    },
  );
  const body = (await response.json()) as unknown;
  const parsed = BuildResultSchema.safeParse(body);
  if (parsed.success) {
    return parsed.data;
  }

  const errorBody =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  const issues = Array.isArray(errorBody.issues)
    ? errorBody.issues.filter((issue): issue is string => typeof issue === "string")
    : ["HarnessBuilder returned an invalid response."];
  throw new HarnessBuilderError(response.status, issues, body);
}

function createIdempotencyKey(input: BuildAgentInput): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        contractVersion: "1.0",
        agentSpec: input.spec,
        target: input.target,
        executionProfile: input.executionProfile,
      }),
    )
    .digest("hex");
}
