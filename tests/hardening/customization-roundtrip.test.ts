import { describe, expect, test } from "vitest";

import { AgentSpecSchema } from "@/domain/agent-spec";
import { CUSTOMIZATION_PROVIDERS, materializeCustomization } from "@/domain/customization";
import { demoAgentSpec } from "@/domain/demo";
import { applySpecPatches } from "@/domain/spec-path";

const TRACE_LEVELS = ["off", "errors", "actions", "full"] as const;
const FAILURE_MODES = ["stop", "continue", "fallback"] as const;
const NETWORK_MODES = ["none", "declared-only", "unrestricted"] as const;

describe("post-feature customization round trips", () => {
  test("preserves bounded variations across patch, JSON serialization, and reparsing", () => {
    for (let index = 0; index < 30; index += 1) {
      const base = materializeCustomization(demoAgentSpec);
      const provider = CUSTOMIZATION_PROVIDERS[index % CUSTOMIZATION_PROVIDERS.length]!;
      const profile = {
        id: "primary",
        provider,
        model: `model-${index}`,
        temperature: (index % 10) / 10,
        topP: 1 - (index % 5) / 10,
        maxOutputTokens: 1_000 + index,
        ...(index % 2 === 0 ? { seed: index } : {}),
        reasoningEffort: ["none", "low", "medium", "high"][index % 4]!,
        toolChoice: ["auto", "none", "required"][index % 3]!,
        parallelToolCalls: index % 2 === 0,
        structuredOutput: ["required", "preferred", "off"][index % 3]!,
        timeoutMs: 2_000 + index,
        fallbackProfileIds: [],
      };
      const patched = applySpecPatches(base, [
        { path: "customization.modelProfiles", value: [profile] },
        {
          path: "customization.agentModelProfiles",
          value: { "triage-agent": "primary" },
        },
        {
          path: "customization.observability.traceLevel",
          value: TRACE_LEVELS[index % TRACE_LEVELS.length],
        },
        {
          path: "customization.reliability.failureMode",
          value: FAILURE_MODES[index % FAILURE_MODES.length],
        },
        {
          path: "customization.runtime.network",
          value: NETWORK_MODES[index % NETWORK_MODES.length],
        },
      ]);

      expect(patched.success).toBe(true);
      if (!patched.success) continue;
      const reparsed = AgentSpecSchema.parse(JSON.parse(JSON.stringify(patched.data)) as unknown);

      expect(reparsed).toEqual(patched.data);
      expect(JSON.stringify(reparsed)).not.toMatch(/gsk_|sk-proj-/);
    }
  });
});
