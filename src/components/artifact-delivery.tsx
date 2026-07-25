"use client";

import { BuildTimeline } from "@/components/build-timeline";
import { VerificationReport } from "@/components/verification-report";
import type { BuildResult } from "@/connectors/harness-builder";
import { createZip } from "@/lib/zip";

export function ArtifactDelivery({
  result,
  building = false,
  issue,
  onBuild,
}: {
  result?: BuildResult;
  building?: boolean;
  issue?: string;
  onBuild(): void;
}) {
  const canDownload = result?.status === "packaged" && result.report.status === "passed";

  return (
    <section className="artifact-delivery panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Direct pipeline</p>
          <h2>HarnessBuilder delivery</h2>
        </div>
        {result && <span className={`run-state ${result.status}`}>{result.status}</span>}
      </div>

      {!result ? (
        <div className="delivery-empty">
          <p>
            Send the immutable AgentSpec to HarnessBuilder for deterministic generation and
            blocking verification gates.
          </p>
          <button className="primary-action" disabled={building} onClick={onBuild} type="button">
            {building ? "Building..." : "Build verified agent"}
          </button>
        </div>
      ) : (
        <>
          <div className="delivery-grid">
            <BuildTimeline events={result.events} />
            <VerificationReport report={result.report} />
          </div>
          <section className="artifact-files">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Package contents</p>
                <h3>{result.artifact.files.length} generated files</h3>
              </div>
              <code>{result.buildId}</code>
            </div>
            <ul>
              {result.artifact.files.map((file) => (
                <li key={file.path}>
                  <code>{file.path}</code>
                  <span>{result.artifact.checksums[file.path]?.slice(0, 12) ?? "unhashed"}</span>
                </li>
              ))}
            </ul>
            <button
              className="primary-action"
              disabled={!canDownload}
              onClick={() => canDownload && downloadArtifact(result)}
              type="button"
            >
              Download verified ZIP
            </button>
            {!canDownload && (
              <p>A failed blocking gate cannot be presented as a verified download.</p>
            )}
          </section>
        </>
      )}

      {issue && (
        <p className="inline-error" role="alert">
          {issue}
        </p>
      )}
    </section>
  );
}

function downloadArtifact(result: BuildResult) {
  const zip = createZip(result.artifact);
  const bytes = zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.byteLength) as ArrayBuffer;
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${result.artifact.manifest.specName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")}-verified.zip`;
  anchor.click();
  URL.revokeObjectURL(url);
}
