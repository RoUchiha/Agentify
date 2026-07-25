import { describe, expect, test, vi } from "vitest";

import { createPlaygroundRoute } from "@/app/api/playground/route";
import { demoAgentSpec } from "@/domain/demo";

describe("POST /api/playground", () => {
  test("rejects an invalid AgentSpec before invoking the runtime", async () => {
    const run = vi.fn();
    const post = createPlaygroundRoute({ run });
    const response = await post(
      new Request("http://localhost/api/playground", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spec: { metadata: {} }, input: { ticket: "hello" } }),
      }),
    );

    expect(response.status).toBe(400);
    expect(run).not.toHaveBeenCalled();
    expect(await response.json()).toMatchObject({ issues: expect.any(Array) });
  });

  test("returns a trace from the selected provider runtime", async () => {
    const run = vi.fn().mockResolvedValue({
      status: "completed",
      output: { category: "account-access" },
      trace: [
        { sequence: 1, type: "run_started", detail: "Run accepted." },
        { sequence: 2, type: "run_completed", detail: "Run completed." },
      ],
      latencyMs: 18,
      terminalReason: "completed",
    });
    const post = createPlaygroundRoute({ run });
    const response = await post(
      new Request("http://localhost/api/playground", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          spec: demoAgentSpec,
          input: { ticket: "I cannot reset my password." },
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      status: "completed",
      trace: [{ sequence: 1 }, { sequence: 2 }],
    });
    expect(run).toHaveBeenCalledWith({
      spec: demoAgentSpec,
      input: { ticket: "I cannot reset my password." },
    });
  });
});
