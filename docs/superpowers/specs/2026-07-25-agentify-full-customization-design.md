# Agentify full customization design

## Decision

Agentify will expose a persistent **Quick Build / Advanced Build** mode selector over one canonical agent project. Quick Build remains prompt-first and asks only for material missing decisions. Advanced Build exposes typed controls for every developer-controlled agent setting, including portable core behavior and optional provider or framework overrides.

Both modes read and write the same normalized specification. Switching modes never discards settings, follow-up answers, accepted suggestions, dismissed advice, test scenarios, or build selections.

No control is decorative. Every accepted setting must do one of the following:

1. compile into a supported generated target;
2. affect validation, policy, testing, packaging, or runtime instructions;
3. produce an explicit capability incompatibility or connection-required state.

Agentify will never present an editable option that is silently ignored.

## Product goals

A developer can use Advanced Build to configure the same concerns they would handle manually when building an agent:

- identity, purpose, prompts, roles, and output contracts;
- single-agent and multi-agent topology, handoffs, routing, and termination;
- provider, model, sampling, structured-output, tool-choice, and fallback policy;
- tools, credentials references, permissions, approval rules, timeouts, retries, and idempotency;
- knowledge, memory, state, retention, visibility, redaction, and freshness;
- guardrails, hooks, middleware, sandbox, network, and filesystem capabilities;
- budgets for steps, tokens, time, retries, concurrency, and cost;
- evaluation fixtures, deterministic assertions, rubrics, thresholds, and adversarial cases;
- tracing, logging, metrics, redaction, audit events, and artifact retention;
- artifact target, deployment mode, package metadata, and framework-specific overrides;
- direct JSON editing and portable import/export.

A non-developer can remain in Quick Build, answer plain-language questions, accept safe defaults, and receive the same contract-valid project.

## Mode model

### Persistent selector

The header contains a two-option segmented control:

- **Quick Build**
- **Advanced Build**

The mode is a view preference, not a project type. The selected mode is announced accessibly and is preserved for the current project session.

### Quick Build

Quick Build contains:

1. natural-language outcome intake;
2. generated design summary;
3. requirements coverage;
4. focused follow-up questions;
5. recommended defaults and alternatives;
6. Playground test;
7. HarnessBuilder build and delivery.

Quick Build hides implementation detail but never changes it. A concise “Configured automatically” summary discloses chosen defaults, provider boundary, capabilities, permissions, and artifact target.

### Advanced Build

Advanced Build uses a three-region studio:

- **Section navigator:** configuration categories, completion state, and error counts.
- **Typed editor:** controls for the selected category.
- **Advisor rail:** blocking errors, recommended improvements, optional optimizations, and pending spec diffs.

The visual graph and raw JSON editor remain available as equivalent views of the same spec. Desktop uses the three-region layout. Narrow screens use a section drawer and collapsible advisor.

## Canonical contracts

### AgentSpec compatibility

The existing `AgentSpec v1` remains the portable core and HarnessBuilder transport boundary. Advanced capabilities are added through a backward-compatible minor schema revision with deterministic migration from existing `1.0` projects.

The versioned transport envelope remains independently negotiated. HarnessBuilder reparses the complete spec, validates advanced fields, and either compiles them or returns a named capability incompatibility. Unknown fields remain rejected.

### Advanced domains

The expanded contract includes typed optional domains rather than an unvalidated catch-all object:

