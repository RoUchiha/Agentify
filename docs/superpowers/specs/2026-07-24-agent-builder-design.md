# Agentify design

## Decision

Agentify is a separate, spec-driven application that turns one natural-language request into a testable agent design and then sends the accepted design directly to HarnessBuilder for code generation, test execution, verification, and packaging.

The products remain independently deployable. Their integration boundary is a versioned, provider-neutral `AgentSpec` contract and a versioned HarnessBuilder build API. Agentify owns intent discovery, visual refinement, playground testing, and artifact selection. HarnessBuilder remains authoritative for harness planning, source generation, release gates, evidence, and delivery artifacts.

The first release supports single agents by default. A persistent Advanced control reveals multi-agent teams, handoffs, routing, shared state, checkpoints, and workflow orchestration without creating a separate product or specification format.

## Product outcome

A user can describe an agent in ordinary language and receive:

- An editable, versioned `AgentSpec` with explicit assumptions and permissions.
- A visual representation of agents, tools, knowledge, state, routing, approvals, and termination.
- A working playground with observable tool calls, messages, outputs, artifacts, latency, token usage, and failure evidence.
- An automatically selected output target: OpenAI Agents SDK TypeScript, OpenAI Agents SDK Python, MCP server, or portable JSON/YAML `AgentSpec` bundle.
- A HarnessBuilder-produced repository containing source, generated tests, CI, operating instructions, verification evidence, and a downloadable package.
- A clear deployment choice: Hybrid by default, with Local and Cloud alternatives.

The application never calls a project complete merely because a model produced plausible code. Completion requires a valid spec, an accepted risk posture, a passing HarnessBuilder report, and a packaged artifact.

## Research-derived product model

Agentify follows established interaction patterns without copying source code, branding, or proprietary assets:

- Langflow uses a visual workspace, a Playground, logs, API integration, JSON export, MCP exposure, and shareable experiences.
- Flowise Agentflow V2 uses explicit workflow nodes, declared shared state, streaming execution, resumable human-input checkpoints, MCP tools, and reusable subflows.
- AutoGen Studio combines visual and declarative JSON editing, reusable component galleries, direct team testing, artifacts, tool-action visibility, metrics, and configuration export.
- Dify supports full-workflow test runs, isolated node runs, cached-variable editing, and per-node failure logs.

Primary references:

- https://docs.langflow.org/concepts-overview
- https://docs.langflow.org/1.9.0/concepts-playground
- https://docs.flowiseai.com/using-flowise/agentflowv2
- https://microsoft.github.io/autogen/stable/user-guide/autogenstudio-user-guide/usage.html
- https://docs.dify.ai/en/guides/application-orchestrate/creating-an-application
- https://github.com/openai/openai-agents-js

## Product principles

1. **Prompt first, structure second.** A useful initial agent comes from one outcome-focused prompt. Structured controls progressively reveal the generated design.
2. **The model proposes; contracts decide.** Provider output is parsed as untrusted data. JSON Schema validation, semantic policy, capability negotiation, and deterministic compilation are authoritative.
3. **Single agent before team.** The planner selects multiple agents only when role separation, independent permissions, parallel work, or review boundaries materially improve the outcome.
4. **Safe automation, visible intervention.** Complete low-risk specs continue automatically. Material ambiguity, missing authorization, sensitive data, or high-risk actions produce a specific `needs_attention` state.
5. **Portable by construction.** Agent behavior is represented in `AgentSpec`, not trapped in a visual canvas or provider-specific format.
6. **Evidence before delivery.** Tests, build logs, gate results, checksums, and compatibility metadata travel with the artifact.
7. **Truthful execution boundaries.** The interface always identifies where planning, credentials, files, tests, and generated code run.

## User journey

### 1. Describe

The landing workspace asks one primary question: “What should your agent accomplish?” The user may optionally attach supporting files, API descriptions, sample inputs and outputs, MCP server information, evaluation examples, or policy documents.

