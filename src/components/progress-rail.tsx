const STAGES = ["Describe", "Design", "Test", "Build", "Deliver"] as const;

export function ProgressRail({ active }: { active: (typeof STAGES)[number] }) {
  const activeIndex = STAGES.indexOf(active);
  return (
    <nav aria-label="Agent creation progress" className="progress-rail">
      <ol>
        {STAGES.map((stage, index) => (
          <li className={index <= activeIndex ? "reached" : undefined} key={stage}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {stage}
          </li>
        ))}
      </ol>
    </nav>
  );
}
