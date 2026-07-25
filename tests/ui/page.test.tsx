import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import Home from "@/app/page";

describe("Home", () => {
  test("renders the prompt-first product entrypoint", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { name: /describe the agent you need/i }),
    ).toBeInTheDocument();
  });
});