The default Quick experience asks follow-up questions only when an answer changes permissions, correctness, runtime selection, test design, or delivery. Advanced exposes provider, topology, state, budget, model, tool, and deployment controls.

### 2. Generate

The selected planning provider produces a proposed `AgentSpec`. The application validates it, isolates assumptions from confirmed facts, classifies every capability, chooses a single-agent or team topology, recommends an artifact target, and explains each decision.

The user sees concise design cards first. Advanced can switch between a visual canvas and a raw JSON/YAML spec editor. Both edit the same normalized spec.

### 3. Refine

The visual canvas supports typed nodes for:

- Input and output
- Agent
- Model policy
- Tool
- Knowledge source
- Memory or shared state
- Deterministic transform
- Router or condition
- Human approval
- Subflow
- Termination

Connections are typed. Invalid edges, undeclared state, missing termination, inaccessible tools, and incompatible runtime capabilities fail immediately with actionable remediation.

A component gallery contains reviewed templates for common individual agents, team patterns, tools, policies, and evaluation packs. Imported components are treated as untrusted until their schema, permissions, and provenance pass validation.

### 4. Test in Playground

The Playground runs a draft against user scenarios before a harness build. It supports:

- Chat, form, file, webhook-style, and structured JSON inputs
- Whole-flow runs and isolated component runs
- Editable cached inputs for repeatable debugging
- Live messages, tool calls, approval requests, state changes, artifacts, and terminal conditions
- Pause, resume, steer, retry, take over, and terminate controls
- Trace timelines with latency, token, model, provider, tool, and error attribution
- Positive, negative, boundary, policy, and adversarial scenarios
- A clear distinction between deterministic checks and model-dependent evaluations

Playground runs do not silently weaken policy or change the accepted spec. Any proposed improvement is displayed as a spec diff and must pass validation.

### 5. Build through HarnessBuilder

Selecting **Build verified agent** freezes an immutable spec version and submits it to HarnessBuilder. The visible stages are:

`Accepted -> Planning -> Generating tests -> Verifying red tests -> Generating implementation -> Testing -> Hardening -> Verifying -> Packaged`

The application streams real status and preserves the exact failed stage, requirement, evidence, and remediation when a build cannot proceed.

### 6. Deliver

A passing build exposes:

- Downloadable repository archive
- Portable JSON and YAML specs
- TypeScript or Python package, when selected
- MCP server package and client configuration, when selected
- README, AGENTS.md, environment template, CI, and verification reports
- API integration snippets and local-run instructions
- GitHub delivery only when a real scoped GitHub connection is configured

The demo does not simulate repository publication or provider execution.

## System architecture

### Agentify control plane

- **Next.js application:** project workspace, guided intake, visual editor, Playground, run history, evidence viewer, and delivery controls.
- **Planner service:** provider-neutral structured-output interface for OpenAI, Anthropic, Google, Groq, and Ollama adapters.
- **Spec service:** schema parsing, semantic validation, normalization, diffing, versioning, compatibility checks, and assumption tracking.
- **Policy service:** permission classification, risk decisions, approval requirements, secret boundaries, and data-use enforcement.
- **Artifact selector:** deterministic capability matching for TypeScript Agents SDK, Python Agents SDK, MCP server, and portable spec outputs.
- **Playground runtime:** bounded draft execution with explicit state, traces, approvals, cancellation, and redacted evidence.
- **HarnessBuilder connector:** version negotiation, authenticated submission, idempotency, status streaming, report retrieval, and artifact download.

### Local runner

Hybrid and Local modes use a loopback-only runner bound to `127.0.0.1`. It owns:

- Ollama detection and local model access
- Local file access granted by the user
- Local provider-secret references
- Playground tool execution
- HarnessBuilder job execution or forwarding
- Sandboxed tests and package assembly

The hosted browser never receives raw local secrets. The runner uses per-session authorization, an origin allowlist, short-lived pairing tokens, request-size limits, and explicit capability grants.

### Cloud execution

