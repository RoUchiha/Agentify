# Agent Builder MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a separate Agent Builder web application that converts a natural-language request into a validated `AgentSpec`, supports visual refinement and real provider-backed playground runs, then sends the immutable spec to HarnessBuilder and returns a verified downloadable agent package.

**Architecture:** Agent Builder is a Next.js control plane with pure TypeScript domain modules for contracts, policy, provider selection, graph derivation, and artifact selection. Server routes keep provider credentials out of the browser. HarnessBuilder gains a versioned `AgentSpec` adapter and build route that maps the portable contract into its existing deterministic planning, generation, and verification pipeline.

**Tech Stack:** Node.js 22, Next.js 15.5.21, React 19.1, TypeScript 5.8, Zod 4, YAML 2.8, Vitest 4, Testing Library, Playwright, ESLint 9, Prettier 3, Groq OpenAI-compatible API, Ollama HTTP API.

## Global Constraints

- The applications remain separate repositories and independently deployable.
- `AgentSpec v1` is the provider-neutral source of truth; model output is untrusted until deterministic validation and policy checks pass.
- Single-agent mode is the default; Advanced exposes teams, handoffs, routing, state, approvals, and workflow nodes against the same spec.
- Hybrid is the recommended execution mode, with functional Local and Cloud choices.
- Free Auto uses an eligible local Ollama model first, then configured Groq Free Cloud, then an honest connection-required state.
- Supported artifact targets are `openai-agents-ts`, `openai-agents-python`, `mcp-server`, and `portable-spec`.
- Credentials are opaque references and never enter browser state, generated source, logs, reports, or archives.
- Low-risk complete specs continue automatically; ambiguous authorization or high-risk/destructive capabilities return `needs_attention`.
- No production behavior is implemented before a focused test has been observed failing for its absence.
- The final hardening suite is authored after the integrated product and converts every discovered failure into a regression-first repair.

---

## File map

### AgentBuilder repository

- `src/domain/agent-spec.ts`: canonical Zod contract and inferred TypeScript types.
- `src/domain/normalize.ts`: prompt-planner payload normalization and assumption separation.
- `src/domain/policy.ts`: risk, approval, and `needs_attention` decisions.
- `src/domain/artifact-selector.ts`: deterministic target recommendation and override validation.
- `src/domain/graph.ts`: lossless `AgentSpec` to visual graph projection and edit application.
- `src/providers/types.ts`: provider-neutral planning and playground interfaces.
- `src/providers/free-auto.ts`: Ollama/Groq/provider selection with explicit availability evidence.
- `src/providers/groq.ts`: Groq structured planning and playground adapter.
- `src/providers/ollama.ts`: Ollama structured planning and playground adapter.
- `src/server/planner.ts`: provider resolution, prompt processing, and validated plan response.
- `src/server/playground.ts`: bounded provider-backed draft execution and trace construction.
- `src/connectors/harness-builder.ts`: versioned build submission and error normalization.
- `src/app/api/plan/route.ts`: server-only prompt-to-spec endpoint.
- `src/app/api/playground/route.ts`: server-only draft execution endpoint.
- `src/app/api/build/route.ts`: server-only HarnessBuilder proxy.
- `src/components/*`: prompt intake, progressive workflow, visual canvas, spec editor, Playground, build timeline, evidence, and export UI.
- `src/lib/zip.ts`: deterministic client archive writer.
- `tests/domain/*`: spec, policy, provider selection, graph, target, connector, and ZIP behavior.
- `tests/api/*`: route boundary and secret-handling integration tests.
- `tests/ui/*`: workflow and accessibility component tests.
- `e2e/*`: post-build browser and failure-recovery tests.

### HarnessBuilder repository

- `src/domain/agent-spec.ts`: accepted `AgentSpec v1` subset and strict parser.
- `src/domain/agent-adapter.ts`: lossless mapping from `AgentSpec` to `HarnessSpec`.
- `src/domain/agent-build.ts`: idempotent build state and existing pipeline orchestration.
- `src/app/api/v1/agent-builds/route.ts`: versioned build endpoint.
- `tests/domain/agent-adapter.test.ts`: mapping, risk, target, and secret behavior.
- `tests/domain/agent-build-route.test.ts`: HTTP contract and failure-state behavior.

