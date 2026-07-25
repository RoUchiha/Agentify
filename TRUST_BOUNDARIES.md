# Trust boundaries

## Browser

The browser holds the user brief, selected deployment mode, validated AgentSpec, Playground input/output, traces, build evidence, and generated files returned for download. It never receives provider or service credentials.

## AgentBuilder server

The server owns provider credentials and the HarnessBuilder service token. Provider output is untrusted JSON until the strict AgentSpec schema and semantic rules accept it. Prompt text cannot add unknown fields, undeclared tool references, unbounded retries, or write tools without approval.

Free Auto may move a prompt from a local Ollama boundary to Groq Cloud only when local Ollama is unavailable, and the selected boundary is returned to the UI.

## Playground

The Playground runs only through a configured Ollama or Groq adapter. A provider tool request is checked against the immutable spec. Undeclared tools fail closed. Declared writes pause before execution. Declared read tools without a registered handler also fail closed; the app does not simulate a successful tool call.

## HarnessBuilder

AgentBuilder submits `AgentSpec v1`, target, execution profile, trace ID, and a SHA-256 idempotency key over a server-to-server request. HarnessBuilder reparses the contract independently and generates only reviewed templates.

Its report is static verification evidence, not proof that arbitrary generated integrations ran. Blocking gates scan the complete artifact, including target-specific files. A failed report disables verified download.

## Generated package

Target packages contain environment-variable names but not values. OpenAI targets require an operator-provided `OPENAI_API_KEY`. MCP and SDK tool declarations fail closed until real handlers are connected through the generated approval gateway.

The ZIP writer accepts only unique relative paths without traversal, drive prefixes, backslashes, empty segments, or NUL bytes. ZIP entry order must exactly match the verified manifest.

## Hosted demo

The hosted UI and HarnessBuilder are cloud services. The live demo uses Groq Free Cloud through a server-side deployment secret. Ollama remains a local pairing option and is not represented as reachable from the hosted server unless a user deploys a private runner endpoint intentionally.
