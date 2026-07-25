import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { Workspace } from "@/components/workspace";
import { demoAgentSpec } from "@/domain/demo";

describe("post-build automatic pipeline acceptance", () => {
  test("one natural-language brief continues through test and verified build when safe", async () => {
    const playgroundRunner = vi.fn().mockResolvedValue({
      status: "completed",
      output: { category: "account-access" },
      trace: [
        {
          sequence: 1,
          type: "run_completed",
          detail: "Completed.",
          timestamp: "2026-07-24T12:00:00.000Z",
        },
      ],
      latencyMs: 10,
      terminalReason: "completed",
    });
    const buildRunner = vi.fn().mockResolvedValue({
      buildId: "automatic-build",
      status: "packaged",
      events: [{ status: "packaged", evidence: "Verified package ready." }],
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
        delivery: { status: "github-connection-required", message: "Not configured." },
      },
    });
    render(
      <Workspace
        autoContinue
        buildRunner={buildRunner}
        planner={vi.fn().mockResolvedValue({
          status: "ready",
          spec: demoAgentSpec,
          provider: { id: "groq", dataBoundary: "cloud", reason: "Groq selected." },
        })}
        playgroundRunner={playgroundRunner}
      />,
    );

    await userEvent.type(
      screen.getByLabelText(/what should your agent accomplish/i),
      "Build an agent that triages support tickets.",
    );
    await userEvent.click(screen.getByRole("button", { name: /design my agent/i }));

    expect(await screen.findByText("automatic-build")).toBeInTheDocument();
    expect(playgroundRunner).toHaveBeenCalledWith({
      spec: demoAgentSpec,
      input: demoAgentSpec.evaluations[0].input,
    });
    expect(buildRunner).toHaveBeenCalledWith({
      spec: demoAgentSpec,
      target: "openai-agents-ts",
      executionProfile: "hybrid",
    });
    expect(screen.getByRole("status")).toHaveTextContent(/package ready/i);
    expect(screen.getByRole("region", { name: /run trace/i })).toHaveTextContent(/completed/i);
  });
});
