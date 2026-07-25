import { selectArtifact } from "@/domain/artifact-selector";
import type { AgentSpec } from "@/domain/agent-spec";
import { evaluateSpec } from "@/domain/policy";

export function DesignSummary({ spec }: { spec: AgentSpec }) {
  const decision = evaluateSpec(spec);
  const artifact = selectArtifact(spec);
  return (
    <section aria-labelledby="design-title" className="design-summary panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Generated design</p>
          <h2 id="design-title">{spec.metadata.name}</h2>
        </div>
        <span className={`state-chip ${decision.status}`}>
          {decision.status === "ready" ? "Ready to test" : "Needs attention"}
        </span>
      </div>
      <p className="summary-goal">{spec.objective.goal}</p>
      <div className="summary-grid">
        <article>
          <span>Topology</span>
          <strong>
            {spec.workflow.topology === "single"
              ? "Single agent"
              : `${spec.agents.length}-agent team`}
          </strong>
        </article>
        <article>
          <span>Capabilities</span>
          <strong>{spec.tools.length} declared tools</strong>
        </article>
        <article>
          <span>Output</span>
          <strong>{artifact.status === "selected" ? artifact.target : "Choose another target"}</strong>
        </article>
        <article>
          <span>Controls</span>
          <strong>{decision.approvals.length} runtime approvals</strong>
        </article>
      </div>
      {spec.decisions.assumptions.length > 0 && (
        <div className="assumption-box">
          <h3>Assumptions to review</h3>
          <ul>
            {spec.decisions.assumptions.map((assumption) => (
              <li key={assumption}>{assumption}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
