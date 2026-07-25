# Agentify Full Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent Quick Build / Advanced Build experience in which Quick Build resolves exact missing decisions with easiest-safe suggestions and Advanced Build exposes every developer-controlled agent setting through typed, validated controls and non-mutating improvement advice.

**Architecture:** Keep one canonical `AgentSpec` shared by both modes. Add an optional versioned `customization` domain to the portable contract, a deterministic requirements-coverage engine, a deterministic advisor, and a contract-driven recursive editor with curated section metadata. Mirror the strict schema in HarnessBuilder and compile accepted customization into target runtime configuration or return an explicit capability failure.

**Tech Stack:** Next.js 15.5.21, React 19, TypeScript 5.9, Zod 4, Vitest 4, Testing Library, Playwright 1.60, deterministic HarnessBuilder templates.

## Global Constraints

- Quick Build and Advanced Build are views over one canonical spec; mode switching must not lose fields or decisions.
- Every editable setting must compile into behavior, policy, tests, packaging, runtime instructions, or an explicit incompatibility.
- Unknown fields remain rejected by strict schemas.
- Raw credential values never enter browser state or `AgentSpec`; only opaque references are allowed.
- Suggestions never auto-apply and cannot silently expand permissions, cost, data movement, or retention.
- “Use all safe defaults” excludes credentials, writes, destructive actions, paid providers, data-residency changes, and public deployment.
- Existing `AgentSpec 1.0` inputs remain accepted; materialized customization upgrades metadata to `1.1`.
- The HarnessBuilder request envelope remains `contractVersion: "1.0"` while `agentSpec.metadata.version` independently supports `"1.0"` and `"1.1"`.
- Use `npm.cmd` on Windows.
- Every production behavior starts with a failing test and ends with a focused commit.

## File structure

### Agentify

- Create `src/domain/customization.ts`: customization schema, defaults, v1.0-to-v1.1 materialization, and typed configuration definitions.
- Modify `src/domain/agent-spec.ts`: accept `metadata.version` 1.0/1.1 and optional strict `customization`.
- Create `src/domain/requirements-coverage.ts`: exact gaps, safe-default ranking, answers, and completion.
- Create `src/domain/advisor.ts`: reviewed advisory rules and immutable patch application.
- Create `src/domain/spec-path.ts`: immutable dot-path reads/writes used by forms and advice.
- Create `src/components/build-mode-toggle.tsx`: persistent Quick Build / Advanced Build selector.
- Create `src/components/quick-followups.tsx`: one-at-a-time missing-decision workflow.
- Create `src/components/advanced-studio.tsx`: section navigation, typed editor, advisor rail, raw-spec view.
- Create `src/components/config-field.tsx`: recursive scalar, enum, object, JSON, and array controls.
- Create `src/components/advisor-rail.tsx`: finding evidence, diff preview, apply/edit/dismiss.
- Create `src/components/studio-sections.ts`: curated section definitions and help metadata.
- Modify `src/components/workspace.tsx`: shared mode/spec state, coverage, advice, build blocking.
- Modify `src/components/spec-editor.tsx`: reuse immutable apply path and preserve last valid spec.
- Modify `src/app/globals.css`: responsive two-mode studio styling.
- Create `tests/domain/customization.test.ts`, `requirements-coverage.test.ts`, `advisor.test.ts`, and `spec-path.test.ts`.
- Create `tests/ui/build-mode-toggle.test.tsx`, `quick-followups.test.tsx`, `advanced-studio.test.tsx`, and `advisor-rail.test.tsx`.
- Modify `tests/ui/workspace.test.tsx`, hardening tests, and `e2e/agent-builder.spec.ts`.

### HarnessBuilder

- Modify `src/domain/agent-spec.ts`: mirror Agentify 1.1 customization validation and cross-reference rules.
- Modify `src/domain/agent-adapter.ts`: carry customization into harness policy/context.
- Modify `src/domain/target-artifacts.ts`: emit `agent.config.json` and target-specific supported settings.
- Modify `src/domain/verify.ts`: verify config presence, support decisions, and secret-free credential references.
- Modify `tests/fixtures/agent-spec.ts`, `agent-contract-matrix.test.ts`, `agent-adapter.test.ts`, `verify.test.ts`, and `generate.test.ts`.

---

### Task 1: Add the shared AgentSpec 1.1 customization contract

**Files:**
- Create: `AgentBuilder/src/domain/customization.ts`
- Modify: `AgentBuilder/src/domain/agent-spec.ts`
- Create: `AgentBuilder/tests/domain/customization.test.ts`
- Modify: `AgentBuilder/tests/domain/agent-spec.test.ts`
- Modify: `HarnessBuilder/src/domain/agent-spec.ts`
- Modify: `HarnessBuilder/tests/fixtures/agent-spec.ts`
- Modify: `HarnessBuilder/tests/domain/agent-contract-matrix.test.ts`

**Interfaces:**
- Produces: `CustomizationSchema`, `Customization`, `CUSTOMIZATION_DEFAULTS`, and `materializeCustomization(spec: AgentSpec): AgentSpec`.
- Contract rule: v1.0 without customization parses; materialization returns v1.1 with a complete strict customization object.

- [ ] **Step 1: Write failing Agentify contract and migration tests**

