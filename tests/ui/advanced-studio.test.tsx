import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { AdvancedStudio } from "@/components/advanced-studio";
import { EDITABLE_ROOT_PATHS } from "@/components/studio-sections";
import { materializeCustomization } from "@/domain/customization";
import { demoAgentSpec } from "@/domain/demo";

const REQUIRED_SECTIONS = [
  "Overview",
  "Objective and schemas",
  "Agents and instructions",
  "Models and providers",
  "Tools and permissions",
  "Knowledge",
  "Memory and state",
  "Workflow",
  "Guardrails and approvals",
  "Hooks and lifecycle",
  "Budgets and reliability",
  "Runtime and sandbox",
  "Evaluations",
  "Observability",
  "Delivery and targets",
  "Provider/framework overrides",
  "Raw AgentSpec",
];

describe("AdvancedStudio", () => {
  test.each(REQUIRED_SECTIONS)("exposes the %s section", (name) => {
    render(<AdvancedStudio onChange={vi.fn()} spec={materializeCustomization(demoAgentSpec)} />);

    expect(screen.getByRole("button", { name })).toBeVisible();
  });

  test("assigns every editable contract root to one section", () => {
    expect(EDITABLE_ROOT_PATHS).toEqual([
      "metadata",
      "objective",
      "agents",
      "models",
      "tools",
      "knowledge",
      "state",
      "workflow",
      "budgets",
      "runtime",
      "evaluations",
      "decisions",
      "customization.modelProfiles",
      "customization.agentModelProfiles",
      "customization.toolPolicies",
      "customization.knowledgePolicies",
      "customization.statePolicies",
      "customization.workflow",
      "customization.guardrails",
      "customization.hooks",
      "customization.reliability",
      "customization.runtime",
      "customization.observability",
      "customization.delivery",
      "customization.providerOverrides",
      "customization.frameworkOverrides",
    ]);
  });

  test("edits scalar and enum values only after applying the section", async () => {
    const onChange = vi.fn();
    render(<AdvancedStudio onChange={onChange} spec={materializeCustomization(demoAgentSpec)} />);

    await userEvent.click(screen.getByRole("button", { name: "Budgets and reliability" }));
    const maxTokens = screen.getByLabelText("Maximum tokens");
    await userEvent.clear(maxTokens);
    await userEvent.type(maxTokens, "4000");
    expect(onChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Apply section" }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ budgets: expect.objectContaining({ maxTokens: 4_000 }) }),
    );

    await userEvent.click(screen.getByRole("button", { name: "Observability" }));
    await userEvent.selectOptions(screen.getByLabelText("Trace level"), "errors");
    await userEvent.click(screen.getByRole("button", { name: "Apply section" }));
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        customization: expect.objectContaining({
          observability: expect.objectContaining({ traceLevel: "errors" }),
        }),
      }),
    );
  });

  test("duplicates, reorders, and deletes array entries in a section draft", async () => {
    const onChange = vi.fn();
    render(<AdvancedStudio onChange={onChange} spec={materializeCustomization(demoAgentSpec)} />);
    await userEvent.click(screen.getByRole("button", { name: "Tools and permissions" }));

    const tool = screen.getByRole("group", { name: "Tools item 1" });
    await userEvent.click(within(tool).getByRole("button", { name: "Duplicate item" }));
    expect(screen.getByRole("group", { name: "Tools item 2" })).toBeVisible();
    const second = screen.getByRole("group", { name: "Tools item 2" });
    await userEvent.clear(within(second).getByLabelText("Tool identifier"));
    await userEvent.type(within(second).getByLabelText("Tool identifier"), "search-archive");
    await userEvent.clear(within(second).getByLabelText("Tool name"));
    await userEvent.type(within(second).getByLabelText("Tool name"), "Search archive");
    await userEvent.click(within(second).getByRole("button", { name: "Move item up" }));
    await userEvent.click(screen.getByRole("button", { name: "Apply section" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: expect.arrayContaining([
          expect.objectContaining({ id: "search-archive", name: "Search archive" }),
        ]),
      }),
    );
  });

  test("shows path-specific validation and preserves the last accepted spec", async () => {
    const onChange = vi.fn();
    render(<AdvancedStudio onChange={onChange} spec={materializeCustomization(demoAgentSpec)} />);
    await userEvent.click(screen.getByRole("button", { name: "Budgets and reliability" }));
    await userEvent.clear(screen.getByLabelText("Maximum tokens"));
    await userEvent.type(screen.getByLabelText("Maximum tokens"), "-1");
    await userEvent.click(screen.getByRole("button", { name: "Apply section" }));

    expect(screen.getByRole("alert")).toHaveTextContent(/budgets\.maxTokens/i);
    expect(onChange).not.toHaveBeenCalled();
  });

  test("can add optional contract fields that are absent from the accepted spec", async () => {
    render(<AdvancedStudio onChange={vi.fn()} spec={materializeCustomization(demoAgentSpec)} />);
    await userEvent.click(screen.getByRole("button", { name: "Models and providers" }));
    await userEvent.click(screen.getByRole("button", { name: "+ Add model profile" }));
    const profile = screen.getByRole("group", { name: /model profiles item 1/i });

    await userEvent.click(within(profile).getByRole("button", { name: "+ Add Seed" }));

    expect(within(profile).getByLabelText("Seed")).toHaveValue(0);
  });

  test("keeps the raw AgentSpec editor available", async () => {
    render(<AdvancedStudio onChange={vi.fn()} spec={materializeCustomization(demoAgentSpec)} />);
    await userEvent.click(screen.getByRole("button", { name: "Raw AgentSpec" }));

    expect(screen.getByRole("textbox", { name: "Agent spec" })).toBeVisible();
  });
});
