import type { DeploymentMode } from "@/domain/agent-spec";

const MODES: Array<{ id: DeploymentMode; title: string; detail: string }> = [
  { id: "hybrid", title: "Hybrid", detail: "Hosted studio + private local runner" },
  { id: "local", title: "Local", detail: "Prompts, files, models, and builds stay local" },
  { id: "cloud", title: "Cloud", detail: "Isolated hosted planning and builds" },
];

export function DeploymentPicker({
  disabled,
  onChange,
  value,
}: {
  disabled?: boolean;
  onChange(value: DeploymentMode): void;
  value: DeploymentMode;
}) {
  return (
    <fieldset className="deployment-picker" disabled={disabled}>
      <legend>Where should this project run?</legend>
      <div className="mode-grid">
        {MODES.map((mode) => (
          <label className={mode.id === value ? "selected" : undefined} key={mode.id}>
            <input
              checked={mode.id === value}
              name="deployment-mode"
              onChange={() => onChange(mode.id)}
              type="radio"
              value={mode.id}
            />
            <strong>{mode.title}</strong>
            <span>{mode.detail}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
