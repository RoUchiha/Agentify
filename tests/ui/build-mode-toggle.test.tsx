import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { BuildModeToggle } from "@/components/build-mode-toggle";

describe("BuildModeToggle", () => {
  test("switches between Quick Build and Advanced Build with a labelled control", async () => {
    const onChange = vi.fn();
    render(<BuildModeToggle mode="quick" onChange={onChange} />);

    expect(screen.getByRole("group", { name: "Build mode" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Quick Build" })).toBeChecked();

    await userEvent.click(screen.getByRole("radio", { name: "Advanced Build" }));

    expect(onChange).toHaveBeenCalledWith("advanced");
  });
});
