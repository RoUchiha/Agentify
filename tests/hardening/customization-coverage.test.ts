import { describe, expect, test } from "vitest";

import {
  EDITABLE_ROOT_PATHS,
  getOptionalFieldTemplates,
  STUDIO_SECTIONS,
} from "@/components/studio-sections";
import { materializeCustomization } from "@/domain/customization";
import { demoAgentSpec } from "@/domain/demo";

describe("post-feature Advanced Studio contract coverage", () => {
  test("assigns every materialized AgentSpec leaf to a typed studio root", () => {
    const spec = materializeCustomization(demoAgentSpec);
    const uncovered = leafPaths(spec).filter(
      (path) => !EDITABLE_ROOT_PATHS.some((root) => path === root || path.startsWith(`${root}.`)),
    );

    expect(uncovered).toEqual([]);
    expect(STUDIO_SECTIONS.find((section) => section.raw)).toMatchObject({
      id: "raw",
      label: "Raw AgentSpec",
    });
  });

  test("keeps all optional schema fields addable and removable by structured controls", () => {
    expect(optionalPaths()).toEqual([
      "customization.delivery.packageName",
      "customization.modelProfiles.[].seed",
      "customization.toolPolicies.[].credentialRef",
      "customization.workflow.nodePolicies.[].failureTarget",
      "workflow.edges.[].condition",
      "workflow.nodes.[].ref",
    ]);
  });
});

function leafPaths(value: unknown, path = ""): string[] {
  if (Array.isArray(value)) {
    if (value.length === 0) return [path];
    return value.flatMap((child) => leafPaths(child, `${path}.[]`));
  }
  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value);
    if (entries.length === 0) return [path];
    return entries.flatMap(([key, child]) => leafPaths(child, path ? `${path}.${key}` : key));
  }
  return [path];
}

function optionalPaths(): string[] {
  const objectPaths = [
    "workflow.nodes.[]",
    "workflow.edges.[]",
    "customization.modelProfiles.[]",
    "customization.toolPolicies.[]",
    "customization.workflow.nodePolicies.[]",
    "customization.delivery",
  ];
  return objectPaths
    .flatMap((path) => getOptionalFieldTemplates(path).map((field) => `${path}.${field.key}`))
    .sort();
}
