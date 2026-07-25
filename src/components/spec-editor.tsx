import { useEffect, useState } from "react";

import { AgentSpecSchema, type AgentSpec } from "@/domain/agent-spec";

export function SpecEditor({
  onChange,
  spec,
}: {
  onChange(spec: AgentSpec): void;
  spec: AgentSpec;
}) {
  const [text, setText] = useState(() => JSON.stringify(spec, null, 2));
  const [issue, setIssue] = useState<string>();

  useEffect(() => {
    setText(JSON.stringify(spec, null, 2));
  }, [spec]);

  function apply() {
    let input: unknown;
    try {
      input = JSON.parse(text) as unknown;
    } catch {
      setIssue("AgentSpec must be valid JSON.");
      return;
    }
    const parsed = AgentSpecSchema.safeParse(input);
    if (!parsed.success) {
      setIssue(parsed.error.issues[0]?.message ?? "AgentSpec does not satisfy the contract.");
      return;
    }
    setIssue(undefined);
    onChange(parsed.data);
  }

  return (
    <section className="spec-editor">
      <div className="canvas-toolbar">
        <div>
          <p className="eyebrow">Declarative view</p>
          <h3>AgentSpec v1</h3>
        </div>
        <button onClick={apply} type="button">
          Apply spec
        </button>
      </div>
      {issue && (
        <p className="inline-error" role="alert">
          {issue}
        </p>
      )}
      <label className="sr-only" htmlFor="agent-spec-editor">
        Agent spec
      </label>
      <textarea
        aria-label="Agent spec"
        id="agent-spec-editor"
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
        value={text}
      />
    </section>
  );
}