```ts
test("materializes a complete v1.1 customization contract from v1.0", () => {
  const result = materializeCustomization(demoAgentSpec);
  expect(result.metadata.version).toBe("1.1");
  expect(result.customization).toMatchObject({
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
  });
  expect(AgentSpecSchema.parse(result)).toEqual(result);
});

test("rejects raw credentials inside customization", () => {
  const spec = materializeCustomization(demoAgentSpec);
  const unsafe = {
    ...spec,
    customization: {
      ...spec.customization,
      toolPolicies: [
        {
          toolId: "search-kb",
          connection: "http",
          credentialRef: "gsk_secret_value",
          approvalTiming: "runtime",
          retries: 1,
          concurrency: 1,
          cache: "none",
        },
      ],
    },
  };
  expect(AgentSpecSchema.safeParse(unsafe).success).toBe(false);
});
```

- [ ] **Step 2: Run Agentify tests and verify RED**

Run:

```powershell
npm.cmd test -- tests/domain/customization.test.ts tests/domain/agent-spec.test.ts
```

Expected: FAIL because the customization module, v1.1 version, and schema are absent.

- [ ] **Step 3: Implement the strict customization schema and materializer**

```ts
export const CustomizationSchema = z
  .object({
    modelProfiles: z.array(
      z
        .object({
          id: Identifier,
          provider: z.enum(PROVIDERS),
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
        .strict(),
    ),
    agentModelProfiles: z.record(Identifier, Identifier),
    toolPolicies: z.array(
      z
        .object({
          toolId: Identifier,
          connection: z.enum(["none", "function", "http", "mcp"]),
          credentialRef: CredentialReference.optional(),
          approvalTiming: z.enum(["none", "runtime", "always"]),
          retries: z.number().int().min(0).max(5),
          concurrency: z.number().int().min(1).max(100),
          cache: z.enum(["none", "run", "session"]),
        })
        .strict(),
    ),
    knowledgePolicies: z.array(
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
    ),
    statePolicies: z.array(
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
    ),
    workflow: z
      .object({
        nodePolicies: z.array(
          z
            .object({
              nodeId: Identifier,
              timeoutMs: z.number().int().min(100).max(900_000),
              retries: z.number().int().min(0).max(5),
              failureTarget: Identifier.optional(),
            })
            .strict(),
        ),
        edgePolicies: z.array(
          z
            .object({
              source: Identifier,
              target: Identifier,
              priority: z.number().int().min(0).max(1_000),
              loopLimit: z.number().int().min(0).max(100),
            })
            .strict(),
        ),
        checkpoints: z.array(
          z
            .object({
              id: Identifier,
              afterNodeId: Identifier,
              approval: z.enum(["none", "operator"]),
              persist: z.boolean(),
            })
            .strict(),
        ),
      })
      .strict(),
    guardrails: z.array(
      z
        .object({
          id: Identifier,
          stage: z.enum(["input", "output", "tool", "handoff"]),
          rule: z.string().trim().min(3).max(2_000),
          action: z.enum(["block", "redact", "ask", "log"]),
          severity: z.enum(["low", "medium", "high", "critical"]),
        })
        .strict(),
    ),
    hooks: z.array(
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
    ),
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
        retentionDays: z.number().int().min(0).max(3650),
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
    providerOverrides: z.array(
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
            provider: z.enum(["openai", "anthropic", "google"]),
            model: z.string().trim().min(1).max(200),
            credentialRef: CredentialReference,
          })
          .strict(),
      ]),
    ),
    frameworkOverrides: z.array(
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
    ),
  })
  .strict();
```

Implement `CredentialReference` as `/^[A-Z][A-Z0-9_]{2,79}$/` and `materializeCustomization` as a deep-cloned merge with `CUSTOMIZATION_DEFAULTS`; never mutate the caller.

- [ ] **Step 4: Mirror the schema and semantic references in HarnessBuilder**

Add the same strict shapes and super-refinements for:

```ts
const modelProfileIds = new Set(spec.customization?.modelProfiles.map((profile) => profile.id));
for (const [agentId, profileId] of Object.entries(
  spec.customization?.agentModelProfiles ?? {},
)) {
  if (!agentIds.has(agentId) || !modelProfileIds.has(profileId)) {
    context.addIssue({
      code: "custom",
      path: ["customization", "agentModelProfiles"],
      message: `Agent model profile mapping ${agentId} -> ${profileId} is undeclared.`,
    });
  }
}
```

Repeat equivalent reference checks for tool, knowledge, state, node, edge, checkpoint, and fallback profile identifiers.

- [ ] **Step 5: Run both contract suites and verify GREEN**

```powershell
cd C:\Users\swagg\.claude\AgentBuilder
npm.cmd test -- tests/domain/customization.test.ts tests/domain/agent-spec.test.ts tests/hardening/contract-compatibility.test.ts
cd C:\Users\swagg\.claude\HarnessBuilder
npm.cmd test -- tests/domain/agent-contract-matrix.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit both repositories**

```powershell
git add src/domain/customization.ts src/domain/agent-spec.ts tests/domain/customization.test.ts tests/domain/agent-spec.test.ts
git commit -m "feat: define AgentSpec customization contract"
```

```powershell
git add src/domain/agent-spec.ts tests/fixtures/agent-spec.ts tests/domain/agent-contract-matrix.test.ts
git commit -m "feat: accept AgentSpec customization contract"
```

### Task 2: Implement exact Quick Build requirements coverage

**Files:**
- Create: `AgentBuilder/src/domain/requirements-coverage.ts`
- Create: `AgentBuilder/tests/domain/requirements-coverage.test.ts`
- Modify: `AgentBuilder/src/domain/policy.ts`

**Interfaces:**
- Produces:

```ts
export type RequirementGap = {
  id: string;
  path: string;
  severity: "blocking" | "advisory";
  question: string;
  reason: string;
  recommended: GapOption;
  alternatives: GapOption[];
  impacts: Array<"permission" | "privacy" | "cost" | "portability" | "deployment">;
  safeDefaultEligible: boolean;
};