Cloud mode uses server-side provider credentials, ephemeral build workspaces, a durable idempotent job state, bounded retries, redacted logs, tenant-scoped authorization, and deny-by-default egress. The public demo uses Groq Free Cloud only after a deployment secret is configured. Other providers are user-selectable adapters but are not represented as working without valid credentials.

### Persistence

The first release stores non-secret project metadata, spec versions, run status, and redacted reports. Provider credentials remain in the local OS credential store for Local/Hybrid mode or deployment secret storage for Cloud mode. Generated archives and raw user attachments are ephemeral by default and receive explicit retention controls before durable storage is introduced.

## `AgentSpec v1`

`AgentSpec` is defined by versioned JSON Schema and OpenAPI documents. TypeScript and Python types are generated from those definitions.

Required domains are:

- `metadata`: spec version, identifier, name, description, timestamps, provenance, and revision
- `objective`: goal, task classes, success criteria, failure conditions, inputs, and outputs
- `agents`: role, instructions, allowed context, tools, handoffs, and completion responsibility
- `models`: capability requirements, allowed providers, preferred provider, model policy, and fallback policy
- `tools`: typed input/output contracts, credential references, permissions, risk, timeout, idempotency, and approval policy
- `knowledge`: source type, location reference, classification, access, provenance, freshness, and retention
- `state`: declared keys, schemas, visibility, initialization, persistence, and redaction
- `workflow`: nodes, typed edges, routing, loops, parallelism, subflows, checkpoints, and termination
- `budgets`: step, retry, time, token, cost, and concurrency limits
- `runtime`: artifact target, deployment mode, sandbox requirements, and capability requirements
- `evaluations`: scenarios, fixtures, rubrics, deterministic assertions, model-graded thresholds, and provenance
- `decisions`: confirmed choices, model assumptions, warnings, unresolved items, and required approvals

User text remains data. It is independently escaped for JSON, YAML, TypeScript, Python, shell, Markdown, and generated configuration contexts.

## HarnessBuilder integration contract

HarnessBuilder adds:

`POST /api/v1/agent-builds`

The request includes:

- Immutable `AgentSpec`
- Requested artifact target
- Execution profile
- Client and contract versions
- Idempotency key
- Trace and project identifiers

The response returns a build identifier and negotiated contract version. Status is retrieved through resumable server-sent events with polling fallback.

Build states are:

- `accepted`
- `planning`
- `generating_tests`
- `verifying_red`
- `generating_implementation`
- `testing`
- `hardening`
- `verifying`
- `packaged`
- `needs_attention`
- `failed`
- `cancelled`

Cloud communication uses short-lived audience-bound service tokens. Local communication uses the paired loopback runner. Browser code never stores the HarnessBuilder service credential.

Every retry is idempotent. A contract mismatch returns supported versions and a migration explanation. A failed gate returns the requirement, evidence, affected files, retry safety, and remediation. The connector never converts a failed state into a successful UI state.

## Provider and deployment selection

### Free Auto default

Free Auto resolves providers in this order:

1. Use local Ollama when the runner is paired, a suitable installed model is available, and the user permits local execution.
2. Otherwise use Groq Free Cloud when the server-side key is configured and current rate-limit health permits the request.
3. Otherwise show a guided connection state; do not substitute fabricated planner output.

Rate-limit responses honor provider `Retry-After` data, show the numeric cooldown, and offer a compatible provider switch. Provider fallback never changes data residency or cost without confirmation.

### Provider-neutral adapters

OpenAI, Anthropic, Google, Groq, and Ollama implement one internal planner interface. Each adapter declares structured-output support, tool capability, context limits, data-processing location, cost class, and credential requirements. The selector rejects incompatible choices rather than pretending providers are equivalent.

### Execution modes

- **Hybrid, default:** hosted interface plus local runner for local files, secrets, tools, Ollama, and build execution; cloud planning remains optional and explicit.
- **Local:** interface, planner, Playground, HarnessBuilder, tests, and artifacts remain local.
- **Cloud:** planning, Playground, build, and artifacts run in isolated cloud services with explicit data and cost disclosure.

## Security and trust boundaries

