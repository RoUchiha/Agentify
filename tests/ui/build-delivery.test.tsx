import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ArtifactDelivery } from "@/components/artifact-delivery";
import type { BuildResult } from "@/connectors/harness-builder";

const packagedBuild = {
  buildId: "build-42",
  status: "packaged",
  events: [
    { status: "accepted", evidence: "Build accepted." },
    { status: "testing", evidence: "Tests checked." },
    { status: "packaged", evidence: "Package ready." },
  ],
  artifact: {
    files: [{ path: "README.md", content: "# Agent" }],
    manifest: {
      formatVersion: 1,
      specName: "Support triage",
      runtime: "node-typescript",
      modules: [],
      gates: ["secret-scan"],
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
    gates: [
      {
        id: "secret-scan",
        status: "passed",
        blocking: true,
        evidence: ["No credential-shaped values found."],
      },
    ],
    generatedAt: "2026-07-24T12:00:00.000Z",
    delivery: {
      status: "github-connection-required",
      message: "Connect GitHub separately.",
    },
  },
} satisfies BuildResult;

describe("ArtifactDelivery", () => {
  test("shows ordered build evidence and enables a passed package", () => {
    render(<ArtifactDelivery onBuild={vi.fn()} result={packagedBuild} />);

    expect(screen.getByRole("region", { name: /build timeline/i })).toHaveTextContent(
      /accepted.*testing.*packaged/i,
    );
    expect(screen.getByRole("region", { name: /verification report/i })).toHaveTextContent(
      /secret-scan.*passed/i,
    );
    expect(screen.getByRole("button", { name: /download verified zip/i })).toBeEnabled();
  });

  test("never enables verified download for a failed report", () => {
    render(
      <ArtifactDelivery
        onBuild={vi.fn()}
        result={{
          ...packagedBuild,
          status: "failed",
          report: { ...packagedBuild.report, status: "failed" },
        }}
      />,
    );

    expect(screen.getByRole("button", { name: /download verified zip/i })).toBeDisabled();
  });

  test("starts the HarnessBuilder pipeline from an empty delivery state", async () => {
    const onBuild = vi.fn();
    render(<ArtifactDelivery onBuild={onBuild} />);

    await userEvent.click(screen.getByRole("button", { name: /build verified agent/i }));

    expect(onBuild).toHaveBeenCalledOnce();
  });
});
