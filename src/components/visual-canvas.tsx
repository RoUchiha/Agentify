import type { VisualGraph } from "@/domain/graph";

export function VisualCanvas({ graph }: { graph: VisualGraph }) {
  return (
    <section aria-label="Agent canvas" className="visual-canvas">
      <div className="canvas-toolbar">
        <div>
          <p className="eyebrow">Visual canvas</p>
          <h3>Execution map</h3>
        </div>
        <span>{graph.nodes.length} nodes</span>
      </div>
      <ol className="node-lane">
        {graph.nodes.map((node, index) => (
          <li aria-label={`${node.kind}: ${node.label}`} className={`canvas-node ${node.kind}`} key={node.id}>
            <span className="node-index">{String(index + 1).padStart(2, "0")}</span>
            <div>
              <small>{node.kind}</small>
              <strong>{node.label}</strong>
            </div>
          </li>
        ))}
      </ol>
      <div className="edge-list">
        <span>Connections</span>
        {graph.edges.map((edge) => (
          <code key={`${edge.source}-${edge.target}`}>
            {edge.source} → {edge.target}
          </code>
        ))}
      </div>
    </section>
  );
}
