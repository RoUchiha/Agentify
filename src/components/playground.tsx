"use client";

import { useState } from "react";

import { OperatorControls } from "@/components/operator-controls";
import { TraceTimeline } from "@/components/trace-timeline";
import type { AgentSpec } from "@/domain/agent-spec";
import type { PlaygroundRequest, PlaygroundRun } from "@/server/playground";

export type PlaygroundRunner = (request: PlaygroundRequest) => Promise<PlaygroundRun>;

export function Playground({
  spec,
  runner = runPlaygroundFromApi,
  runResult,
  onRunComplete,
  blockedReason,
}: {
  spec: AgentSpec;
  runner?: PlaygroundRunner;
  runResult?: PlaygroundRun;
  onRunComplete?(run: PlaygroundRun): void;
  blockedReason?: string;
}) {
  const [input, setInput] = useState(() =>
    JSON.stringify(spec.evaluations[0]?.input ?? {}, null, 2),
  );
  const [run, setRun] = useState<PlaygroundRun>();
  const [busy, setBusy] = useState(false);
  const [issue, setIssue] = useState<string>();
  const [operatorNotice, setOperatorNotice] = useState<string>();
  const displayedRun = runResult ?? run;

  async function submit() {
    if (blockedReason) return;
    let parsedInput: unknown;
    try {
      parsedInput = JSON.parse(input);
    } catch {
      setIssue("Test input must be valid JSON.");
      return;
    }

    setBusy(true);
    setIssue(undefined);
    setOperatorNotice(undefined);
    try {
      const result = await runner({ spec, input: parsedInput });
      setRun(result);
      onRunComplete?.(result);
    } catch (error) {
      setIssue(error instanceof Error ? error.message : "The test run failed safely.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="playground panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Provider-backed test</p>
          <h2>Playground</h2>
        </div>
        <span className={`run-state ${displayedRun?.status ?? "draft"}`}>
          {busy ? "Running" : displayedRun ? displayedRun.status.replaceAll("_", " ") : "Not run"}
        </span>
      </div>
      <div className="playground-grid">
        <div>
          <label htmlFor="playground-input">Test input</label>
          <textarea
            id="playground-input"
            onChange={(event) => setInput(event.target.value)}
            value={input}
          />
          {issue && (
            <p className="inline-error" role="alert">
              {issue}
            </p>
          )}
          <button
            className="primary-action"
            disabled={busy || Boolean(blockedReason)}
            onClick={submit}
            type="button"
          >
            {blockedReason ? "Resolve decisions before testing" : busy ? "Running test..." : "Run test"}
          </button>
        </div>
        <div className="playground-results">
          {displayedRun?.output !== undefined && (
            <section className="run-output">
              <p className="eyebrow">Structured output</p>
              <pre>{JSON.stringify(displayedRun.output, null, 2)}</pre>
            </section>
          )}
          {displayedRun?.usage && (
            <p className="usage-line">
              {displayedRun.usage.inputTokens ?? 0} input · {displayedRun.usage.outputTokens ?? 0}{" "}
              output · {displayedRun.latencyMs} ms
            </p>
          )}
          {displayedRun && <TraceTimeline trace={displayedRun.trace} />}
          {displayedRun?.pendingApproval && (
            <OperatorControls
              onApprove={() =>
                setOperatorNotice(
                  "Approval recorded for this review. Connect a runtime tool handler before execution.",
                )
              }
              onReject={() => setOperatorNotice("Tool request rejected. No write executed.")}
              toolId={displayedRun.pendingApproval.toolId}
            />
          )}
          {operatorNotice && (
            <p className="operator-notice" role="status">
              {operatorNotice}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export async function runPlaygroundFromApi(request: PlaygroundRequest): Promise<PlaygroundRun> {
  const response = await fetch("/api/playground", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(request),
  });
  const body = (await response.json()) as PlaygroundRun | { issues?: string[] };
  if (!response.ok || !("status" in body)) {
    const issues = "issues" in body ? body.issues : undefined;
    throw new Error(issues?.join(" ") || "The Playground run failed safely.");
  }
  return body;
}
