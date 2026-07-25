import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { Workspace } from "@/components/workspace";
import { demoAgentSpec } from "@/domain/demo";

describe("Workspace", () => {
  test("creates a design from one natural-language request", async () => {
    const planner = vi.fn().mockResolvedValue({
      status: "ready",
      spec: demoAgentSpec,
      provider: {
        id: "groq",
        dataBoundary: "cloud",
        reason: "Ollama is unavailable; configured Groq Free Cloud will plan this agent.",
      },
    });
    render(<Workspace planner={planner} />);

    await userEvent.type(
      screen.getByLabelText(/what should your agent accomplish/i),
      "Build an agent that triages support tickets.",
    );
    await userEvent.click(screen.getByRole("button", { name: /design my agent/i }));

    expect(await screen.findByRole("heading", { name: "Support triage" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/ready to test/i);
    expect(screen.getByRole("heading", { name: /groq free cloud/i })).toBeInTheDocument();
    expect(planner).toHaveBeenCalledWith({
      prompt: "Build an agent that triages support tickets.",
      deploymentMode: "hybrid",
    });
  });

  test("Advanced reveals the canvas and raw spec for the same design", async () => {
    render(
      <Workspace
        planner={vi.fn().mockResolvedValue({
          status: "ready",
          spec: demoAgentSpec,
          provider: { id: "ollama", dataBoundary: "local", reason: "Local model available." },
        })}
      />,
    );
    await userEvent.type(
      screen.getByLabelText(/what should your agent accomplish/i),
      "Build an agent that triages support tickets.",
    );
    await userEvent.click(screen.getByRole("button", { name: /design my agent/i }));
    await userEvent.click(screen.getByRole("switch", { name: /advanced/i }));

    expect(screen.getByRole("region", { name: /agent canvas/i })).toBeInTheDocument();
    expect(
      (screen.getByRole("textbox", { name: /agent spec/i }) as HTMLTextAreaElement).value,
    ).toContain('"version": "1.0"');
  });

  test("shows a specific connection state instead of inventing a design", async () => {
    render(
      <Workspace
        planner={vi.fn().mockResolvedValue({
          status: "connection_required",
          providers: ["ollama", "groq"],
          reason: "Connect a local Ollama model or configure Groq Free Cloud.",
        })}
      />,
    );
    await userEvent.type(
      screen.getByLabelText(/what should your agent accomplish/i),
      "Build an agent that triages support tickets.",
    );
    await userEvent.click(screen.getByRole("button", { name: /design my agent/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/connect a local ollama/i);
    expect(screen.queryByRole("heading", { name: "Support triage" })).not.toBeInTheDocument();
  });
});