export type GapOption = {
  id: string;
  label: string;
  value: unknown;
  effort: "easiest" | "moderate" | "advanced";
  explanation: string;
};

export function analyzeRequirements(spec: AgentSpec): RequirementsCoverage;
export function answerRequirement(
  spec: AgentSpec,
  gap: RequirementGap,
  option: GapOption,
): AgentSpec;
export function applyAllSafeDefaults(
  spec: AgentSpec,
  coverage: RequirementsCoverage,
): AgentSpec;
```

- [ ] **Step 1: Write failing safe-default and exact-gap tests**

```ts
test("recommends the easiest safe implementation for an unresolved integration", () => {
  const spec = materializeCustomization({
    ...demoAgentSpec,
    tools: [],
    decisions: {
      ...demoAgentSpec.decisions,
      unresolved: ["Which CRM should receive ticket updates?"],
    },
  });
  const coverage = analyzeRequirements(spec);
  expect(coverage.gaps[0]).toMatchObject({
    id: "decision-crm-destination",
    path: "decisions.unresolved.0",
    severity: "blocking",
    recommended: {
      label: "Start read-only without a CRM write",
      effort: "easiest",
    },
    impacts: ["permission", "deployment"],
    safeDefaultEligible: false,
  });
});

test("applies only low-risk technical defaults", () => {
  const coverage = analyzeRequirements(specWithMissingTechnicalAndWriteDecisions);
  const updated = applyAllSafeDefaults(specWithMissingTechnicalAndWriteDecisions, coverage);
  expect(updated.runtime.deploymentMode).toBe("hybrid");
  expect(updated.models.preferredProvider).toBe("free-auto");
  expect(updated.decisions.unresolved).toContain("Authorize sending external messages?");
});
```

- [ ] **Step 2: Run the test and verify RED**

```powershell
npm.cmd test -- tests/domain/requirements-coverage.test.ts
```

Expected: FAIL because coverage functions do not exist.

- [ ] **Step 3: Implement deterministic coverage rules**

Use an ordered `CoverageRule[]`:

```ts
type CoverageRule = {
  id: string;
  evaluate(spec: AgentSpec): RequirementGap[];
};

const RULES: CoverageRule[] = [
  unresolvedDecisionRule,
  missingModelProfileRule,
  writeApprovalRule,
  restrictedCloudRule,
  missingEvaluationRule,
  incompatibleTargetRule,
];

export function analyzeRequirements(spec: AgentSpec): RequirementsCoverage {
  const gaps = RULES.flatMap((rule) => rule.evaluate(spec));
  return {
    complete: gaps.every((gap) => gap.severity !== "blocking"),
    gaps,
    defaults: collectAppliedDefaults(spec),
    assumptions: [...spec.decisions.assumptions],
    risks: unique(gaps.flatMap((gap) => gap.impacts)),
  };
}
```

Rank recommendations by `effort`, then no-tool over tool, read over write, no persistence over persistence, Free Auto over fixed paid providers, Hybrid over Cloud, and deterministic evaluation over model grading.

- [ ] **Step 4: Implement immutable answer application**

Map each gap to a reviewed updater instead of accepting arbitrary client patches:

```ts
const ANSWER_APPLIERS: Record<
  string,
  (spec: AgentSpec, option: GapOption) => AgentSpec
> = {
  "decision-crm-destination": applyCrmDecision,
  "model-primary-profile": applyModelProfile,
  "runtime-deployment-mode": applyDeploymentMode,
};
```

Unknown gap IDs throw `Unsupported requirement answer.` and never mutate the spec.

- [ ] **Step 5: Run focused and policy tests**

```powershell
npm.cmd test -- tests/domain/requirements-coverage.test.ts tests/domain/policy.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/domain/requirements-coverage.ts src/domain/policy.ts tests/domain/requirements-coverage.test.ts
git commit -m "feat: add Quick Build requirement guidance"
```

### Task 3: Add immutable spec paths and the Advanced advisor engine

**Files:**
- Create: `AgentBuilder/src/domain/spec-path.ts`
- Create: `AgentBuilder/src/domain/advisor.ts`
- Create: `AgentBuilder/tests/domain/spec-path.test.ts`
- Create: `AgentBuilder/tests/domain/advisor.test.ts`

**Interfaces:**
- Produces:

```ts
export type SpecPatch = { path: string; value: unknown };
export function getSpecValue(spec: AgentSpec, path: string): unknown;
export function applySpecPatches(spec: AgentSpec, patches: SpecPatch[]): AgentSpecParseResult;

export type AdvisoryFinding = {
  id: string;
  ruleId: string;
  paths: string[];
  severity: "blocking" | "recommended" | "optional";
  category: "safety" | "clarity" | "reliability" | "cost" | "portability" | "testing";
  title: string;
  explanation: string;
  evidence: string[];
  patches: SpecPatch[];
  impacts: string[];
};

export function adviseSpec(spec: AgentSpec, dismissedIds?: ReadonlySet<string>): AdvisoryFinding[];
```

- [ ] **Step 1: Write failing immutable-patch tests**

```ts
test("applies a validated patch without mutating the accepted spec", () => {
  const original = materializeCustomization(demoAgentSpec);
  const result = applySpecPatches(original, [
    { path: "budgets.maxTokens", value: 4_000 },
    { path: "customization.observability.traceLevel", value: "errors" },
  ]);
  expect(result.success).toBe(true);
  expect(original.budgets.maxTokens).toBe(8_000);
  if (result.success) {
    expect(result.data.budgets.maxTokens).toBe(4_000);
    expect(result.data.customization?.observability.traceLevel).toBe("errors");
  }
});

