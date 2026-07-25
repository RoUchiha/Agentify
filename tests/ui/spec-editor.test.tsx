import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { SpecEditor } from "@/components/spec-editor";
import { demoAgentSpec } from "@/domain/demo";

describe("SpecEditor", () => {
  test("preserves the accepted spec when edited JSON is malformed", async () => {
    const onChange = vi.fn();
    render(<SpecEditor onChange={onChange} spec={demoAgentSpec} />);

    const editor = screen.getByRole("textbox", { name: /agent spec/i });
    fireEvent.change(editor, { target: { value: "{" } });
    await userEvent.click(screen.getByRole("button", { name: /apply spec/i }));

    expect(screen.getByRole("alert")).toHaveTextContent(/valid json/i);
    expect(onChange).not.toHaveBeenCalled();
  });

  test("emits a contract-valid edited spec", async () => {
    const onChange = vi.fn();
    render(<SpecEditor onChange={onChange} spec={demoAgentSpec} />);

    const edited = {
      ...demoAgentSpec,
      metadata: { ...demoAgentSpec.metadata, name: "Priority support triage" },
    };
    const editor = screen.getByRole("textbox", { name: /agent spec/i });
    fireEvent.change(editor, { target: { value: JSON.stringify(edited) } });
    await userEvent.click(screen.getByRole("button", { name: /apply spec/i }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({ name: "Priority support triage" }),
      }),
    );
  });

  test("synchronizes the raw editor when another Advanced control accepts a spec", () => {
    const { rerender } = render(
      <SpecEditor onChange={vi.fn()} spec={demoAgentSpec} />,
    );
    const edited = {
      ...demoAgentSpec,
      metadata: { ...demoAgentSpec.metadata, name: "Synchronized agent" },
    };

    rerender(<SpecEditor onChange={vi.fn()} spec={edited} />);

    expect(screen.getByRole("textbox", { name: /agent spec/i })).toHaveValue(
      JSON.stringify(edited, null, 2),
    );
  });
});
