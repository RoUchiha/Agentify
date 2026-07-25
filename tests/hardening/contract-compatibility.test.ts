import { describe, expect, test, vi } from "vitest";

import { buildAgent } from "@/connectors/harness-builder";
import {
  ARTIFACT_TARGETS,
  DEPLOYMENT_MODES,
  type ArtifactTarget,
  type DeploymentMode,
} from "@/domain/agent-spec";
import { demoAgentSpec } from "@/domain/demo";

describe("post-build Agentify to HarnessBuilder contract", () => {
  test.each(
    ARTIFACT_TARGETS.flatMap((target) =>
      DEPLOYMENT_MODES.map((executionProfile) => [target, executionProfile] as const),
    ),
  )("serializes AgentSpec v1 for %s in %s mode", async (target, executionProfile) => {
    let requestBody: Record<string, unknown> | undefined;
    const fetcher = vi.fn().mockImplementation(async (_url, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json(successResponse(target, executionProfile));
    });

    await buildAgent(
      { spec: demoAgentSpec, target, executionProfile },
      { baseUrl: "http://harness.local", fetcher },
    );

    expect(requestBody).toMatchObject({
      contractVersion: "1.0",
      agentSpec: demoAgentSpec,
      target,
      executionProfile,
      idempotencyKey: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });
});

function successResponse(target: ArtifactTarget, executionProfile: DeploymentMode) {
  return {
    buildId: "build-contract",
    status: "packaged",
    events: [{ status: "packaged", evidence: "Contract accepted." }],
    artifact: {
      files: [{ path: "README.md", content: "# Agent" }],
      manifest: {
        formatVersion: 1,
        specName: "Support triage",
        runtime: "node-typescript",
        modules: [],
        gates: [],
        files: ["README.md"],
        immutableSpec: { path: "harness.spec.yaml", checksum: "abc" },
        agentSpecVersion: "1.0",
        artifactTarget: target,
        executionProfile,
      },
      checksums: { "README.md": "abc" },
    },
    report: {
      status: "passed",
      gates: [],
      generatedAt: "2026-07-24T12:00:00.000Z",
      delivery: { status: "github-connection-required", message: "Not configured." },
    },
  };
}
