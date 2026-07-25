import { describe, expect, test, vi } from "vitest";

import { demoAgentSpec } from "@/domain/demo";
import type { PlannerProvider } from "@/providers/types";
import { executePlayground } from "@/server/playground";

describe("executePlayground", () => {
  test("runs a provider-backed agent and records an ordered trace", async () => {
    const provider: PlannerProvider = {
      id: "groq",
      plan: vi.fn(),
      run: vi.fn().mockResolvedValue({
        output: { category: "account-access", evidence: ["Password reset request"] },
        usage: { inputTokens: 22, outputTokens: 14 },
      }),
    };

    const result = await executePlayground(
      { spec: demoAgentSpec, input: { ticket: "I cannot reset my password." } },
      provider,
    );

    expect(result).toMatchObject({
      status: "completed",
      output: { category: "account-access" },
      usage: { inputTokens: 22, outputTokens: 14 },
      terminalReason: "completed",
    });
    expect(result.trace.map((event) => event.type)).toEqual([
      "run_started",
      "model_response",
      "run_completed",
    ]);
    expect(result.trace.map((event) => event.sequence)).toEqual([1, 2, 3]);
  });

  test("pauses before a declared write tool can execute", async () => {
    const spec = structuredClone(demoAgentSpec);
    spec.tools = [
      {
        id: "send-reply",
        name: "Send reply",
        description: "Send a reply to the customer.",
        mode: "write",
        risk: "high",
        approval: "required",
        inputSchema: { type: "object" },
        outputSchema: { type: "object" },
        timeoutMs: 10_000,
        idempotent: false,
      },
    ];
    spec.agents[0].toolIds = ["send-reply"];
    const provider: PlannerProvider = {
      id: "groq",
      plan: vi.fn(),
      run: vi.fn().mockResolvedValue({
        output: null,
        toolRequest: { toolId: "send-reply", arguments: { message: "Reset instructions" } },
      }),
    };

    const result = await executePlayground(
      { spec, input: { ticket: "I cannot reset my password." } },
      provider,
    );

    expect(result).toMatchObject({
      status: "needs_approval",
      terminalReason: "approval_required",
      pendingApproval: {
        toolId: "send-reply",
        arguments: { message: "Reset instructions" },
      },
    });
    expect(result.trace.map((event) => event.type)).toEqual([
      "run_started",
      "model_response",
      "approval_required",
    ]);
  });

  test("fails closed when a provider requests an undeclared tool", async () => {
    const provider: PlannerProvider = {
      id: "ollama",
      plan: vi.fn(),
      run: vi.fn().mockResolvedValue({
        output: null,
        toolRequest: { toolId: "hidden-shell", arguments: { command: "whoami" } },
      }),
    };

    const result = await executePlayground(
      { spec: demoAgentSpec, input: { ticket: "hello" } },
      provider,
    );

    expect(result).toMatchObject({
      status: "failed",
      terminalReason: "undeclared_tool",
    });
    expect(result.trace.at(-1)).toMatchObject({
      type: "run_failed",
      detail: expect.stringMatching(/undeclared/i),
    });
  });
});
