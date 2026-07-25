import { expect, test } from "@playwright/test";

import { demoAgentSpec } from "../src/domain/demo";

test("one prompt advances through the visible design, test, build, and delivery path", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  await installSuccessfulPipeline(page);
  await page.goto("/");

  await page
    .getByLabel(/what should your agent accomplish/i)
    .fill(
      "Build an agent that triages support tickets, cites evidence, and drafts a safe response.",
    );
  await page.getByRole("button", { name: /design my agent/i }).click();

  await expect(page.getByRole("status").first()).toContainText("Verified package ready");
  await expect(page.getByRole("heading", { name: "Support triage" })).toBeVisible();
  await expect(page.getByRole("region", { name: /run trace/i })).toContainText(
    "Provider returned structured output",
  );
  await expect(page.getByRole("region", { name: /verification report/i })).toContainText(
    "secret-scan",
  );
  await expect(page.getByRole("button", { name: /download verified zip/i })).toBeEnabled();

  await page.getByRole("switch", { name: /advanced/i }).click();
  await expect(page.getByRole("region", { name: /agent canvas/i })).toBeVisible();
  await expect(page.getByRole("textbox", { name: /agent spec/i })).toContainText(
    '"version": "1.0"',
  );
  expect(consoleErrors).toEqual([]);
});

test("the Agentify server reaches the real HarnessBuilder build endpoint", async ({ request }) => {
  const response = await request.post("/api/build", {
    data: {
      spec: demoAgentSpec,
      target: "openai-agents-ts",
      executionProfile: "hybrid",
    },
  });
  const body = await response.json();

  expect(response.status()).toBe(200);
  expect(body).toMatchObject({
    status: "packaged",
    artifact: {
      manifest: {
        agentSpecVersion: "1.0",
        artifactTarget: "openai-agents-ts",
        executionProfile: "hybrid",
      },
    },
    report: { status: "passed" },
  });
  expect(body.artifact.files.length).toBeGreaterThan(10);
});

async function installSuccessfulPipeline(page: import("@playwright/test").Page) {
  await page.route("**/api/plan", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "ready",
        spec: demoAgentSpec,
        provider: { id: "groq", dataBoundary: "cloud", reason: "Groq Free Cloud selected." },
      }),
    }),
  );
  await page.route("**/api/playground", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "completed",
        output: { category: "account-access", evidence: ["Password reset request"] },
        trace: [
          {
            sequence: 1,
            type: "run_started",
            detail: "Run accepted.",
            timestamp: "2026-07-24T12:00:00.000Z",
          },
          {
            sequence: 2,
            type: "model_response",
            detail: "Provider returned structured output.",
            timestamp: "2026-07-24T12:00:01.000Z",
          },
          {
            sequence: 3,
            type: "run_completed",
            detail: "Run completed.",
            timestamp: "2026-07-24T12:00:02.000Z",
          },
        ],
        usage: { inputTokens: 22, outputTokens: 14 },
        latencyMs: 18,
        terminalReason: "completed",
      }),
    }),
  );
  await page.route("**/api/build", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(packagedBuild()),
    }),
  );
}

function packagedBuild() {
  return {
    buildId: "browser-build",
    status: "packaged",
    events: [
      { status: "accepted", evidence: "Build accepted." },
      { status: "testing", evidence: "Generated tests reviewed." },
      { status: "packaged", evidence: "Verified package ready." },
    ],
    artifact: {
      files: [{ path: "README.md", content: "# Agent" }],
      manifest: {
        formatVersion: 1,
        specName: "Support triage",
        runtime: "node-typescript",
        modules: [],
        gates: ["secret-scan"],
        files: ["README.md"],
        immutableSpec: { path: "harness.spec.yaml", checksum: "abc" },
        agentSpecVersion: "1.0",
        artifactTarget: "openai-agents-ts",
        executionProfile: "hybrid",
      },
      checksums: { "README.md": "abc" },
    },
    report: {
      status: "passed",
      gates: [
        {
          id: "secret-scan",
          status: "passed",
          blocking: true,
          evidence: ["No credential-shaped values found."],
        },
      ],
      generatedAt: "2026-07-24T12:00:00.000Z",
      delivery: { status: "github-connection-required", message: "Not configured." },
    },
  };
}
