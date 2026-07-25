import path from "node:path";
import { existsSync } from "node:fs";

import { defineConfig, devices } from "@playwright/test";

const harnessBuilderCwd = resolveHarnessBuilder();
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3210",
    ...(process.env.CI ? {} : { channel: "chrome" }),
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    ...devices["Desktop Chrome"],
  },
  webServer: [
    {
      command: `${npmCommand} run dev -- -p 3211`,
      cwd: harnessBuilderCwd,
      url: "http://127.0.0.1:3211",
      reuseExistingServer: false,
      timeout: 120_000,
    },
    {
      command: `${npmCommand} run dev -- -p 3210`,
      cwd: __dirname,
      env: {
        ...process.env,
        HARNESS_BUILDER_URL: "http://127.0.0.1:3211",
      },
      url: "http://127.0.0.1:3210",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});

function resolveHarnessBuilder(): string {
  const candidates = [
    process.env.HARNESS_BUILDER_CWD,
    path.resolve(__dirname, "../../../HarnessBuilder/.worktrees/agentify-full-customization"),
    path.resolve(__dirname, "../../../HarnessBuilder/.worktrees/agent-spec-build-api"),
    path.resolve(__dirname, "../HarnessBuilder"),
    path.resolve(__dirname, "HarnessBuilder"),
  ].filter((candidate): candidate is string => Boolean(candidate));
  const resolved = candidates.find((candidate) => existsSync(path.join(candidate, "package.json")));
  if (!resolved) {
    throw new Error(
      "HarnessBuilder checkout not found. Set HARNESS_BUILDER_CWD before running browser tests.",
    );
  }
  return resolved;
}
