import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { AdvisorRail } from "@/components/advisor-rail";
import type { AdvisoryFinding } from "@/domain/advisor";
import { materializeCustomization } from "@/domain/customization";
import { demoAgentSpec } from "@/domain/demo";

const spec = materializeCustomization(demoAgentSpec);
const finding: AdvisoryFinding = {
  id: "bounded-budget:budgets.maxTokens:fixture",
  ruleId: "bounded-budget",
  paths: ["budgets.maxTokens"],
  severity: "recommended",
  category: "cost",
  title: "Use a smaller starting budget",
  explanation: "Start with a bounded token ceiling and raise it after evaluation.",
  evidence: ["Maximum tokens: 8000."],
  patches: [{ path: "budgets.maxTokens", value: 4_000 }],
  impacts: ["Lower runaway cost"],
};

describe("AdvisorRail", () => {
  test("previews and explicitly applies an advisor patch", async () => {
    const onChange = vi.fn();
    render(
      <AdvisorRail findings={[finding]} onChange={onChange} onDismiss={vi.fn()} spec={spec} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Review change" }));

    expect(screen.getByText("budgets.maxTokens")).toBeVisible();
    expect(screen.getByText("8000 → 4000")).toBeVisible();
    expect(onChange).not.toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Apply suggestion" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        budgets: expect.objectContaining({ maxTokens: 4_000 }),
      }),
    );
  });

  test("dismisses unchanged advice without mutating the spec", async () => {
    const onChange = vi.fn();
    const onDismiss = vi.fn();
    render(
      <AdvisorRail findings={[finding]} onChange={onChange} onDismiss={onDismiss} spec={spec} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));

    expect(onDismiss).toHaveBeenCalledWith(finding.id);
    expect(onChange).not.toHaveBeenCalled();
  });

  test("routes findings without safe patches to their editable fields", async () => {
    const onEditPaths = vi.fn();
    const manualFinding: AdvisoryFinding = {
      ...finding,
      id: "manual-output-schema",
      title: "Strengthen the output schema",
      paths: ["objective.outputSchema"],
      patches: [],
    };
    render(
      <AdvisorRail
        findings={[manualFinding]}
        onChange={vi.fn()}
        onDismiss={vi.fn()}
        onEditPaths={onEditPaths}
        spec={spec}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Edit fields" }));

    expect(onEditPaths).toHaveBeenCalledWith(["objective.outputSchema"]);
  });

  test("groups findings by severity and exposes evidence and impact", () => {
    const blocking: AdvisoryFinding = {
      ...finding,
      id: "blocking-finding",
      severity: "blocking",
      category: "safety",
      title: "Block unsafe tracing",
    };
    render(
      <AdvisorRail
        findings={[finding, blocking]}
        onChange={vi.fn()}
        onDismiss={vi.fn()}
        spec={spec}
      />,
    );

    const blockingGroup = screen.getByRole("group", { name: "Blocking advice" });
    const recommendedGroup = screen.getByRole("group", {
      name: "Recommended advice",
    });
    expect(within(blockingGroup).getByText("Block unsafe tracing")).toBeVisible();
    expect(within(recommendedGroup).getByText("Use a smaller starting budget")).toBeVisible();
    expect(screen.getAllByText("Maximum tokens: 8000.")).toHaveLength(2);
    expect(screen.getAllByText("Lower runaway cost")).toHaveLength(2);
  });

  test("reports a stale or invalid suggestion without replacing the accepted spec", async () => {
    const onChange = vi.fn();
    const invalidFinding: AdvisoryFinding = {
      ...finding,
      id: "invalid-finding",
      patches: [{ path: "missing.path", value: true }],
    };
    render(
      <AdvisorRail
        findings={[invalidFinding]}
        onChange={onChange}
        onDismiss={vi.fn()}
        spec={spec}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Review change" }));
    await userEvent.click(screen.getByRole("button", { name: "Apply suggestion" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/no longer applies/i);
    expect(onChange).not.toHaveBeenCalled();
  });
});
