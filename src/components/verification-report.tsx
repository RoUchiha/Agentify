import type { BuildResult } from "@/connectors/harness-builder";

export function VerificationReport({ report }: { report: BuildResult["report"] }) {
  return (
    <section aria-label="Verification report" className="verification-report">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Blocking gates</p>
          <h3>Verification report</h3>
        </div>
        <span className={`gate-status ${report.status}`}>{report.status}</span>
      </div>
      <ul>
        {report.gates.map((gate) => (
          <li key={gate.id}>
            <span>{gate.id}</span>
            <strong className={`gate-status ${gate.status}`}>{gate.status}</strong>
            <p>{gate.evidence.join(" ")}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