test("rejects prototype and array-index escapes", () => {
  expect(
    applySpecPatches(materializeCustomization(demoAgentSpec), [
      { path: "__proto__.polluted", value: true },
    ]).success,
  ).toBe(false);
});
```

- [ ] **Step 2: Write failing advisor behavior tests**

```ts
test("recommends a simpler single-agent design without auto-applying it", () => {
  const spec = teamSpecWithOneMeaningfulRole();
  const findings = adviseSpec(spec);
  expect(findings).toContainEqual(
    expect.objectContaining({
      ruleId: "simplify-redundant-team",
      severity: "recommended",
      patches: expect.any(Array),
    }),
  );
  expect(spec.workflow.topology).toBe("team");
});

test("blocks content tracing for confidential knowledge without redaction", () => {
  const findings = adviseSpec(confidentialFullTraceSpec());
  expect(findings).toContainEqual(
    expect.objectContaining({
      ruleId: "confidential-content-tracing",
      severity: "blocking",
      paths: ["customization.observability.contentCapture"],
    }),
  );
});
```

- [ ] **Step 3: Run tests and verify RED**

```powershell
npm.cmd test -- tests/domain/spec-path.test.ts tests/domain/advisor.test.ts
```

Expected: FAIL because patch and advisor modules do not exist.

- [ ] **Step 4: Implement safe path traversal**

Split dot paths, reject `__proto__`, `prototype`, and `constructor`, require existing keys or valid numeric array indexes, clone with `structuredClone`, assign, and reparse with `AgentSpecSchema.safeParse`.

- [ ] **Step 5: Implement the reviewed advisor rule pack**

Register rules as pure functions:

```ts
const ADVISOR_RULES: AdvisorRule[] = [
  redundantTeamRule,
  unboundedHandoffCycleRule,
  unusedToolRule,
  writeApprovalRule,
  weakOutputSchemaRule,
  inconsistentBudgetsRule,
  disproportionateBudgetRule,
  restrictedCloudRule,
  persistentUnredactedStateRule,
  missingEvaluationKindsRule,
  modelOnlyEvaluationRule,
  incompatibleOverrideRule,
  confidentialContentTracingRule,
];
```

Derive finding IDs as `${ruleId}:${paths.join(",")}:${stableEvidenceDigest}` so unchanged dismissals stay dismissed and changed evidence produces a new finding.

- [ ] **Step 6: Run tests and verify GREEN**

```powershell
npm.cmd test -- tests/domain/spec-path.test.ts tests/domain/advisor.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/domain/spec-path.ts src/domain/advisor.ts tests/domain/spec-path.test.ts tests/domain/advisor.test.ts
git commit -m "feat: add Advanced Build advisor rules"
```

### Task 4: Replace the boolean switch with a shared Quick/Advanced mode shell

**Files:**
- Create: `AgentBuilder/src/components/build-mode-toggle.tsx`
- Create: `AgentBuilder/tests/ui/build-mode-toggle.test.tsx`
- Modify: `AgentBuilder/src/components/workspace.tsx`
- Modify: `AgentBuilder/tests/ui/workspace.test.tsx`
- Modify: `AgentBuilder/src/app/globals.css`

**Interfaces:**
- Produces: `BuildMode = "quick" | "advanced"` and `BuildModeToggle`.
- Workspace owns one `AgentSpec` and passes the same object to both mode views.

- [ ] **Step 1: Write failing accessible toggle and preservation tests**

```tsx
test("switches between Quick Build and Advanced Build with a labelled control", async () => {
  render(<BuildModeToggle mode="quick" onChange={onChange} />);
  await userEvent.click(screen.getByRole("radio", { name: "Advanced Build" }));
  expect(onChange).toHaveBeenCalledWith("advanced");
});

test("preserves an Advanced edit after returning through Quick Build", async () => {
  render(<ReadyWorkspace />);
  await openAdvancedAndChangeName("Escalation analyst");
  await userEvent.click(screen.getByRole("radio", { name: "Quick Build" }));
  await userEvent.click(screen.getByRole("radio", { name: "Advanced Build" }));
  expect(screen.getByLabelText("Agent name")).toHaveValue("Escalation analyst");
});
```

- [ ] **Step 2: Run tests and verify RED**

```powershell
npm.cmd test -- tests/ui/build-mode-toggle.test.tsx tests/ui/workspace.test.tsx
```

Expected: FAIL because the radio group and shared mode behavior are absent.

- [ ] **Step 3: Implement the mode selector**

```tsx
export function BuildModeToggle({ mode, onChange }: Props) {
  return (
    <fieldset className="build-mode-toggle">
      <legend className="sr-only">Build mode</legend>
      {(["quick", "advanced"] as const).map((value) => (
        <label className={mode === value ? "selected" : undefined} key={value}>
          <input
            checked={mode === value}
            name="build-mode"
            onChange={() => onChange(value)}
            type="radio"
          />
          {value === "quick" ? "Quick Build" : "Advanced Build"}
        </label>
      ))}
    </fieldset>
  );
}
```

Replace `advanced: boolean` with `mode: BuildMode`. Materialize customization once when a plan becomes ready:

```ts
const acceptedSpec = materializeCustomization(result.spec);
setSpec(acceptedSpec);
setCoverage(analyzeRequirements(acceptedSpec));
```

- [ ] **Step 4: Run tests and verify GREEN**

```powershell
npm.cmd test -- tests/ui/build-mode-toggle.test.tsx tests/ui/workspace.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/build-mode-toggle.tsx src/components/workspace.tsx src/app/globals.css tests/ui/build-mode-toggle.test.tsx tests/ui/workspace.test.tsx
git commit -m "feat: add Quick and Advanced build modes"
```

### Task 5: Build the Quick Build follow-up workflow

**Files:**
- Create: `AgentBuilder/src/components/quick-followups.tsx`
- Create: `AgentBuilder/tests/ui/quick-followups.test.tsx`
- Modify: `AgentBuilder/src/components/workspace.tsx`
- Modify: `AgentBuilder/tests/hardening/automatic-pipeline.test.tsx`

**Interfaces:**
- Consumes: `RequirementsCoverage`, `answerRequirement`, and `applyAllSafeDefaults`.
- Produces: accepted `AgentSpec` updates; the automatic Playground/build pipeline starts only when `coverage.complete`.

- [ ] **Step 1: Write failing follow-up interaction tests**

```tsx
test("shows the exact missing field and easiest recommendation", async () => {
  render(<QuickFollowups spec={spec} coverage={coverage} onChange={onChange} />);
  expect(screen.getByText("decisions.unresolved.0")).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Which CRM should receive updates?" })).toBeVisible();
  expect(screen.getByText("Recommended · easiest")).toBeVisible();
});

