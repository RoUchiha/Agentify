import { z } from "zod";

import type { AgentSpec } from "@/domain/agent-spec";

export const CUSTOMIZATION_PROVIDERS = [
  "free-auto",
  "ollama",
  "groq",
  "openai",
  "anthropic",
  "google",
] as const;

const Identifier = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z][a-z0-9_-]*$/);

export const CredentialReferenceSchema = z
  .string()
  .trim()
  .regex(
    /^[A-Z][A-Z0-9_]{2,79}$/,
    "Credentials must be opaque environment-style references such as GROQ_API_KEY.",
  );

const ModelProfileSchema = z
  .object({
    id: Identifier,
    provider: z.enum(CUSTOMIZATION_PROVIDERS),
    model: z.string().trim().min(1).max(200),
    temperature: z.number().min(0).max(2),
    topP: z.number().min(0).max(1),
    maxOutputTokens: z.number().int().min(1).max(1_000_000),
    seed: z.number().int().optional(),
    reasoningEffort: z.enum(["none", "low", "medium", "high"]),
    toolChoice: z.enum(["auto", "none", "required"]),
    parallelToolCalls: z.boolean(),
    structuredOutput: z.enum(["required", "preferred", "off"]),
    timeoutMs: z.number().int().min(1_000).max(900_000),
    fallbackProfileIds: z.array(Identifier).max(10),
  })
  .strict();

