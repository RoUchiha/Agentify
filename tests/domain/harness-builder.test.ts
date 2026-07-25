import { describe, expect, test, vi } from "vitest";

import { buildAgent } from "@/connectors/harness-builder";
import { demoAgentSpec } from "@/domain/demo";

describe("HarnessBuilder connector", () => {
  test("submits the immutable spec with a stable idempotency key", async () => {
    const responseBody = {
      buildId: "build-42",
      status: "packaged",
      events: [
        { status: "accepted", evidence: "Accepted." },
        { status: "packaged", evidence: "Packaged." },
      ],
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
          artifactTarget: "openai-agents-ts",
          executionProfile: "hybrid",
        },
        checksums: { "README.md": "abc" },
      },
      report: {
        status: "passed",
        gates: [],
        generatedAt: "2026-07-24T12:00:00.000Z",
        delivery: {
          status: "github-connection-required",
          message: "Connect GitHub separately.",
        },
      },
    };
    const fetcher = vi.fn().mockImplementation(async () => Response.json(responseBody));

    const first = await buildAgent(
      { spec: demoAgentSpec, target: "openai-agents-ts", executionProfile: "hybrid" },
      { baseUrl: "http://harness.local", fetcher },
    );
    await buildAgent(
      { spec: demoAgentSpec, target: "openai-agents-ts", executionProfile: "hybrid" },
      { baseUrl: "http://harness.local", fetcher },
    );

    expect(first.status).toBe("packaged");
    expect(fetcher).toHaveBeenNthCalledWith(
      1,
      "http://harness.local/api/v1/agent-builds",
      expect.objectContaining({
        headers: expect.objectContaining({
          "idempotency-key": expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      }),
    );
    const firstBody = JSON.parse(String(fetcher.mock.calls[0][1]?.body)) as {
      idempotencyKey: string;
      agentSpec: unknown;
    };
    const secondBody = JSON.parse(String(fetcher.mock.calls[1][1]?.body)) as {
      idempotencyKey: string;
    };
    expect(firstBody.agentSpec).toEqual(demoAgentSpec);
    expect(firstBody.idempotencyKey).toBe(secondBody.idempotencyKey);
  });

  test("keeps a configured service credential on the server-side hop", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json(
          { status: "contract_incompatible", issues: ["Unsupported version."] },
          { status: 409 },
        ),
      );

    await expect(
      buildAgent(
        { spec: demoAgentSpec, target: "portable-spec", executionProfile: "local" },
        { baseUrl: "http://harness.local/", serviceToken: "server-only", fetcher },
      ),
    ).rejects.toMatchObject({ status: 409, issues: ["Unsupported version."] });
    expect(fetcher).toHaveBeenCalledWith(
      "http://harness.local/api/v1/agent-builds",
      expect.objectContaining({
        headers: expect.objectContaining({ authorization: "Bearer server-only" }),
      }),
    );
  });
});
