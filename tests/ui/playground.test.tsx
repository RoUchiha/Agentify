import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { Playground } from "@/components/playground";
import { demoAgentSpec } from "@/domain/demo";

describe("Playground", () => {
  test("runs a sample and exposes the provider trace", async () => {
    const runner = vi.fn().mockResolvedValue({
      status: "completed",
      output: { category: "account-access", evidence: ["Password reset request"] },
      trace: [
        { sequence: 1, type: "run_started", detail: "Run accepted." },
        { sequence: 2, type: "model_response", detail: "Provider returned output." },
        { sequence: 3, type: "run_completed", detail: "Run completed." },
      ],
      usage: { inputTokens: 22, outputTokens: 14 },
      latencyMs: 18,
      terminalReason: "completed",
    });
    render(<Playground runner={runner} spec={demoAgentSpec} />);

    fireEvent.change(screen.getByLabelText(/test input/i), {
      target: { value: '{ "ticket": "I cannot reset my password." }' },
    });
    await userEvent.click(screen.getByRole("button", { name: /run test/i }));

    expect(await screen.findByText(/account-access/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /run trace/i })).toHaveTextContent(
      /provider returned output/i,
    );
    expect(screen.getByText(/22 input/i)).toBeInTheDocument();
  });

  test("shows approval controls without claiming a write executed", async () => {
    render(
      <Playground
        runner={vi.fn().mockResolvedValue({
          status: "needs_approval",
          trace: [
            { sequence: 1, type: "run_started", detail: "Run accepted." },
            {
              sequence: 2,
              type: "approval_required",
              detail: "send-reply requires operator approval.",
            },
          ],
          latencyMs: 10,
          terminalReason: "approval_required",
          pendingApproval: { toolId: "send-reply", arguments: { message: "Hello" } },
        })}
        spec={demoAgentSpec}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: /run test/i }));

    expect(await screen.findByText(/send-reply requires approval/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /approve/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /reject/i })).toBeEnabled();
    expect(screen.getByText(/no write has executed/i)).toBeInTheDocument();
  });
});
