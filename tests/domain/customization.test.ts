import { describe, expect, test } from "vitest";

import { AgentSpecSchema } from "@/domain/agent-spec";
import {
  CUSTOMIZATION_DEFAULTS,
  materializeCustomization,
} from "@/domain/customization";
import { demoAgentSpec } from "@/domain/demo";

describe("AgentSpec customization", () => {
  test("materializes a complete v1.1 customization contract from v1.0", () => {
    const result = materializeCustomization(demoAgentSpec);

    expect(result).not.toBe(demoAgentSpec);
    expect(result.metadata.version).toBe("1.1");
    expect(result.customization).toEqual(CUSTOMIZATION_DEFAULTS);
    expect(AgentSpecSchema.parse(result)).toEqual(result);
  });

  test("does not mutate nested defaults across materialized specs", () => {
    const first = materializeCustomization(demoAgentSpec);
    const second = materializeCustomization(demoAgentSpec);

    first.customization?.guardrails.push({
      id: "bounded-output",
      stage: "output",
      rule: "Reject output that does not match the declared schema.",
      action: "block",
      severity: "high",
    });

    expect(second.customization?.guardrails).toEqual([]);
    expect(CUSTOMIZATION_DEFAULTS.guardrails).toEqual([]);
  });

  test("rejects raw credentials inside customization", () => {
    const spec = materializeCustomization(demoAgentSpec);
    const unsafe = {
      ...spec,
      customization: {
        ...spec.customization,
        toolPolicies: [
          {
            toolId: "search-kb",
            connection: "http",
            credentialRef: "gsk_secret_value",
            approvalTiming: "runtime",
            retries: 1,
            concurrency: 1,
            cache: "none",
          },
        ],
      },
    };

    expect(AgentSpecSchema.safeParse(unsafe).success).toBe(false);
  });

  test("rejects undeclared customization references", () => {
    const spec = materializeCustomization(demoAgentSpec);
    const invalid = {
      ...spec,
      customization: {
        ...spec.customization,
        agentModelProfiles: { "triage-agent": "missing-profile" },
      },
    };

    expect(AgentSpecSchema.safeParse(invalid).success).toBe(false);
  });
});
