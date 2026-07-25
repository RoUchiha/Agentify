# Trust boundaries

## Browser

The browser holds the user brief, selected build mode, validated AgentSpec, structured Advanced drafts, dismissed advisor finding IDs, Playground input/output, traces, build evidence, and generated files returned for download. Quick and Advanced operate on the same accepted spec. It never receives provider or service credentials.

## Agentify server

The server owns provider credentials and the HarnessBuilder service token. Provider output is untrusted JSON until the strict AgentSpec schema and semantic rules accept it. Prompt text cannot add unknown fields, undeclared tool references, unbounded retries, or write tools without approval.

Quick Build safe defaults cannot choose credential values, authorize writes, select public deployment or residency, or establish retention. Advanced section drafts and raw JSON cannot replace the accepted spec until the entire strict contract reparses successfully.

Advisor rules are local deterministic functions. Findings do not mutate the spec. Suggested patches are cloned, restricted to existing safe paths, protected from prototype/array escapes, and reparsed before acceptance. Dismissal hides only the same evidence-derived finding ID.

Free Auto may move a prompt from a local Ollama boundary to Groq Cloud only when local Ollama is unavailable, and the selected boundary is returned to the UI.

## Playground

The Playground runs only through a configured Ollama or Groq adapter. A provider tool request is checked against the immutable spec. Undeclared tools fail closed. Declared writes pause before execution. Declared read tools without a registered handler also fail closed; the app does not simulate a successful tool call.

## HarnessBuilder

Agentify submits a validated `AgentSpec v1.1`, target, execution profile, trace ID, and a SHA-256 idempotency key inside the versioned `1.0` server-to-server build envelope. HarnessBuilder reparses the contract independently and generates only reviewed templates.

HarnessBuilder deterministically compiles accepted customization into `agent.config.json`, target runtime settings, blank environment-reference templates, and fail-closed hook/guardrail/tool connection points. The `customization-capability` gate blocks settings the chosen target cannot honor. Its report is static verification evidence, not proof that arbitrary generated integrations ran. Blocking gates scan the complete artifact, including target-specific files. A failed report disables verified download.

## Generated package

Target packages contain environment-variable names but not values. Reference names are strict uppercase identifiers. Groq, Ollama, and OpenAI-compatible target adapters read only declared local environment names; other provider/target combinations fail capability verification. MCP and SDK tool, hook, and guardrail declarations fail closed until real handlers are connected through the generated approval gateway.

The ZIP writer accepts only unique relative paths without traversal, drive prefixes, backslashes, empty segments, or NUL bytes. ZIP entry order must exactly match the verified manifest.

## Hosted demo

The hosted UI and HarnessBuilder are cloud services. The live demo uses Groq Free Cloud through a server-side deployment secret. Ollama remains a local pairing option and is not represented as reachable from the hosted server unless a user deploys a private runner endpoint intentionally.