- `metadata`: labels, package name, tags, provenance, revision notes;
- `objective`: examples, non-goals, input and output JSON Schemas;
- `agents`: model-policy reference, context policy, guardrail references, completion responsibility;
- `models`: named model profiles with provider, model ID, temperature, top-p, maximum output tokens, seed, reasoning effort, parallel tool policy, structured-output mode, timeout, and fallback chain;
- `tools`: connection kind, opaque credential reference, scopes, network policy, retry policy, concurrency, caching, and approval timing;
- `knowledge`: access policy, freshness, indexing, chunking, retrieval limits, citations, and failure behavior;
- `state`: default value, initialization source, mutation permissions, size limit, and conflict policy;
- `workflow`: node configuration, edge priority, routing expressions, loop limits, parallel groups, checkpoints, and failure paths;
- `guardrails`: input, output, tool, and handoff rules with action and severity;
- `hooks`: lifecycle event, handler reference, timeout, failure behavior, and execution location;
- `budgets`: concurrency and per-model or per-tool overrides in addition to existing limits;
- `runtime`: environment, filesystem, network, sandbox, streaming, persistence, and capability grants;
- `evaluations`: assertion list, rubric, threshold, repetitions, timeout, and grader policy;
- `observability`: trace level, log level, metrics, sampling, content capture, redaction, audit retention, and exporters;
- `delivery`: target override, package metadata, environment template, deployment instructions, and included artifacts;
- `overrides`: discriminated, typed OpenAI Agents SDK TypeScript, OpenAI Agents SDK Python, MCP, Groq, and Ollama options.

Opaque credential references may be configured; credential values may not enter the browser spec.

### Round-trip rule

Typed forms, visual graph edits, raw JSON edits, imported specs, Quick Build answers, and advisor patches all pass through one parser and normalizer. A valid change must round-trip without losing any field. Invalid changes remain local to the editor until corrected and never replace the last valid spec.

## Quick Build requirements coverage

### Coverage analysis

After each planner result or accepted follow-up answer, Agentify produces a deterministic `RequirementsCoverage` result:

- `complete`: whether all build-blocking decisions are resolved;
- `gaps`: exact missing paths and decisions;
- `defaults`: safe technical values already selected;
- `assumptions`: non-blocking inferred choices;
- `risks`: permission, privacy, cost, portability, or deployment impacts.

Each `RequirementGap` contains:

- stable identifier;
- spec path;
- blocking or advisory severity;
- plain-language question;
- reason the answer is needed;
- recommended answer;
- two or fewer useful alternatives;
- implementation effort;
- privacy, cost, permission, portability, and deployment impacts;
- whether the recommendation can participate in “Use all safe defaults.”

### Recommendation policy

The default recommendation is the easiest safe implementation compatible with the stated use case. The deterministic preference order is:

1. single agent before a team;
2. no tool before an unnecessary integration;
3. read-only before write capability;
4. runtime approval before autonomous writes;
5. no persistence before durable state;
6. public or synthetic test data before sensitive data;
7. existing Free Auto provider policy before a paid or new provider;
8. Hybrid default unless the request requires fully local or fully cloud execution;
9. OpenAI Agents SDK TypeScript for general hosted agents, portable spec when runtime intent is unresolved, MCP when tool exposure is the primary outcome;
10. deterministic assertions before model-graded evaluation.

Recommendations may use the planner to explain use-case fit, but the selectable values, impact metadata, and safe-default eligibility come from reviewed deterministic rules.

### Follow-up interaction

Quick Build asks one material question at a time. The user can:

- accept the recommendation;
- choose an alternative;
- enter a custom answer;
- inspect all remaining gaps;
- apply all eligible safe defaults.

“Use all safe defaults” cannot infer or authorize:

- credentials;
- destructive, financial, or external-message actions;
- confidential or restricted data transfer;
- paid-provider use;
- data residency changes;
- public deployment;
- irreversible persistence or retention.

Those decisions require explicit answers.

## Advanced Build configuration studio

### Sections

The navigator exposes:

1. Overview
2. Objective and schemas
3. Agents and instructions
4. Models and providers
5. Tools and permissions
6. Knowledge
7. Memory and state
8. Workflow
9. Guardrails and approvals
10. Hooks and lifecycle
11. Budgets and reliability
12. Runtime and sandbox
13. Evaluations
14. Observability
15. Delivery and targets
16. Provider/framework overrides
17. Raw AgentSpec

Every array supports add, duplicate, reorder, and delete. Reference pickers list only compatible declared identifiers. JSON Schema values use a structured editor with a raw JSON fallback. Destructive deletions that would break references show affected dependents before confirmation.

