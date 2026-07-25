import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { VisualCanvas } from "@/components/visual-canvas";
import { demoAgentSpec } from "@/domain/demo";
import { toVisualGraph } from "@/domain/graph";

describe("VisualCanvas", () => {
  test("renders typed nodes and connections from the canonical spec", () => {
    render(<VisualCanvas graph={toVisualGraph(demoAgentSpec)} />);

    expect(screen.getByRole("listitem", { name: /agent: triage agent/i })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { name: /termination: stop/i })).toBeInTheDocument();
    expect(screen.getByText("triage → done")).toBeInTheDocument();
  });
});
