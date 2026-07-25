import { describe, expect, test, vi } from "vitest";

import { createBuildRoute } from "@/server/routes/build";
import { demoAgentSpec } from "@/domain/demo";

describe("POST /api/build", () => {
  test("rejects invalid specifications before calling HarnessBuilder", async () => {
    const build = vi.fn();
    const post = createBuildRoute({ build });
    const response = await post(
      new Request("http://localhost/api/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spec: { metadata: {} },
          target: "openai-agents-ts",
          executionProfile: "hybrid",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(build).not.toHaveBeenCalled();
  });

  test("returns the verified HarnessBuilder package", async () => {
    const build = vi.fn().mockResolvedValue({
      buildId: "build-42",
      status: "packaged",
      events: [],
      artifact: { files: [], manifest: { files: [] }, checksums: {} },
      report: { status: "passed", gates: [] },
    });
    const post = createBuildRoute({ build });
    const response = await post(
      new Request("http://localhost/api/build", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spec: demoAgentSpec,
          target: "openai-agents-ts",
          executionProfile: "hybrid",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "packaged", buildId: "build-42" });
    expect(build).toHaveBeenCalledWith({
      spec: demoAgentSpec,
      target: "openai-agents-ts",
      executionProfile: "hybrid",
    });
  });
});