export const CustomizationSchema = z
  .object({
    modelProfiles: z.array(ModelProfileSchema).max(50),
    agentModelProfiles: z.record(Identifier, Identifier),
    toolPolicies: z
      .array(
        z
          .object({
            toolId: Identifier,
            connection: z.enum(["none", "function", "http", "mcp"]),
            credentialRef: CredentialReferenceSchema.optional(),
            approvalTiming: z.enum(["none", "runtime", "always"]),
            retries: z.number().int().min(0).max(5),
            concurrency: z.number().int().min(1).max(100),
            cache: z.enum(["none", "run", "session"]),
          })
          .strict(),
      )
      .max(50),
    knowledgePolicies: z
      .array(
        z
          .object({
            knowledgeId: Identifier,
            freshnessMinutes: z.number().int().min(0).max(525_600),
            chunkSize: z.number().int().min(64).max(32_768),
            topK: z.number().int().min(1).max(100),
            requireCitations: z.boolean(),
            failureMode: z.enum(["stop", "continue", "ask"]),
          })
          .strict(),
      )
      .max(50),
    statePolicies: z
      .array(
        z
          .object({
            stateKey: Identifier,
            initialization: z.enum(["empty", "input", "constant"]),
            defaultValue: z.unknown(),
            mutableBy: z.array(Identifier).max(20),
            maxBytes: z.number().int().min(1).max(10_000_000),
            conflict: z.enum(["reject", "last-write-wins", "merge"]),
          })
          .strict(),
      )
      .max(100),
    workflow: z
      .object({
        nodePolicies: z
          .array(
            z
              .object({
                nodeId: Identifier,
                timeoutMs: z.number().int().min(100).max(900_000),
                retries: z.number().int().min(0).max(5),
                failureTarget: Identifier.optional(),
              })
              .strict(),
          )
          .max(100),
        edgePolicies: z
          .array(
            z
              .object({
                source: Identifier,
                target: Identifier,
                priority: z.number().int().min(0).max(1_000),
                loopLimit: z.number().int().min(0).max(100),
              })
              .strict(),
          )
          .max(200),
        checkpoints: z
          .array(
            z
              .object({
                id: Identifier,
                afterNodeId: Identifier,
                approval: z.enum(["none", "operator"]),
                persist: z.boolean(),
              })
              .strict(),
          )
          .max(100),
      })
      .strict(),
    guardrails: z
      .array(
        z
          .object({
            id: Identifier,
            stage: z.enum(["input", "output", "tool", "handoff"]),
            rule: z.string().trim().min(3).max(2_000),
            action: z.enum(["block", "redact", "ask", "log"]),
            severity: z.enum(["low", "medium", "high", "critical"]),
          })
          .strict(),
      )
      .max(100),
    hooks: z
      .array(
        z
          .object({
            id: Identifier,
            event: z.enum([
              "run-start",
              "run-end",
              "model-start",
              "model-end",
              "tool-start",
              "tool-end",
              "handoff",
              "error",
            ]),
            handlerRef: z.string().trim().min(1).max(500),
            timeoutMs: z.number().int().min(100).max(120_000),
            failureMode: z.enum(["stop", "continue"]),
            location: z.enum(["local", "server", "generated-runtime"]),
          })
          .strict(),
      )
      .max(100),
    reliability: z
      .object({
        concurrency: z.number().int().min(1).max(100),
        failureMode: z.enum(["stop", "continue", "fallback"]),
      })
      .strict(),
    runtime: z
      .object({
        network: z.enum(["none", "declared-only", "unrestricted"]),
        filesystem: z.enum(["none", "sandbox", "declared-paths"]),
        streaming: z.boolean(),
        persistence: z.enum(["none", "run", "session", "project"]),
      })
      .strict(),
    observability: z
      .object({
        traceLevel: z.enum(["off", "errors", "actions", "full"]),
        logLevel: z.enum(["error", "warn", "info", "debug"]),
        metrics: z.boolean(),
        contentCapture: z.boolean(),
        sampleRate: z.number().min(0).max(1),
        redactSensitive: z.boolean(),
        retentionDays: z.number().int().min(0).max(3_650),
        exporters: z.array(z.enum(["console", "otlp", "file"])).max(3),
      })
      .strict(),
    delivery: z
      .object({
        packageName: z.string().trim().min(1).max(214).optional(),
        includeSpec: z.boolean(),
        includeTests: z.boolean(),
        includeCi: z.boolean(),
        includeReadme: z.boolean(),
        includeEnvTemplate: z.boolean(),
      })
      .strict(),
    providerOverrides: z
      .array(
        z.discriminatedUnion("provider", [
          z
            .object({
              provider: z.literal("groq"),
              model: z.string().trim().min(1).max(200),
              serviceTier: z.enum(["free", "on-demand"]),
            })
            .strict(),
          z
            .object({
              provider: z.literal("ollama"),
              model: z.string().trim().min(1).max(200),
              baseUrlRef: z.string().trim().min(1).max(200),
              keepAlive: z.string().trim().min(1).max(40),
            })
            .strict(),
          z
            .object({
              provider: z.literal("openai"),
              model: z.string().trim().min(1).max(200),
              credentialRef: CredentialReferenceSchema,
            })
            .strict(),
          z
            .object({
              provider: z.literal("anthropic"),
              model: z.string().trim().min(1).max(200),
              credentialRef: CredentialReferenceSchema,
            })
            .strict(),
          z
            .object({
              provider: z.literal("google"),
              model: z.string().trim().min(1).max(200),
              credentialRef: CredentialReferenceSchema,
            })
            .strict(),
        ]),
      )
      .max(10),
    frameworkOverrides: z
      .array(
        z.discriminatedUnion("target", [
          z
            .object({
              target: z.literal("openai-agents-ts"),
              tracingDisabled: z.boolean(),
              workflowName: z.string().trim().min(1).max(120),
            })
            .strict(),
          z
            .object({
              target: z.literal("openai-agents-python"),
              tracingDisabled: z.boolean(),
              workflowName: z.string().trim().min(1).max(120),
            })
            .strict(),
          z
            .object({
              target: z.literal("mcp-server"),
              transport: z.enum(["stdio", "streamable-http"]),
              instructions: z.string().trim().max(2_000),
            })
            .strict(),
          z.object({ target: z.literal("portable-spec") }).strict(),
        ]),
      )
      .max(4),
  })
  .strict();

export type Customization = z.infer<typeof CustomizationSchema>;

export const CUSTOMIZATION_DEFAULTS: Customization = {
  modelProfiles: [],
  agentModelProfiles: {},
  toolPolicies: [],
  knowledgePolicies: [],
  statePolicies: [],
  workflow: { nodePolicies: [], edgePolicies: [], checkpoints: [] },
  guardrails: [],
  hooks: [],
  reliability: { concurrency: 1, failureMode: "stop" },
  runtime: {
    network: "declared-only",
    filesystem: "sandbox",
    streaming: true,
    persistence: "run",
  },
  observability: {
    traceLevel: "actions",
    logLevel: "info",
    metrics: true,
    contentCapture: false,
    sampleRate: 1,
    redactSensitive: true,
    retentionDays: 0,
    exporters: [],
  },
  delivery: {
    includeSpec: true,
    includeTests: true,
    includeCi: true,
    includeReadme: true,
    includeEnvTemplate: true,
  },
  providerOverrides: [],
  frameworkOverrides: [],
};

export function materializeCustomization(spec: AgentSpec): AgentSpec {
  const cloned = structuredClone(spec);
  return {
    ...cloned,
    metadata: { ...cloned.metadata, version: "1.1" },
    customization: cloned.customization ?? structuredClone(CUSTOMIZATION_DEFAULTS),
  };
}
