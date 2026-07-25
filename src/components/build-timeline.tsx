import type { BuildResult } from "@/connectors/harness-builder";

export function BuildTimeline({ events }: { events: BuildResult["events"] }) {
  return (
    <section aria-label="Build timeline" className="build-timeline">
      <p className="eyebrow">HarnessBuilder evidence</p>
      <h3>Build timeline</h3>
      <ol>
        {events.map((event, index) => (
          <li key={`${event.status}-${index}`}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{event.status.replaceAll("_", " ")}</strong>
              <p>{event.evidence}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