test("does not include sensitive decisions in all-safe-defaults", async () => {
  render(<QuickFollowups spec={spec} coverage={mixedCoverage} onChange={onChange} />);
  await userEvent.click(screen.getByRole("button", { name: "Use all safe defaults" }));
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({
      decisions: expect.objectContaining({
        unresolved: expect.arrayContaining(["Authorize sending external messages?"]),
      }),
    }),
  );
});
```

- [ ] **Step 2: Run tests and verify RED**

```powershell
npm.cmd test -- tests/ui/quick-followups.test.tsx tests/hardening/automatic-pipeline.test.tsx
```

Expected: FAIL because follow-ups do not exist and auto-run ignores coverage.

- [ ] **Step 3: Implement one-at-a-time follow-ups**

Render the first blocking gap, its path, reason, recommended option, and alternatives. Use buttons for reviewed options and a JSON-aware custom value field only when the gap declares `customValue: true`. Recompute coverage after every accepted answer.

- [ ] **Step 4: Gate automatic continuation**

```ts
const nextCoverage = analyzeRequirements(acceptedSpec);
setCoverage(nextCoverage);
if (autoContinue && nextCoverage.complete && decision.status === "ready") {
  await runAutomaticPipeline(acceptedSpec);
}
```

Build and Playground actions remain disabled while blocking gaps exist and show `Resolve N required decisions`.

- [ ] **Step 5: Run tests and verify GREEN**

```powershell
npm.cmd test -- tests/ui/quick-followups.test.tsx tests/hardening/automatic-pipeline.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/components/quick-followups.tsx src/components/workspace.tsx tests/ui/quick-followups.test.tsx tests/hardening/automatic-pipeline.test.tsx
git commit -m "feat: guide missing Quick Build decisions"
```

### Task 6: Build the complete contract-driven Advanced editor

**Files:**
- Create: `AgentBuilder/src/components/studio-sections.ts`
- Create: `AgentBuilder/src/components/config-field.tsx`
- Create: `AgentBuilder/src/components/advanced-studio.tsx`
- Create: `AgentBuilder/tests/ui/advanced-studio.test.tsx`
- Modify: `AgentBuilder/src/components/workspace.tsx`
- Modify: `AgentBuilder/src/app/globals.css`

**Interfaces:**
- Produces `STUDIO_SECTIONS`, `StudioFieldDefinition`, `ConfigField`, and `AdvancedStudio`.
- Completeness invariant: every editable top-level path is assigned to exactly one studio section; raw AgentSpec is always available.

- [ ] **Step 1: Write failing section-completeness and editing tests**

```tsx
const REQUIRED_SECTIONS = [
  "Overview",
  "Objective and schemas",
  "Agents and instructions",
  "Models and providers",
  "Tools and permissions",
  "Knowledge",
  "Memory and state",
  "Workflow",
  "Guardrails and approvals",
  "Hooks and lifecycle",
  "Budgets and reliability",
  "Runtime and sandbox",
  "Evaluations",
  "Observability",
  "Delivery and targets",
  "Provider/framework overrides",
  "Raw AgentSpec",
];

test.each(REQUIRED_SECTIONS)("exposes the %s section", (name) => {
  render(<AdvancedStudio spec={customizedSpec} onChange={onChange} />);
  expect(screen.getByRole("button", { name: new RegExp(name, "i") })).toBeVisible();
});

test("edits scalar, enum, boolean, JSON, and array values", async () => {
  render(<AdvancedStudio spec={customizedSpec} onChange={onChange} />);
  await selectSection("Budgets and reliability");
  await userEvent.clear(screen.getByLabelText("Maximum tokens"));
  await userEvent.type(screen.getByLabelText("Maximum tokens"), "4000");
  await userEvent.click(screen.getByRole("button", { name: "Apply section" }));
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ budgets: expect.objectContaining({ maxTokens: 4000 }) }),
  );
});
```

- [ ] **Step 2: Add a schema-to-section coverage test**

Export `EDITABLE_ROOT_PATHS` from `studio-sections.ts` and assert this literal list:

```ts
expect(EDITABLE_ROOT_PATHS).toEqual([
  "metadata",
  "objective",
  "agents",
  "models",
  "tools",
  "knowledge",
  "state",
  "workflow",
  "budgets",
  "runtime",
  "evaluations",
  "decisions",
  "customization.modelProfiles",
  "customization.agentModelProfiles",
  "customization.toolPolicies",
  "customization.knowledgePolicies",
  "customization.statePolicies",
  "customization.workflow",
  "customization.guardrails",
  "customization.hooks",
  "customization.reliability",
  "customization.runtime",
  "customization.observability",
  "customization.delivery",
  "customization.providerOverrides",
  "customization.frameworkOverrides",
]);
```

- [ ] **Step 3: Run tests and verify RED**

```powershell
npm.cmd test -- tests/ui/advanced-studio.test.tsx
```

Expected: FAIL because the studio and section registry are absent.

- [ ] **Step 4: Implement curated section definitions**

Each definition contains exact paths, label, description, and control hints:

```ts
export type StudioSection = {
  id: string;
  label: string;
  description: string;
  roots: string[];
};