### Editing behavior

Each typed control displays:

- label and concise help;
- current value and default;
- portability indicator;
- provider or target support;
- validation errors;
- related advisor findings.

Changes validate on blur and before apply. A section can be reset to the last accepted state. Session-scoped undo and redo cover accepted spec changes. The build action always displays the immutable revision it will submit.

### Capability support

Provider and target controls use declared capability matrices. Selecting an incompatible combination does not silently coerce values. Agentify offers:

- switch provider or target;
- remove the unsupported capability;
- retain it as an unresolved decision;
- configure a supported typed override.

## Advanced advisor

### Finding classes

The advisor produces:

- **Blocking errors:** schema violations, broken references, missing termination, unsafe write configuration, unresolved required decisions, and unsupported capabilities.
- **Recommended improvements:** excess permissions, ambiguous instructions, weak output schemas, missing negative tests, excessive budgets, fragile handoffs, unnecessary multi-agent design, missing redaction, or absent failure paths.
- **Optional optimizations:** simpler provider or model selection, caching, lower token budgets, portability, performance, tracing, and packaging improvements.

### Suggestion contract

Every `AdvisoryFinding` includes:

- stable rule identifier;
- affected paths;
- severity and category;
- concise explanation;
- evidence;
- suggested JSON Patch;
- impact summary;
- portability and provider implications;
- Apply, Edit, and Dismiss actions.

Applying a suggestion previews the diff, reparses the complete spec, reevaluates policy and capabilities, and records the decision. Dismissals are retained for the project revision so the same unchanged advice does not repeatedly interrupt the user.

Suggestions never silently mutate the accepted spec. They cannot expand permissions, increase cost, move data, add credentials, or weaken guardrails without explicit confirmation.

### Initial reviewed rules

The first rule pack covers:

- multi-agent topology with only one meaningful role;
- agent handoff cycles without bounded termination;
- undeclared or unused tools and state;
- write tools without runtime approval;
- high-risk tools without explicit authorization;
- output schemas lacking required properties;
- input or output schemas that accept unrestricted content without rationale;
- retry and step budgets inconsistent with workflow limits;
- token, timeout, or concurrency limits disproportionate to the task;
- Cloud execution with restricted knowledge;
- persistent state containing fields not marked for redaction;
- missing negative, boundary, policy, or adversarial evaluations;
- model-graded evaluation without deterministic assertions;
- provider-specific overrides that prevent the selected artifact target;
- tracing that captures content while confidential data is declared;
- a simpler single-agent, no-tool, or read-only implementation when equivalent.

## Data flow

1. The user enters a Quick Build prompt or edits Advanced Build controls.
2. The planner proposes a spec.
3. Parser, migration, normalization, semantic policy, and capability checks establish the last valid canonical spec.
4. Requirements coverage identifies missing material decisions.
5. Quick Build renders follow-ups or proceeds when coverage is complete.
6. Advanced Build renders the complete typed studio and advisor findings.
7. Every accepted edit reruns validation, coverage, policy, capability, and advisory analysis.
8. Playground runs the exact current valid revision.
9. Build freezes that revision and submits it to HarnessBuilder.
10. HarnessBuilder validates the full contract, compiles supported settings, runs verification gates, and packages evidence.

## Error handling

- Invalid form values stay in the field draft with a path-specific message.
- Invalid raw JSON never replaces the last valid spec.
- A failed advisor patch is rejected and explains the violated rule.
- Broken references name the source and dependent identifiers.
- Provider or target incompatibility names the unsupported setting and available remedies.
- Quick Build never loops on an answered question; changed upstream answers may reopen a dependent decision with an explanation.
- Planner failure preserves the prompt and accepted answers.
- Build remains disabled while blocking gaps or errors exist.
- Warnings and optional advice do not block testing or building unless policy classifies them as material.

## Accessibility

