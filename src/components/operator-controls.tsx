export function OperatorControls({
  toolId,
  onApprove,
  onReject,
}: {
  toolId: string;
  onApprove(): void;
  onReject(): void;
}) {
  return (
    <section className="operator-controls">
      <p className="eyebrow">Operator gate</p>
      <h3>{toolId} requires approval</h3>
      <p>No write has executed. Approval is recorded separately from the provider response.</p>
      <div className="button-row">
        <button className="primary-action" onClick={onApprove} type="button">
          Approve
        </button>
        <button className="secondary-action" onClick={onReject} type="button">
          Reject
        </button>
      </div>
    </section>
  );
}