export const STUDIO_SECTIONS: StudioSection[] = [
  {
    id: "overview",
    label: "Overview",
    description: "Identity, revision, decisions, and project intent.",
    roots: ["metadata", "decisions"],
  },
  {
    id: "objective",
    label: "Objective and schemas",
    description: "Goals, success and failure conditions, and JSON contracts.",
    roots: ["objective"],
  },
  {
    id: "agents",
    label: "Agents and instructions",
    description: "Roles, prompts, tools, handoffs, and model profile assignments.",
    roots: ["agents", "customization.agentModelProfiles"],
  },
];
```

Complete the literal registry with all 17 acceptance sections and all paths in `EDITABLE_ROOT_PATHS`.

- [ ] **Step 5: Implement recursive typed controls**

`ConfigField` selects controls by runtime value plus curated hints:

```tsx
if (hint?.enumValues) return <select aria-label={label}>{options}</select>;
if (typeof value === "boolean") return <input aria-label={label} type="checkbox" />;
if (typeof value === "number") return <input aria-label={label} type="number" />;
if (typeof value === "string") {
  return hint?.multiline ? <textarea aria-label={label} /> : <input aria-label={label} />;
}
if (Array.isArray(value)) return <ArrayField value={value} onChange={onChange} />;
return <ObjectField value={value as Record<string, unknown>} onChange={onChange} />;
```

Array controls implement Add, Duplicate, Move up, Move down, and Delete. Reference hints render `<select>` values derived from current declared IDs. JSON Schema and arbitrary JSON values use a validated JSON textarea.

- [ ] **Step 6: Preserve the last valid spec**

`AdvancedStudio` maintains a section draft. “Apply section” calls `applySpecPatches`; failures render path-specific issues and do not call `onChange`. “Reset section” restores roots from the accepted spec.

- [ ] **Step 7: Run tests and verify GREEN**

```powershell
npm.cmd test -- tests/ui/advanced-studio.test.tsx tests/ui/workspace.test.tsx tests/ui/spec-editor.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit**

```powershell
git add src/components/studio-sections.ts src/components/config-field.tsx src/components/advanced-studio.tsx src/components/workspace.tsx src/app/globals.css tests/ui/advanced-studio.test.tsx
git commit -m "feat: add complete Advanced Build studio"
```

### Task 7: Add advisor apply/edit/dismiss and raw-spec synchronization

**Files:**
- Create: `AgentBuilder/src/components/advisor-rail.tsx`
- Create: `AgentBuilder/tests/ui/advisor-rail.test.tsx`
- Modify: `AgentBuilder/src/components/advanced-studio.tsx`
- Modify: `AgentBuilder/src/components/spec-editor.tsx`
- Modify: `AgentBuilder/tests/ui/spec-editor.test.tsx`
- Modify: `AgentBuilder/src/components/workspace.tsx`

**Interfaces:**
- Consumes `AdvisoryFinding[]` and `applySpecPatches`.
- Produces accepted spec updates and `dismissedFindingIds: Set<string>` stored by Workspace.

- [ ] **Step 1: Write failing advisor interaction tests**

```tsx
test("previews and explicitly applies an advisor patch", async () => {
  render(<AdvisorRail spec={spec} findings={[finding]} onChange={onChange} />);
  await userEvent.click(screen.getByRole("button", { name: "Review change" }));
  expect(screen.getByText("budgets.maxTokens")).toBeVisible();
  expect(screen.getByText("8000 → 4000")).toBeVisible();
  expect(onChange).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Apply suggestion" }));
  expect(onChange).toHaveBeenCalledWith(
    expect.objectContaining({ budgets: expect.objectContaining({ maxTokens: 4000 }) }),
  );
});

test("dismisses unchanged advice without mutating the spec", async () => {
  render(<AdvisorRail spec={spec} findings={[finding]} onDismiss={onDismiss} />);
  await userEvent.click(screen.getByRole("button", { name: "Dismiss" }));
  expect(onDismiss).toHaveBeenCalledWith(finding.id);
  expect(onChange).not.toHaveBeenCalled();
});
```

- [ ] **Step 2: Run tests and verify RED**

```powershell
npm.cmd test -- tests/ui/advisor-rail.test.tsx tests/ui/spec-editor.test.tsx
```

Expected: FAIL because advisor controls and shared raw synchronization are absent.

- [ ] **Step 3: Implement advisor rail and diff preview**

Render findings grouped by severity. A diff preview reads current values with `getSpecValue` and displays stable JSON before/after values. Apply only after successful `applySpecPatches`.

- [ ] **Step 4: Route raw edits through the same accepted-spec path**

Change `SpecEditor` to emit only `AgentSpecSchema`-parsed data. Workspace then recomputes:

```ts
function acceptSpec(next: AgentSpec) {
  setSpec(next);
  setCoverage(analyzeRequirements(next));
  setFindings(adviseSpec(next, dismissedFindingIds));
  setTested(false);
  setBuildResult(undefined);
}
```

Mode switching and section navigation use this same state; no component keeps an independent accepted spec.

- [ ] **Step 5: Run tests and verify GREEN**