---

### Task 1: Bootstrap AgentBuilder and define `AgentSpec v1`

**Files:**
- Create: `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, `.prettierrc.json`, `.gitignore`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- Create: `src/domain/agent-spec.ts`, `src/domain/demo.ts`
- Test: `tests/setup.ts`, `tests/domain/agent-spec.test.ts`, `tests/ui/page.test.tsx`

**Interfaces:**
- Produces `AgentSpecSchema`, `AgentSpec`, `AgentSpecParseResult`, `ArtifactTarget`, `DeploymentMode`, and `demoAgentSpec`.
- Later tasks consume the exact `AgentSpec` type and `AgentSpecSchema.safeParse(input)` contract.

- [ ] **Step 1: Add build/test configuration and write the failing contract tests**

```ts
test("accepts a bounded single-agent specification", () => {
  const result = AgentSpecSchema.safeParse(demoAgentSpec);
  expect(result.success).toBe(true);
});

test("rejects write tools without a required approval", () => {
  const result = AgentSpecSchema.safeParse({
    ...demoAgentSpec,
    tools: [{ ...demoAgentSpec.tools[0], mode: "write", approval: "none" }],
  });
  expect(result.success).toBe(false);
});

test("renders the prompt-first product entrypoint", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { name: /describe the agent you need/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm.cmd test -- tests/domain/agent-spec.test.ts tests/ui/page.test.tsx`

Expected: FAIL because `AgentSpecSchema`, `demoAgentSpec`, and the page do not exist.

- [ ] **Step 3: Implement the strict contract and minimal page**

Define enums for deployment, topology, risk, tool mode, approval, provider, and artifact target. Define nested schemas for `objective`, `agents`, `models`, `tools`, `knowledge`, `state`, `workflow`, `budgets`, `runtime`, `evaluations`, and `decisions`. Add semantic refinements for at least one success criterion, bounded retries and budgets, declared workflow nodes, a termination node, and approval-required writes.

```ts
export const AgentSpecSchema = z.object({
  metadata: MetadataSchema,
  objective: ObjectiveSchema,
  agents: z.array(AgentSchema).min(1),
  models: ModelPolicySchema,
  tools: z.array(ToolSchema),
  knowledge: z.array(KnowledgeSchema),
  state: z.array(StateSchema),
  workflow: WorkflowSchema,
  budgets: BudgetSchema,
  runtime: RuntimeSchema,
  evaluations: z.array(EvaluationSchema).min(1),
  decisions: DecisionSchema,
}).strict().superRefine(enforceSemanticRules);

export type AgentSpec = z.infer<typeof AgentSpecSchema>;
```

- [ ] **Step 4: Run the focused tests and full typecheck**

Run: `npm.cmd test -- tests/domain/agent-spec.test.ts tests/ui/page.test.tsx`

Expected: PASS.

Run: `npm.cmd run typecheck`

Expected: exit 0.

- [ ] **Step 5: Commit**

```powershell
git add package.json package-lock.json tsconfig.json next.config.ts vitest.config.ts eslint.config.mjs .prettierrc.json .gitignore src tests
git commit -m "feat: define AgentSpec contract and app foundation"
```

### Task 2: Implement provider adapters and Free Auto

**Files:**
- Create: `src/providers/types.ts`, `src/providers/free-auto.ts`, `src/providers/groq.ts`, `src/providers/ollama.ts`
- Create: `src/server/planner.ts`, `src/app/api/plan/route.ts`
- Test: `tests/domain/free-auto.test.ts`, `tests/domain/planner.test.ts`, `tests/api/plan-route.test.ts`

**Interfaces:**
- Consumes `AgentSpecSchema` and `AgentSpec`.
- Produces `PlannerProvider`, `ProviderAvailability`, `PlannerResult`, `resolveFreeAuto(input)`, `planAgent(request, dependencies)`, and `POST /api/plan`.

- [ ] **Step 1: Write failing provider-selection and planning tests**

```ts
test("selects a capable local Ollama model before Groq", () => {
  expect(resolveFreeAuto({ ollama: { available: true, model: "qwen3" }, groq: { available: true } }))
    .toMatchObject({ provider: "ollama", reason: expect.stringMatching(/local/i) });
});

test("selects Groq when Ollama is unavailable", () => {
  expect(resolveFreeAuto({ ollama: { available: false }, groq: { available: true } }).provider)
    .toBe("groq");
});

test("returns connection_required when neither free provider is usable", () => {
  expect(resolveFreeAuto({ ollama: { available: false }, groq: { available: false } }).status)
    .toBe("connection_required");
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm.cmd test -- tests/domain/free-auto.test.ts tests/domain/planner.test.ts tests/api/plan-route.test.ts`

Expected: FAIL because provider interfaces and selection do not exist.

- [ ] **Step 3: Implement real provider boundaries**

`GroqPlanner` calls `https://api.groq.com/openai/v1/chat/completions` with `response_format: { type: "json_object" }`, a bounded timeout, and `Authorization` from server-only `GROQ_API_KEY`. `OllamaPlanner` calls the configured loopback runner URL and requests JSON output. Both parse response text as unknown JSON and pass it through `AgentSpecSchema`.

`resolveFreeAuto` never changes from local to cloud without returning the selected data boundary. It exposes `retryAfterSeconds` for provider `429` responses.

- [ ] **Step 4: Run tests and typecheck**

Run: `npm.cmd test -- tests/domain/free-auto.test.ts tests/domain/planner.test.ts tests/api/plan-route.test.ts`

Expected: PASS.

Run: `npm.cmd run typecheck`

Expected: exit 0.

- [ ] **Step 5: Commit**

```powershell
git add src/providers src/server/planner.ts src/app/api/plan tests/domain tests/api
git commit -m "feat: add Free Auto planning providers"
```

### Task 3: Add deterministic policy, artifact selection, and graph projection

**Files:**
- Create: `src/domain/policy.ts`, `src/domain/artifact-selector.ts`, `src/domain/graph.ts`, `src/domain/normalize.ts`
- Test: `tests/domain/policy.test.ts`, `tests/domain/artifact-selector.test.ts`, `tests/domain/graph.test.ts`, `tests/domain/normalize.test.ts`

**Interfaces:**
- Consumes `AgentSpec`.
- Produces `evaluateSpec(spec): SpecDecision`, `selectArtifact(spec): ArtifactSelection`, `toVisualGraph(spec): VisualGraph`, `applyGraphEdit(spec, edit): AgentSpec`, and `normalizePlannerPayload(input): AgentSpecParseResult`.

- [ ] **Step 1: Write failing decision tests**

```ts
test("continues automatically for a complete low-risk agent", () => {
  expect(evaluateSpec(demoAgentSpec)).toMatchObject({ status: "ready", approvals: [] });
});

test("requires attention for a destructive tool without user confirmation", () => {
  expect(evaluateSpec(destructiveSpec)).toMatchObject({
    status: "needs_attention",
    issues: [expect.objectContaining({ code: "destructive_authorization_required" })],
  });
});

test.each([
  ["expose every capability through MCP", "mcp-server"],
  ["build a Python data agent", "openai-agents-python"],
  ["build a TypeScript support agent", "openai-agents-ts"],
])("selects a supported target for %s", (_label, target) => {
  expect(selectArtifact(specFor(target)).target).toBe(target);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm.cmd test -- tests/domain/policy.test.ts tests/domain/artifact-selector.test.ts tests/domain/graph.test.ts tests/domain/normalize.test.ts`

Expected: FAIL because the decision modules do not exist.

- [ ] **Step 3: Implement deterministic decisions and lossless graph behavior**

Risk decisions are table-driven from tool mode, risk, external side effects, data classification, and confirmed decisions. Artifact selection uses explicit capability requirements before keyword hints. Graph node identifiers reference spec identifiers; graph edits change only the targeted typed field and revalidate the entire spec.

- [ ] **Step 4: Run the focused tests and mutation-sensitive policy checks**

Run: `npm.cmd test -- tests/domain/policy.test.ts tests/domain/artifact-selector.test.ts tests/domain/graph.test.ts tests/domain/normalize.test.ts`

Expected: PASS with denial-path assertions for missing approvals and invalid edges.

- [ ] **Step 5: Commit**

```powershell
git add src/domain tests/domain
git commit -m "feat: derive safe agent plans and visual graphs"
```

### Task 4: Add the versioned AgentSpec build API to HarnessBuilder

**Files:**
- Create in HarnessBuilder: `src/domain/agent-spec.ts`, `src/domain/agent-adapter.ts`, `src/domain/agent-build.ts`
- Create in HarnessBuilder: `src/app/api/v1/agent-builds/route.ts`
- Test in HarnessBuilder: `tests/domain/agent-adapter.test.ts`, `tests/domain/agent-build-route.test.ts`
- Modify in HarnessBuilder: `src/domain/generate.ts`, `src/domain/verify.ts`

**Interfaces:**
- Consumes an `AgentBuildRequest` with `contractVersion: "1.0"`, immutable `agentSpec`, `target`, `executionProfile`, and `idempotencyKey`.
- Produces `AgentBuildResponse` with `buildId`, `status`, ordered `events`, mapped `HarnessSpec`, `HarnessPlan`, `GeneratedArtifact`, and `VerificationReport`.

- [ ] **Step 1: Write failing adapter and route tests in HarnessBuilder**

```ts
test("maps an AgentSpec into the existing immutable HarnessSpec", () => {
  expect(adaptAgentSpec(demoAgentSpec)).toEqual(expect.objectContaining({
    name: demoAgentSpec.metadata.name,
    objective: demoAgentSpec.objective.goal,
    retryLimit: demoAgentSpec.budgets.retryLimit,
  }));
});

test("returns a packaged build with ordered evidence", async () => {
  const response = await POST(agentBuildRequest(demoAgentSpec));
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.status).toBe("packaged");
  expect(body.events.map((event: { status: string }) => event.status)).toEqual([
    "accepted", "planning", "generating_tests", "verifying_red",
    "generating_implementation", "testing", "hardening", "verifying", "packaged",
  ]);
  expect(body.report.status).toBe("passed");
});
```

- [ ] **Step 2: Run HarnessBuilder tests and verify RED**

Run from HarnessBuilder: `npm.cmd test -- tests/domain/agent-adapter.test.ts tests/domain/agent-build-route.test.ts`

Expected: FAIL because the adapter and API route do not exist.

- [ ] **Step 3: Implement strict parsing, mapping, target metadata, and build orchestration**

Use the same `AgentSpec v1` shape for the accepted subset and reject unknown/secret-bearing fields. Map tools into Harness actions, classifications into existing data classes, success criteria directly, and adaptive runtime into the existing planner. Extend artifact metadata with `agentSpecVersion`, `artifactTarget`, and test-lifecycle evidence. The route parses JSON as unknown, rejects unsupported contract versions with supported versions, and never logs the request body.

- [ ] **Step 4: Run focused and full HarnessBuilder verification**

Run: `npm.cmd test -- tests/domain/agent-adapter.test.ts tests/domain/agent-build-route.test.ts`

Expected: PASS.

Run: `npm.cmd test`

Expected: all existing and new tests pass.

Run: `npm.cmd run typecheck`

Expected: exit 0.

- [ ] **Step 5: Commit in HarnessBuilder**

```powershell
git add src/domain src/app/api/v1/agent-builds tests/domain
git commit -m "feat: accept versioned AgentSpec builds"
```

### Task 5: Build the Quick and Advanced creation workspace

**Files:**
- Create: `src/components/workspace.tsx`, `src/components/prompt-intake.tsx`, `src/components/progress-rail.tsx`
- Create: `src/components/design-summary.tsx`, `src/components/visual-canvas.tsx`, `src/components/spec-editor.tsx`
- Create: `src/components/provider-status.tsx`, `src/components/deployment-picker.tsx`
- Modify: `src/app/page.tsx`, `src/app/globals.css`
- Test: `tests/ui/workspace.test.tsx`, `tests/ui/visual-canvas.test.tsx`, `tests/ui/spec-editor.test.tsx`

**Interfaces:**
- Consumes `POST /api/plan`, `AgentSpec`, `VisualGraph`, `SpecDecision`, and `ArtifactSelection`.
- Produces the user-visible stages `Describe`, `Design`, `Test`, `Build`, and `Deliver`, plus a validated immutable spec passed to later tasks.

- [ ] **Step 1: Write failing workflow tests**

```tsx
test("creates a design from one natural-language request", async () => {
  render(<Workspace planner={successfulPlanner} />);
  await userEvent.type(screen.getByLabelText(/what should your agent accomplish/i), "Triage support tickets");
  await userEvent.click(screen.getByRole("button", { name: /design my agent/i }));
  expect(await screen.findByText("Support triage")).toBeInTheDocument();
  expect(screen.getByText(/ready to test/i)).toBeInTheDocument();
});

test("Advanced reveals the canvas and raw spec without losing the same spec", async () => {
  render(<Workspace planner={successfulPlanner} />);
  await createDesign();
  await userEvent.click(screen.getByRole("switch", { name: /advanced/i }));
  expect(screen.getByRole("region", { name: /agent canvas/i })).toBeInTheDocument();
  expect(screen.getByRole("textbox", { name: /agent spec/i })).toHaveValue(expect.stringContaining('"version": "1.0"'));
});
```

- [ ] **Step 2: Run UI tests and verify RED**

Run: `npm.cmd test -- tests/ui/workspace.test.tsx tests/ui/visual-canvas.test.tsx tests/ui/spec-editor.test.tsx`

Expected: FAIL because the workspace components do not exist.

- [ ] **Step 3: Implement the guided workspace**

Use a reducer with explicit states: `draft`, `planning`, `needs_attention`, `ready`, `testing`, `building`, `packaged`, and `failed`. Quick shows the prompt, provider and deployment boundary, design cards, assumptions, and target recommendation. Advanced shows the typed canvas, target override, provider policy, topology, budgets, and raw spec editor. JSON edits parse as unknown and update only after validation.

- [ ] **Step 4: Run UI, accessibility, and type checks**

Run: `npm.cmd test -- tests/ui`

Expected: PASS with accessible labels, status roles, and keyboard-operable controls.

Run: `npm.cmd run typecheck`

Expected: exit 0.

- [ ] **Step 5: Commit**

```powershell
git add src/components src/app tests/ui
git commit -m "feat: add prompt-first agent design workspace"
```

### Task 6: Implement the provider-backed Playground

**Files:**
- Create: `src/server/playground.ts`, `src/app/api/playground/route.ts`
- Create: `src/components/playground.tsx`, `src/components/trace-timeline.tsx`, `src/components/operator-controls.tsx`
- Test: `tests/domain/playground.test.ts`, `tests/api/playground-route.test.ts`, `tests/ui/playground.test.tsx`

**Interfaces:**
- Consumes a validated `AgentSpec`, test input, and resolved `PlannerProvider`.
- Produces `PlaygroundRun` with status, output, ordered trace events, usage, latency, artifacts, approvals, and terminal reason.

- [ ] **Step 1: Write failing bounded-run and UI tests**

```ts
test("records provider output and a terminal trace without inventing tool calls", async () => {
  const run = await executePlayground({ spec: demoAgentSpec, input: "Ticket 42" }, providerWithoutTools);
  expect(run.status).toBe("completed");
  expect(run.trace.map((event) => event.type)).toEqual(["run_started", "model_response", "run_completed"]);
  expect(run.trace.some((event) => event.type === "tool_called")).toBe(false);
});

test("pauses before a required write tool", async () => {
  const run = await executePlayground({ spec: approvedWriteSpec, input: "Close ticket 42" }, providerRequestingWrite);
  expect(run.status).toBe("needs_approval");
  expect(run.pendingApproval?.toolId).toBe("close_ticket");
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm.cmd test -- tests/domain/playground.test.ts tests/api/playground-route.test.ts tests/ui/playground.test.tsx`

Expected: FAIL because Playground execution and components do not exist.

- [ ] **Step 3: Implement bounded real execution**

The provider receives only the accepted instructions, user input, and tool descriptions. Tool requests are validated against the spec. Read-only demo tools use explicitly registered handlers; write tools stop at an approval checkpoint. The route enforces input size, run timeout, step budget, and redaction. The UI streams or renders real trace data and offers retry, steer, approve, reject, and terminate controls only when their state permits them.

- [ ] **Step 4: Run focused tests and full suite**

Run: `npm.cmd test -- tests/domain/playground.test.ts tests/api/playground-route.test.ts tests/ui/playground.test.tsx`

Expected: PASS.

Run: `npm.cmd test`

Expected: all current tests pass.

- [ ] **Step 5: Commit**

```powershell
git add src/server/playground.ts src/app/api/playground src/components tests
git commit -m "feat: add observable agent Playground"
```

### Task 7: Connect HarnessBuilder, expose evidence, and download verified artifacts

**Files:**
- Create: `src/connectors/harness-builder.ts`, `src/app/api/build/route.ts`
- Create: `src/components/build-timeline.tsx`, `src/components/verification-report.tsx`, `src/components/artifact-delivery.tsx`
- Create: `src/lib/zip.ts`
- Modify: `src/components/workspace.tsx`
- Test: `tests/domain/harness-builder.test.ts`, `tests/domain/zip.test.ts`, `tests/api/build-route.test.ts`, `tests/ui/build-delivery.test.tsx`

**Interfaces:**
- Consumes immutable `AgentSpec`, target, execution profile, `HARNESS_BUILDER_URL`, and optional server-only service token.
- Produces normalized `BuildResult`, ordered status evidence, verification report, artifact file preview, JSON/YAML exports, and a verified ZIP download.

- [ ] **Step 1: Write failing connector and delivery tests**

```ts
test("submits the immutable spec with a stable idempotency key", async () => {
  const result = await buildAgent({ spec: demoAgentSpec, target: "openai-agents-ts" }, fakeTransport);
  expect(fakeTransport.lastRequest.headers.get("idempotency-key")).toMatch(/^[a-f0-9]{64}$/);
  expect(result.status).toBe("packaged");
});

test("never enables verified download for a failed report", () => {
  render(<ArtifactDelivery result={failedBuild} />);
  expect(screen.getByRole("button", { name: /download verified/i })).toBeDisabled();
});

test("creates a ZIP whose entries match the artifact manifest", () => {
  expect(listZipEntries(createZip(passedBuild.artifact))).toEqual(passedBuild.artifact.manifest.files);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npm.cmd test -- tests/domain/harness-builder.test.ts tests/domain/zip.test.ts tests/api/build-route.test.ts tests/ui/build-delivery.test.tsx`

Expected: FAIL because connector, ZIP, and delivery components do not exist.

- [ ] **Step 3: Implement the direct build pipeline**

The server route sends the contract version, target, execution profile, trace ID, and deterministic SHA-256 idempotency key. It uses a server-only bearer token when configured. Structured errors preserve `needs_attention`, contract incompatibility, provider cooldown, and failed gate evidence. The UI renders the exact event sequence and only exposes ZIP download when `report.status === "passed"` and `status === "packaged"`.

- [ ] **Step 4: Run integration tests and typecheck**

Run: `npm.cmd test -- tests/domain/harness-builder.test.ts tests/domain/zip.test.ts tests/api/build-route.test.ts tests/ui/build-delivery.test.tsx`

Expected: PASS.

Run: `npm.cmd run typecheck`

Expected: exit 0.

- [ ] **Step 5: Commit**

```powershell
git add src/connectors src/app/api/build src/components src/lib tests
git commit -m "feat: connect verified HarnessBuilder delivery"
```

### Task 8: Add independent post-build hardening, documentation, and live-release readiness

**Files:**
- Create: `playwright.config.ts`, `e2e/agent-builder.spec.ts`, `e2e/failure-recovery.spec.ts`
- Create: `tests/hardening/spec-fuzz.test.ts`, `tests/hardening/policy-mutation.test.ts`, `tests/hardening/contract-compatibility.test.ts`
- Create: `.github/workflows/ci.yml`, `README.md`, `SECURITY.md`, `TRUST_BOUNDARIES.md`
- Modify: `package.json`, `src/app/layout.tsx`, `src/app/globals.css`

**Interfaces:**
- Consumes the completed integrated product.
- Produces independent acceptance evidence, CI enforcement, operator documentation, and a release checklist that requires a real Groq secret only at hosted-demo setup.

- [ ] **Step 1: Author black-box acceptance tests after the integrated product exists**

```ts
test("rejects every malformed graph without losing the last valid spec", () => {
  fc.assert(fc.property(malformedGraphArbitrary, (graph) => {
    const result = importVisualGraph(demoAgentSpec, graph);
    expect(result.success).toBe(false);
    expect(result.previousSpec).toEqual(demoAgentSpec);
  }));
});

test("changing a write action to read causes the approval policy test to fail", () => {
  const mutant = mutateToolMode(approvedWriteSpec, "send_email", "read");
  expect(assertExpectedApprovalBoundary(mutant, approvedWriteSpec)).toEqual({
    passed: false,
    code: "approval_boundary_changed",
  });
});
```

Browser scenarios cover Quick creation, Advanced canvas/spec equivalence, Playground execution, required approval, HarnessBuilder build, ZIP download, invalid provider, `429` cooldown, unavailable runner, failed gate, cancellation, and recovery.

- [ ] **Step 2: Run the new hardening tests and record every failure**

Run: `npm.cmd run test:hardening`

Expected: failures are allowed only as newly discovered product gaps; record each exact failing assertion before repairs.

Run: `npm.cmd run test:e2e`

Expected: failures are allowed only as newly discovered product gaps; capture screenshots and traces.

- [ ] **Step 3: Repair each discovered issue through a regression-first cycle**

For every failure, keep the hardening test, add a smaller focused regression when needed, verify it fails against the defect, implement the minimal correction, and rerun both the focused test and complete hardening suite.

- [ ] **Step 4: Write complete operator and trust-boundary documentation**

Document real versus unavailable behavior, Free Auto resolution, Groq and Ollama setup, local runner pairing, deployment modes, HarnessBuilder connection, generated targets, test lifecycle, approval policy, secret handling, troubleshooting, exact verification commands, and live-demo limitations.

- [ ] **Step 5: Run the final release gate**

AgentBuilder:

```powershell
npm.cmd test
npm.cmd run test:hardening
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd audit --omit=dev
```

HarnessBuilder:

```powershell
npm.cmd test
npm.cmd run typecheck
npm.cmd run lint
npm.cmd run format:check
npm.cmd run build
npm.cmd audit --omit=dev
```

Integrated browser:

```powershell
npm.cmd run test:e2e
```

Expected: every command exits 0; tests report zero failures; production builds succeed; production dependency audit reports zero vulnerabilities; browser traces contain no unexpected console or network errors.

- [ ] **Step 6: Commit**

```powershell
git add e2e tests/hardening .github README.md SECURITY.md TRUST_BOUNDARIES.md package.json playwright.config.ts src
git commit -m "test: harden and document Agent Builder release"
```

---

## Plan self-review

- **Spec coverage:** Tasks 1–3 implement the portable contract, Free Auto, risk decisions, adaptive targets, and visual projection. Task 4 implements the direct HarnessBuilder boundary. Tasks 5–7 implement the researched prompt, canvas, Playground, evidence, and delivery journey. Task 8 implements the independently authored post-build suite, security documentation, CI, and release verification.
- **Test timing:** Every production behavior in Tasks 1–7 has a named RED step before implementation. Task 8 is explicitly authored after integration and turns every failure into a regression-first repair.
- **Type consistency:** `AgentSpec` flows planner -> normalizer -> policy -> graph -> Playground -> connector. `AgentBuildRequest` and `AgentBuildResponse` are defined on both sides of the versioned HTTP contract. `ArtifactTarget` uses the same four literal values throughout.
- **Truthfulness:** Provider, tool, local runner, GitHub, test, and delivery states have explicit unavailable or failed behavior; no simulated success path is planned.
- **Scope:** The first release limits provider adapters to OpenAI, Anthropic, Google, Groq, and Ollama at the contract level, with real Free Auto execution through Ollama/Groq. It limits generated targets to four reviewed outputs and defers a public executable marketplace and automatic production hosting.
