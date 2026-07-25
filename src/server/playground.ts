import { AgentSpecSchema, type AgentSpec } from "@/domain/agent-spec";
import type { PlannerProvider, ProviderRunOutput } from "@/providers/types";

export type PlaygroundTraceType =
  | "run_started"
  | "model_response"
  | "tool_completed"
  | "approval_required"
  | "run_completed"
  | "run_failed";

export type PlaygroundTraceEvent = {
  sequence: number;
  type: PlaygroundTraceType;
  detail: string;
  timestamp: string;
};

export type PlaygroundRun = {
  status: "completed" | "needs_approval" | "failed";
  output?: unknown;
  trace: PlaygroundTraceEvent[];
  usage?: ProviderRunOutput["usage"];
  latencyMs: number;
  terminalReason:
    | "completed"
    | "approval_required"
    | "undeclared_tool"
    | "tool_unavailable"
    | "provider_unavailable"
    | "provider_error";
  pendingApproval?: {
    toolId: string;
    arguments: unknown;
  };
};

export type PlaygroundRequest = {
  spec: AgentSpec;
  input: unknown;
};

export async function executePlayground(
  request: PlaygroundRequest,
  provider: PlannerProvider,
): Promise<PlaygroundRun> {
  const startedAt = performance.now();
  const trace: PlaygroundTraceEvent[] = [];
  const addTrace = (type: PlaygroundTraceType, detail: string) => {
    trace.push({
      sequence: trace.length + 1,
      type,
      detail,
      timestamp: new Date().toISOString(),
    });
  };
  const latencyMs = () => Math.max(0, Math.round(performance.now() - startedAt));

  const parsed = AgentSpecSchema.safeParse(request.spec);
  if (!parsed.success) {
    addTrace("run_failed", "AgentSpec validation failed before execution.");
    return {
      status: "failed",
      trace,
      latencyMs: latencyMs(),
      terminalReason: "provider_error",
    };
  }

  addTrace("run_started", `${provider.id} accepted a schema-valid test run.`);
  if (!provider.run) {
    addTrace("run_failed", `${provider.id} does not expose a Playground runtime.`);
    return {
      status: "failed",
      trace,
      latencyMs: latencyMs(),
      terminalReason: "provider_unavailable",
    };
  }

  try {
    const result = await provider.run({ spec: parsed.data, input: request.input });
    addTrace("model_response", `${provider.id} returned structured output.`);

    if (result.toolRequest) {
      const tool = parsed.data.tools.find(
        (candidate) => candidate.id === result.toolRequest?.toolId,
      );
      if (!tool) {
        addTrace(
          "run_failed",
          `Provider requested undeclared tool ${result.toolRequest.toolId}; nothing executed.`,
        );
        return {
          status: "failed",
          trace,
          usage: result.usage,
          latencyMs: latencyMs(),
          terminalReason: "undeclared_tool",
        };
      }
      if (tool.mode === "write" || tool.approval === "required") {
        addTrace(
          "approval_required",
          `${tool.id} requires operator approval; no write has executed.`,
        );
        return {
          status: "needs_approval",
          trace,
          usage: result.usage,
          latencyMs: latencyMs(),
          terminalReason: "approval_required",
          pendingApproval: {
            toolId: tool.id,
            arguments: result.toolRequest.arguments,
          },
        };
      }

      addTrace(
        "run_failed",
        `${tool.id} is declared but has no registered Playground handler; nothing executed.`,
      );
      return {
        status: "failed",
        trace,
        usage: result.usage,
        latencyMs: latencyMs(),
        terminalReason: "tool_unavailable",
      };
    }

    addTrace("run_completed", "Provider output returned without executing a tool.");
    return {
      status: "completed",
      output: result.output,
      trace,
      usage: result.usage,
      latencyMs: latencyMs(),
      terminalReason: "completed",
    };
  } catch {
    addTrace("run_failed", `${provider.id} failed safely; no tool executed.`);
    return {
      status: "failed",
      trace,
      latencyMs: latencyMs(),
      terminalReason: "provider_error",
    };
  }
}
