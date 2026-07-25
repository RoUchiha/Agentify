import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";

import { createPlaygroundRoute } from "@/server/routes/playground";
import { Workspace } from "@/components/workspace";
import { createZip } from "@/lib/zip";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("post-build failure boundaries", () => {
  test("rejects oversized Playground requests before execution", async () => {
    const run = vi.fn();
    const post = createPlaygroundRoute({ run });
    const response = await post(
      new Request("http://localhost/api/playground", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ spec: {}, input: "x".repeat(300_000) }),
      }),
    );

    expect(response.status).toBe(413);
    expect(run).not.toHaveBeenCalled();
  });

  test("renders provider cooldown evidence instead of an undefined state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            status: "provider_unavailable",
            issues: ["Groq free capacity is cooling down."],
            retryAfterSeconds: 7,
          },
          { status: 429 },
        ),
      ),
    );
    render(<Workspace />);

    await userEvent.type(
      screen.getByLabelText(/what should your agent accomplish/i),
      "Build an agent that triages support tickets.",
    );
    await userEvent.click(screen.getByRole("button", { name: /design my agent/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /groq free capacity is cooling down.*7 seconds/i,
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("undefined");
  });

  test("rejects traversal paths before creating a downloadable archive", () => {
    expect(() =>
      createZip({
        files: [{ path: "../outside.txt", content: "unsafe" }],
        manifest: { files: ["../outside.txt"] },
      }),
    ).toThrow(/unsafe|path/i);
  });
});
