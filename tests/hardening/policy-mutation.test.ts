import { describe, expect, test } from "vitest";

import { demoAgentSpec } from "@/domain/demo";
import { evaluateSpec } from "@/domain/policy";

describe("post-build policy mutation sensitivity", () => {
  test("detects when a mutation removes a required approval boundary", () => {
    const writeSpec = structuredClone(demoAgentSpec);
    writeSpec.tools[0] = {
      ...writeSpec.tools[0],
      mode: "write",
      risk: "high",
      approval: "required",
      idempotent: false,
    };
    writeSpec.decisions.confirmed.push(`Authorize high-risk tool: ${writeSpec.tools[0].id}`);
    const mutant = structuredClone(writeSpec);
    mutant.tools[0] = { ...mutant.tools[0], mode: "read", approval: "none" };

    expect(evaluateSpec(writeSpec).approvals).toEqual([
      { toolId: writeSpec.tools[0].id, timing: "runtime" },
    ]);
    expect(evaluateSpec(mutant).approvals).toEqual([]);
  });

  test("does not let an unrelated confirmation authorize restricted cloud data", () => {
    const spec = structuredClone(demoAgentSpec);
    spec.runtime.deploymentMode = "cloud";
    spec.knowledge = [
      {
        id: "customer-records",
        name: "Customer records",
        kind: "api",
        reference: "env:CUSTOMER_RECORDS_URL",
        classification: "restricted",
        retention: "run",
      },
    ];
    spec.decisions.confirmed.push("Authorize some other cloud operation.");

    expect(evaluateSpec(spec)).toMatchObject({
      status: "needs_attention",
      issues: [expect.objectContaining({ code: "restricted_cloud_confirmation_required" })],
    });
  });
});
