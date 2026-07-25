import type { PlaygroundTraceEvent } from "@/server/playground";

export function TraceTimeline({ trace }: { trace: PlaygroundTraceEvent[] }) {
  return (
    <section aria-label="Run trace" className="trace-timeline">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Evidence</p>
          <h3>Run trace</h3>
        </div>
        <span>{trace.length} events</span>
      </div>
      <ol>
        {trace.map((event) => (
          <li className={event.type} key={`${event.sequence}-${event.type}`}>
            <span className="trace-index">{String(event.sequence).padStart(2, "0")}</span>
            <div>
              <strong>{event.type.replaceAll("_", " ")}</strong>
              <p>{event.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
