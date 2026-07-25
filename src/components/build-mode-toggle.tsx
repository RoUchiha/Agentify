export type BuildMode = "quick" | "advanced";

export function BuildModeToggle({
  mode,
  onChange,
}: {
  mode: BuildMode;
  onChange(mode: BuildMode): void;
}) {
  return (
    <fieldset className="build-mode-toggle">
      <legend className="sr-only">Build mode</legend>
      {(["quick", "advanced"] as const).map((value) => (
        <label className={mode === value ? "selected" : undefined} key={value}>
          <input
            aria-label={value === "quick" ? "Quick Build" : "Advanced Build"}
            checked={mode === value}
            name="build-mode"
            onChange={() => onChange(value)}
            type="radio"
            value={value}
          />
          <span>{value === "quick" ? "Quick Build" : "Advanced Build"}</span>
          <small>{value === "quick" ? "Guided defaults" : "Every contract field"}</small>
        </label>
      ))}
    </fieldset>
  );
}