- Natural-language prompts, files, imported components, model responses, tool outputs, and HarnessBuilder responses are untrusted inputs.
- Credentials are represented only by opaque references. Secrets are excluded from prompts unless a provider explicitly requires them, never enter generated source, and are redacted from logs and reports.
- Tools are least-privilege, schema-constrained, time-bounded, auditable, and disabled unless declared in the accepted spec.
- Write, financial, destructive, external-message, or irreversible capabilities require explicit policy. High-risk actions require runtime approval even when build delivery is automatic.
- URLs and remote integrations enforce HTTPS, host allowlists where appropriate, private-network blocking, redirect limits, DNS rebinding defenses, response-size limits, and timeouts.
- Imported templates and components record source, version, digest, license metadata, permissions, and validation status.
- Code and tools execute only in constrained local or ephemeral cloud sandboxes. Network and filesystem access are deny-by-default capability grants.
- Every spec change, approval, provider selection, run, tool decision, build stage, gate result, and delivery action emits a redacted audit event.
- Multi-tenant cloud data is authorization-scoped by tenant, project, spec, run, and artifact identifiers.

## Error handling and operator control

Expected failures are first-class states:

- **Planner output invalid:** attempt bounded schema repair, then show the exact invalid fields and preserve the user prompt.
- **Provider unavailable or limited:** show provider, status, cooldown, retry safety, and compatible alternatives.
- **Local runner unavailable:** provide diagnostics for pairing, version, port, origin, Ollama, HarnessBuilder health, and permissions.
- **Spec needs attention:** show one material decision at a time with its impact and safe recommendation.
- **Playground tool denied:** preserve trace evidence and offer permission remediation; never auto-expand access.
- **Contract incompatible:** show both versions, supported migration path, and which app needs updating.
- **Harness build failed:** show the exact stage, failed gate, evidence, affected requirement, and whether retry is safe.
- **User interruption:** pause, resume, steer, take over, cancel, or terminate without losing the last consistent checkpoint.

Retries are bounded and visible. Deterministic failures are not retried without a relevant input change.

## Testing strategy

Testing applies both to Agentify itself and to every generated agent.

### Wave 1: tests before product code

Before each production unit exists, write and run a focused failing test for:

- `AgentSpec` parsing, normalization, semantic validation, and migration
- Provider structured-output adapters
- Free Auto selection and privacy-preserving fallback
- Risk classification and approval decisions
- Artifact capability selection
- Visual/spec round-trip equivalence
- Playground state, control, and trace contracts
- HarnessBuilder version negotiation, idempotency, status, failure, and artifact handling
- Secret redaction and injection boundaries

Each red test must fail because the behavior is absent, not because the test is malformed.

### Wave 2: tests during development

Every feature follows red, green, refactor. The suite includes:

- Unit tests for pure domain behavior
- Contract tests against real schemas and local protocol implementations
- Component tests for user-observable behavior
- Integration tests across planner, spec, policy, Playground, and connector boundaries
- Accessibility tests for keyboard, labels, focus, status announcements, and contrast
- Browser tests for Quick, Advanced, Local, Hybrid, Cloud, failure, recovery, and download journeys
- Security tests for secret leakage, prompt injection, invalid imports, URL abuse, permission escalation, and cross-project access

### Wave 3: independent post-build hardening

After the integrated product is feature-complete, add a fresh black-box suite authored from the acceptance criteria rather than the implementation. It covers:

- Cold anonymous hosted-demo journeys
- Real Groq planner execution and rate-limit recovery
- Local Ollama and loopback-runner compatibility
- Cross-version `AgentSpec` and HarnessBuilder compatibility
- Generated archive extraction, install, test, build, smoke run, and checksum verification
- Property-based malformed-spec and graph cases
- Mutation testing of policy, validation, and artifact-selection decisions
- Adversarial prompt, tool-output, file, and imported-component cases
- Cancellation, resume, stale event, duplicate submission, and partial-network failure
- Responsive layout, keyboard-only operation, and performance budgets

