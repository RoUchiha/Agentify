import { expect, test } from "@playwright/test";

import { demoAgentSpec } from "../src/domain/demo";

test("a provider cooldown is explicit and a retry can recover", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/plan", (route) => {
    attempts += 1;
    if (attempts === 1) {
      return route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          status: "provider_unavailable",
          issues: ["Groq free capacity is cooling down."],
          retryAfterSeconds: 7,
        }),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "ready",
        spec: {
          ...demoAgentSpec,
          decisions: { ...demoAgentSpec.decisions, unresolved: ["Confirm escalation policy."] },
        },
        provider: { id: "groq", dataBoundary: "cloud", reason: "Groq Free Cloud selected." },
      }),
    });
  });
  await page.goto("/");
  await page
    .getByLabel(/what should your agent accomplish/i)
    .fill("Build an agent that triages support tickets and escalates uncertain requests.");

  await page.getByRole("button", { name: /design my agent/i }).click();
  await expect(page.locator(".error-banner")).toContainText(
    "Groq free capacity is cooling down. Try again in 7 seconds.",
  );

  await page.getByRole("button", { name: /design my agent/i }).click();
  await expect(page.getByRole("heading", { name: "Support triage" })).toBeVisible();
  await expect(page.getByRole("status").first()).toContainText("Needs attention");
});

test("the home route renders meaningful content without an error overlay", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /describe the agent you need/i })).toBeVisible();
  await page
    .getByLabel(/what should your agent accomplish/i)
    .fill("Build a bounded research agent.");
  await expect(page.getByRole("button", { name: /design my agent/i })).toBeEnabled();
  await expect(page.locator("[data-nextjs-dialog], .vite-error-overlay")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveText("");
});