- The Quick/Advanced selector is a labelled radio group or tablist with keyboard navigation.
- Section status is conveyed by text and count, not color alone.
- Every control has a programmatic label, help association, and inline error association.
- Advisor updates use a polite live region; blocking errors use an assertive alert.
- Focus moves to the next unresolved Quick Build question after an answer and to the first invalid field after a failed apply.
- Add, reorder, duplicate, and delete operations are keyboard operable.

## Testing strategy

### Tests before implementation

Focused failing tests will prove:

- Quick Build and Advanced Build edit one shared spec without data loss.
- every top-level portable and advanced domain is reachable through a labelled section;
- representative scalar, enum, list, reference, JSON Schema, and provider-override controls update the canonical spec;
- invalid drafts preserve the last valid spec;
- requirements coverage returns exact paths, questions, safe recommendations, alternatives, and impacts;
- “Use all safe defaults” excludes permission, credential, cost, data-residency, and destructive decisions;
- the easiest safe default rules choose single-agent, no-tool or read-only, Free Auto, and Hybrid where compatible;
- advisor findings expose evidence and diffs and require explicit application;
- accepted suggestions round-trip and dismissed unchanged advice does not reappear;
- provider and target incompatibilities block delivery rather than being ignored.

### Tests during implementation

- pure unit tests for coverage rules, recommendation ranking, advisory rules, migrations, patches, and capability matrices;
- component tests for mode switching, section navigation, field editing, array operations, reference pickers, schemas, undo, and errors;
- contract tests shared with HarnessBuilder for every new optional field and target;
- browser tests for full Quick follow-up, safe-default, Advanced editing, suggestion application, Playground, and package delivery paths;
- accessibility tests for names, keyboard navigation, focus, and live announcements.

### Independent post-feature hardening

After the integrated customization studio is complete, a separate acceptance-driven suite will cover:

- every schema path mapped to at least one typed editor or explicitly read-only derived value;
- random valid spec round-trips through typed and raw editors;
- invalid reference mutation, array deletion, and migration cases;
- malicious JSON Schema, hook, tool, knowledge, and override inputs;
- conflicting suggestions and stale patches;
- large configurations and responsive layouts;
- anonymous production Quick and Advanced journeys;
- generated artifacts proving accepted settings are compiled or explicitly rejected.

## Acceptance criteria

1. The header always offers Quick Build and Advanced Build.
2. Switching modes preserves the entire canonical spec and project decision state.
3. Quick Build names every material missing decision and recommends the easiest safe implementation for the use case.
4. Users can accept one recommendation, provide a custom answer, or apply all eligible safe defaults.
5. Advanced Build exposes typed controls for every developer-controlled portable and advanced domain.
6. Raw JSON remains available and round-trips without field loss.
7. Advanced advisor findings include evidence, impact, and previewed patches and never auto-apply.
8. All permissions, privacy, cost, residency, and destructive choices require explicit confirmation.
9. Provider and target limitations are visible and enforced.
10. Playground and HarnessBuilder use the exact accepted spec revision.
11. Every accepted setting affects generated behavior, policy, tests, packaging, runtime instructions, or an explicit compatibility failure.
12. Quick follow-ups, Advanced forms, raw JSON, and HarnessBuilder share contract tests.
13. Core, hardening, browser, production build, dependency audit, public CI, and anonymous live checks pass before release.

## Non-goals

- Storing raw provider or service credentials in AgentSpec.
- Exposing arbitrary untyped provider blobs.
- Automatically applying permission-expanding advisor suggestions.
- Pretending every setting works identically across providers or targets.
- Replacing deterministic validation or policy with model advice.
- Automatically deploying generated agents into user infrastructure.

## Spec self-review

- No placeholders or deferred decisions remain.
- Quick and Advanced are views over one canonical project, not diverging products.
- All developer-controlled domains are either typed and editable or explicitly derived and read-only.
- Suggestions remain advisory; policy and capability validation remain authoritative.
- Safe defaults cannot grant sensitive authority.
- Advanced settings cannot be silently ignored by HarnessBuilder.
- Backward compatibility and migration are explicit.
- Testing covers before-code TDD, implementation tests, and independent post-feature hardening.
