# Security policy

## Supported version

The current default branch is supported. This is a pre-1.0 project; pin a reviewed commit for production use.

## Reporting

Do not open a public issue containing credentials, private prompts, generated confidential data, or an exploitable proof of concept. Report privately to the repository owner through GitHub’s private vulnerability reporting when enabled.

Include:

- affected commit and deployment;
- boundary crossed;
- minimal reproduction with synthetic data;
- expected versus observed behavior;
- whether credentials, external writes, or generated archives were involved.

## Credential rules

- Never place keys in prompts, AgentSpec, fixtures, generated files, logs, screenshots, or archives.
- Configure `GROQ_API_KEY` and optional service tokens only as server-side environment variables.
- Rotate a credential immediately if it appears in a request body or generated artifact.
- Do not weaken secret scanning to make a build pass.

## High-risk changes

Changes to schema parsing, write approvals, provider fallback, tool execution, ZIP paths, service authentication, or verification gates require denial-path tests and full browser verification.