Any hardening failure becomes a new failing regression test before the correction is implemented. The final report distinguishes pre-code TDD tests, during-development tests, and post-build hardening tests.

## Generated-agent test lifecycle

HarnessBuilder derives a test plan from the immutable spec before generating implementation source:

1. Generate contract, policy, scenario, and adversarial tests from explicit requirements.
2. Run applicable tests against the empty or skeletal implementation and record the expected red evidence.
3. Generate the minimal implementation needed to satisfy the accepted spec.
4. Run all tests, static checks, and smoke scenarios.
5. Perform a separate post-generation gap analysis and add black-box hardening tests.
6. If a new test fails, preserve it as a regression test and repair through another red-green cycle.
7. Package only when every blocking test and verification gate passes.

Generated fixtures identify whether they are user-provided, spec-derived, adapter-conformance, or post-build hardening. Model-graded evaluations never replace deterministic policy or contract assertions.

## First-release acceptance criteria

1. A user can enter one natural-language request and receive a valid, editable `AgentSpec` without manually constructing nodes.
2. Quick mode produces a useful single-agent design by default; Advanced can create and edit teams, handoffs, state, routing, approvals, and termination.
3. Visual and raw spec editing round-trip without losing behavior or permissions.
4. Free Auto uses local Ollama when eligible, otherwise configured Groq Free Cloud, and never fabricates a provider response.
5. Hybrid is the recommended default, while Local and Cloud are functional selectable modes with accurate boundary disclosure.
6. The Playground supports whole-flow and isolated-component tests, visible traces, approvals, artifacts, and operator controls.
7. The selector produces TypeScript Agents SDK, Python Agents SDK, MCP server, or portable spec output based on declared capabilities and allows an Advanced override.
8. Agentify submits an immutable spec to HarnessBuilder and displays real resumable build state.
9. HarnessBuilder generates tests before implementation, records red evidence, runs the completed suite, adds post-build hardening tests, and blocks packaging on failure.
10. A passing build returns source, tests, CI, spec, README, AGENTS.md, verification reports, checksums, and a downloadable archive.
11. Secrets do not appear in browser state, prompts beyond explicit provider needs, source, archives, logs, traces, or reports.
12. The hosted demo completes the real prompt-to-spec-to-HarnessBuilder-to-download path using the configured Groq secret and does not simulate unsupported delivery.
13. Unit, contract, integration, browser, accessibility, security, mutation, property, and post-build hardening results are recorded in the final verification report.

## Non-goals for the first release

- A public marketplace accepting unreviewed executable components.
- Automatic production deployment of generated agents into customer infrastructure.
- Storing arbitrary customer provider keys in the hosted control plane.
- Claiming identical capabilities across providers or output runtimes.
- Supporting every agent framework in the first release.
- Allowing arbitrary model-generated source to bypass reviewed templates, sandboxing, tests, or HarnessBuilder policy.
- Simulating GitHub publication, local execution, provider calls, or verification states.

## Delivery sequence

1. Contract and deterministic spec/policy engine
2. Provider adapters and Free Auto
3. Quick prompt-to-spec workspace
4. Advanced visual and raw-spec editing
5. Playground and operator controls
6. HarnessBuilder `AgentSpec` build API and connector
7. Adaptive artifact targets and downloadable packages
8. Full generated-agent test lifecycle
9. Post-build hardening, documentation, public repository, deployment, and anonymous live verification

## Spec self-review

- No placeholders, deferred requirements, or ambiguous “automatic” behavior remain.
- Agentify and HarnessBuilder responsibilities are separate and connected only through a versioned contract.
- The selected features match the researched builder patterns while preserving an original implementation and stronger production verification boundary.
- Quick and Advanced modes use one spec and one pipeline.
- Hybrid, Local, and Cloud boundaries agree with provider, credential, runner, and artifact behavior.
- Free Auto has a deterministic resolution order and an honest unavailable state.
- The three requested test periods are explicit: before code, during development, and after integrated completion.
- The first release is limited to four artifact targets and five provider adapters; unsupported capability combinations fail early.