```powershell
npm.cmd test -- tests/ui/advisor-rail.test.tsx tests/ui/spec-editor.test.tsx tests/ui/advanced-studio.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/components/advisor-rail.tsx src/components/advanced-studio.tsx src/components/spec-editor.tsx src/components/workspace.tsx tests/ui/advisor-rail.test.tsx tests/ui/spec-editor.test.tsx
git commit -m "feat: add explicit Advanced Build advice"
```

### Task 8: Compile customization through HarnessBuilder

**Files:**
- Modify: `HarnessBuilder/src/domain/agent-adapter.ts`
- Modify: `HarnessBuilder/src/domain/target-artifacts.ts`
- Modify: `HarnessBuilder/src/domain/verify.ts`
- Modify: `HarnessBuilder/tests/domain/agent-adapter.test.ts`
- Modify: `HarnessBuilder/tests/domain/generate.test.ts`
- Modify: `HarnessBuilder/tests/domain/verify.test.ts`
- Modify: `AgentBuilder/tests/hardening/contract-compatibility.test.ts`

**Interfaces:**
- Produces generated `agent.config.json`.
- Supported target settings compile into runtime code/config.
- Unsupported framework overrides return a blocking verification gate named `customization-capability`.

- [ ] **Step 1: Write failing compilation and capability tests**

```ts
test("compiles accepted customization into a secret-free runtime config", () => {
  const artifact = buildCustomizedAgent("openai-agents-ts");
  const config = JSON.parse(fileContent(artifact, "agent.config.json"));
  expect(config).toMatchObject({
    modelProfiles: [
      {
        id: "primary",
        provider: "groq",
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
      },
    ],
    observability: { traceLevel: "actions", redactSensitive: true },
  });
  expect(fileContent(artifact, "agent.config.json")).not.toMatch(/gsk_|sk-proj-/);
});

test("blocks an MCP-only override for a TypeScript Agents target", () => {
  const result = buildAgent({
    ...customizedRequest,
    target: "openai-agents-ts",
    agentSpec: specWithMcpStreamableHttpOverride,
  });
  expect(result.status).toBe("failed");
  expect(result.report.gates).toContainEqual(
    expect.objectContaining({ id: "customization-capability", status: "failed" }),
  );
});
```

- [ ] **Step 2: Run HarnessBuilder tests and verify RED**

```powershell
npm.cmd test -- tests/domain/agent-adapter.test.ts tests/domain/generate.test.ts tests/domain/verify.test.ts
```

Expected: FAIL because customization is not compiled or verified.

- [ ] **Step 3: Emit deterministic `agent.config.json`**

Serialize only parsed customization plus non-secret credential reference names. Sort record keys and referenced lists for stable checksums. Add the file through `applyTargetArtifact`.

- [ ] **Step 4: Compile supported target controls**

For TypeScript and Python Agents targets:

- map `modelProfiles[primary]` model and sampling configuration into generated runtime options;
- map `budgets.maxSteps`;
- emit guardrail and hook registration stubs that fail closed until referenced handlers are connected;
- configure tracing disable/name override;
- document required credential reference names in `.env.example`.

For MCP:

- map stdio or streamable HTTP transport;
- preserve stdout rules for stdio;
- emit declared tool timeouts, approvals, and connection-required handlers.

For portable spec:

- retain the full validated v1.1 document without capability loss.

- [ ] **Step 5: Add the customization capability verification gate**

Create `verifyCustomizationSupport(spec, target)` returning evidence for every override and policy. The gate passes only when each setting is compiled, portable, or explicitly connection-required. It fails for target-incompatible overrides and unknown credential reference formats.

- [ ] **Step 6: Run both integration suites and verify GREEN**

```powershell
cd C:\Users\swagg\.claude\HarnessBuilder
npm.cmd test -- tests/domain/agent-adapter.test.ts tests/domain/generate.test.ts tests/domain/verify.test.ts tests/domain/agent-contract-matrix.test.ts
cd C:\Users\swagg\.claude\AgentBuilder
npm.cmd test -- tests/hardening/contract-compatibility.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit HarnessBuilder**

```powershell
git add src/domain/agent-adapter.ts src/domain/target-artifacts.ts src/domain/verify.ts tests/domain/agent-adapter.test.ts tests/domain/generate.test.ts tests/domain/verify.test.ts
git commit -m "feat: compile Agentify customization settings"
```

- [ ] **Step 8: Commit Agentify contract coverage**

```powershell
git add tests/hardening/contract-compatibility.test.ts
git commit -m "test: cover customized HarnessBuilder builds"
```

### Task 9: Add full browser and independent post-feature hardening

**Files:**
- Modify: `AgentBuilder/e2e/agent-builder.spec.ts`
- Modify: `AgentBuilder/e2e/failure-recovery.spec.ts`
- Create: `AgentBuilder/tests/hardening/customization-coverage.test.ts`
- Create: `AgentBuilder/tests/hardening/customization-roundtrip.test.ts`
- Create: `AgentBuilder/tests/hardening/advisor-mutation.test.ts`
- Modify: `AgentBuilder/README.md`
- Modify: `AgentBuilder/TRUST_BOUNDARIES.md`

**Interfaces:**
- Black-box acceptance covers Quick follow-ups, safe defaults, every Advanced section, advisor application, raw round-trip, HarnessBuilder output, and responsive mode switching.

- [ ] **Step 1: Write browser tests for both modes**

```ts
test("Quick Build resolves missing decisions with safe suggestions", async ({ page }) => {
  await installPlanWithMissingDecision(page);
  await page.goto("/");
  await submitPrompt(page);
  await expect(page.getByRole("heading", { name: "Which CRM should receive updates?" })).toBeVisible();
  await page.getByRole("button", { name: /start read-only without a crm write/i }).click();
  await expect(page.getByRole("status").first()).toContainText("Verified package ready");
});

