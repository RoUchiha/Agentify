import { describe, expect, test } from "vitest";

import { demoAgentSpec } from "@/domain/demo";
import { evaluateSpec } from "@/domain/policy";

describe("evaluateSpec", () => {
  test("continues automatically for a complete low-risk agent", () => {
    expect(evaluateSpec(demoAgentSpec)).toEqual({
      status: "ready",
      approvals: [],
      issues: [],
    });
  });

  test("requires attention for an unconfirmed high-risk write tool", () => {
    const spec = {
      ...demoAgentSpec,
      agents: [{ ...demoAgentSpec.agents[0], toolIds: ["delete-record"] }],
      tools: [
        {
          ...demoAgentSpec.tools[0],
          id: "delete-record",
          name: "Delete record",
          mode: "write" as const,
          risk: "critical" as const,
          approval: "required" as const,
          idempotent: false,
        },
      ],
    };

    expect(evaluateSpec(spec)).toMatchObject({
      status: "needs_attention",
      issues: [
        expect.objectContaining({
          code: "destructive_authorization_required",
          toolId: "delete-record",
        }),
      ],
    });
  });

  test("retains runtime approval after a high-risk tool is explicitly confirmed", () => {
    const spec = {
      ...demoAgentSpec,
      agents: [{ ...demoAgentSpec.agents[0], toolIds: ["send-email"] }],
      tools: [
        {
          ...demoAgentSpec.tools[0],
          id: "send-email",
          name: "Send email",
          mode: "write" as const,
          risk: "high" as const,
          approval: "required" as const,
        },
      ],
      decisions: {
        ...demoAgentSpec.decisions,
        confirmed: ["Authorize high-risk tool: send-email"],
      },
    };

    expect(evaluateSpec(spec)).toMatchObject({
      status: "ready",
      approvals: [{ toolId: "send-email", timing: "runtime" }],
    });
  });

  test("requires attention while model assumptions remain unresolved", () => {
    const spec = {
      ...demoAgentSpec,
      decisions: { ...demoAgentSpec.decisions, unresolved: ["Which CRM can the agent update?"] },
    };

    expect(evaluateSpec(spec)).toMatchObject({
      status: "needs_attention",
      issues: [expect.objectContaining({ code: "unresolved_decision" })],
    });
  });
});
