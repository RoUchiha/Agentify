import { useState, type FormEvent } from "react";

import { DeploymentPicker } from "@/components/deployment-picker";
import type { DeploymentMode } from "@/domain/agent-spec";

export function PromptIntake({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit(request: { prompt: string; deploymentMode: DeploymentMode }): void;
}) {
  const [prompt, setPrompt] = useState("");
  const [deploymentMode, setDeploymentMode] = useState<DeploymentMode>("hybrid");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (prompt.trim().length < 8) {
      return;
    }
    onSubmit({ prompt: prompt.trim(), deploymentMode });
  }

  return (
    <form className="prompt-intake" onSubmit={submit}>
      <label htmlFor="agent-prompt">What should your agent accomplish?</label>
      <textarea
        disabled={busy}
        id="agent-prompt"
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="Example: Triage incoming support tickets, research the right answer, and draft a response for approval."
        rows={6}
        value={prompt}
      />
      <div className="prompt-meta">
        <span>One outcome is enough. We’ll derive the structure.</span>
        <span>{prompt.trim().length} characters</span>
      </div>
      <DeploymentPicker disabled={busy} onChange={setDeploymentMode} value={deploymentMode} />
      <button className="primary-action" disabled={busy || prompt.trim().length < 8} type="submit">
        {busy ? "Designing…" : "Design my agent"}
      </button>
    </form>
  );
}