test("Advanced Build edits configuration and applies explicit advice", async ({ page }) => {
  await installSuccessfulPipeline(page);
  await page.goto("/");
  await submitPrompt(page);
  await page.getByRole("radio", { name: "Advanced Build" }).click();
  await page.getByRole("button", { name: "Observability" }).click();
  await page.getByLabel("Trace level").selectOption("errors");
  await page.getByRole("button", { name: "Apply section" }).click();
  await expect(page.getByRole("region", { name: "Advanced advisor" })).toBeVisible();
});
```

- [ ] **Step 2: Run browser tests and verify RED for uncovered journeys**

```powershell
npm.cmd run test:e2e
```

Expected: new tests FAIL until final integration details and selectors are complete.

- [ ] **Step 3: Add independent schema-path coverage**

Traverse a materialized spec and compare every leaf path to either:

- a typed studio root in `EDITABLE_ROOT_PATHS`;
- a declared derived read-only path;
- raw AgentSpec coverage.

Fail if a new contract domain is not assigned.

- [ ] **Step 4: Add randomized round-trip tests**

Generate bounded valid variations for every customization array and enum, apply a typed patch, serialize through `SpecEditor`, reparse, and assert deep equality.

- [ ] **Step 5: Add advisor mutation tests**

For every blocking rule, mutate the unsafe condition away and assert the finding disappears; mutate the recommended patch to an invalid value and assert `applySpecPatches` rejects it.

- [ ] **Step 6: Finish responsive and accessibility styling**

Verify at 1440×1100, 1024×900, and 390×844. Section navigation becomes a horizontally scrollable tab row or labelled drawer below 980px; controls remain single-column below 640px.

- [ ] **Step 7: Update README and trust boundaries**

Document:

- Quick/Advanced shared-spec behavior;
- exact follow-up and safe-default policy;
- every Advanced section;
- advisor non-mutation guarantees;
- credential reference rules;
- which settings compile for each target;
- static verification versus runtime handler connection.

- [ ] **Step 8: Run all Agentify and HarnessBuilder release gates**

```powershell
cd C:\Users\swagg\.claude\AgentBuilder
npm.cmd test
npm.cmd run test:hardening
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd audit --omit=dev
npm.cmd run test:e2e

cd C:\Users\swagg\.claude\HarnessBuilder
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd audit --omit=dev
```

Expected: all PASS and production audits report 0 vulnerabilities.

- [ ] **Step 9: Commit**

```powershell
git add e2e tests/hardening README.md TRUST_BOUNDARIES.md src/app/globals.css
git commit -m "test: harden full Agentify customization"
```

### Task 10: Publish and verify the production release

**Files:**
- No source changes unless verification exposes a regression, in which case start a new focused failing test before repair.

- [ ] **Step 1: Verify clean worktrees and identities**

```powershell
git status -sb
git var GIT_AUTHOR_IDENT
```

Expected: clean and `RoUchiha <79603710+RoUchiha@users.noreply.github.com>`.

- [ ] **Step 2: Push both main branches**

Run the workspace GitHub authentication script first, then push Agentify and HarnessBuilder. Verify local HEAD equals `git ls-remote origin refs/heads/main`.

- [ ] **Step 3: Wait for public CI**

```powershell
gh run list --repo RoUchiha/Agentify --branch main --limit 1
gh run list --repo RoUchiha/HarnessBuilder --branch main --limit 1
```

Expected: both final commits complete with `success`.

- [ ] **Step 4: Deploy HarnessBuilder, then Agentify**

```powershell
npx.cmd --yes vercel@latest --prod --yes
```

Deploy HarnessBuilder first so the v1.1 consumer is live before Agentify submits customized specs.

- [ ] **Step 5: Verify the real hosted API pipeline**

Submit a non-sensitive Quick Build prompt that intentionally omits one material integration choice, answer the recommended read-only option, run Playground, then build all four targets through the production Agentify routes. Assert each returns a manifest with `agentSpecVersion`, target, customization capability evidence, and passing report.

- [ ] **Step 6: Verify anonymous Quick and Advanced browser journeys**

Using a clean Chrome context:

- load `https://agentify-wine.vercel.app`;
- confirm zero console errors and failed resources;
- complete a Quick Build follow-up to verified download;
- switch to Advanced Build, edit model, tool, budget, observability, and target settings;
- apply one advisor suggestion;
- inspect raw JSON for round-trip preservation;
- build and download the customized package.

- [ ] **Step 7: Scan production runtime errors**

```powershell
npx.cmd --yes vercel@latest logs https://agentify-wine.vercel.app --since 1h --level error
npx.cmd --yes vercel@latest logs https://harnessbuilder.vercel.app --since 1h --level error
```

Expected: no uninvestigated errors.

- [ ] **Step 8: Record release evidence**

Report final URLs, exact commits, CI links, test totals, build targets, browser evidence, and the truthful boundary that generated external handlers remain connection-required until a developer supplies them.

## Plan self-review

- Every design-spec acceptance criterion maps to Tasks 1 through 10.
- Quick follow-ups, safe defaults, all Advanced domains, raw round-trip, advice, HarnessBuilder compilation, and production verification are explicitly covered.
- Agentify and HarnessBuilder type names match across tasks.
- The envelope version and metadata version are not conflated.
- Credentials are references only.
- Unsupported settings fail a named capability gate.
- No placeholders, deferred implementation steps, or “similar to” shortcuts remain.
- Each production task has a red test, focused green check, and commit.
