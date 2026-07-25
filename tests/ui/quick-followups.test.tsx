import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { QuickFollowups } from "@/components/quick-followups";
import { materializeCustomization } from "@/domain/customization";
import { demoAgentSpec } from "@/domain/demo";
import { analyzeRequirements } from "@/domain/requirements-coverage";

describe("QuickFollowups", () => {
  test("shows the exact missing field and easiest recommendation", () => {
    const spec = materializeCustomization({
      ...demoAgentSpec,
      decisions: {
        ...demoAgentSpec.decisions,
        unresolved: ["Which CRM should receive ticket updates?"],
      },
    });

    render(
      <QuickFollowups
        coverage={analyzeRequirements(spec)}
        onChange={vi.fn()}
        spec={spec}
      />,
    );

    expect(screen.getByText("decisions.unresolved.0")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Which CRM should receive ticket updates?" }),
    ).toBeVisible();
    expect(screen.getByText("Recommended · easiest")).toBeVisible();
    expect(
      screen.getByRole("button", { name: /start read-only without a crm write/i }),
    ).toBeVisible();
  });

  test("applies a reviewed option and emits the updated valid spec", async () => {
    const onChange = vi.fn();
    const spec = materializeCustomization({
      ...demoAgentSpec,
      decisions: {
        ...demoAgentSpec.decisions,
        unresolved: ["Which CRM should receive ticket updates?"],
      },
    });

    render(
      <QuickFollowups
        coverage={analyzeRequirements(spec)}
        onChange={onChange}
        spec={spec}
      />,
    );
    await userEvent.click(
      screen.getByRole("button", { name: /start read-only without a crm write/i }),
    );

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        decisions: expect.objectContaining({ unresolved: [] }),
      }),
    );
  });

  test("does not include sensitive decisions in all-safe-defaults", async () => {
    const onChange = vi.fn();
    const spec = materializeCustomization({
      ...demoAgentSpec,
      models: {
        ...demoAgentSpec.models,
        mode: "fixed",
        preferredProvider: "groq",
      },
      decisions: {
        ...demoAgentSpec.decisions,
        unresolved: [
          "Where should this agent run?",
          "Authorize sending external messages?",
        ],
      },
    });

    render(
      <QuickFollowups
        coverage={analyzeRequirements(spec)}
        onChange={onChange}
        spec={spec}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Use all safe defaults" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        decisions: expect.objectContaining({
          unresolved: ["Authorize sending external messages?"],
        }),
        models: expect.objectContaining({ preferredProvider: "free-auto" }),
      }),
    );
  });

  test("states that a fully covered design is ready", () => {
    render(
      <QuickFollowups
        coverage={analyzeRequirements(demoAgentSpec)}
        onChange={vi.fn()}
        spec={demoAgentSpec}
      />,
    );

    expect(screen.getByText(/all required decisions are covered/i)).toBeVisible();
  });
});
