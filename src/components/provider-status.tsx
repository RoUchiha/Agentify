export function ProviderStatus({
  provider,
}: {
  provider?: { id: "ollama" | "groq"; dataBoundary: "local" | "cloud"; reason: string };
}) {
  return (
    <section aria-labelledby="provider-title" className="provider-status">
      <div>
        <p className="eyebrow">Free Auto</p>
        <h2 id="provider-title">
          {provider?.id === "ollama"
            ? "Local Ollama"
            : provider?.id === "groq"
              ? "Groq Free Cloud"
              : "Ollama first, Groq second"}
        </h2>
      </div>
      <span className={`boundary-chip ${provider?.dataBoundary ?? "adaptive"}`}>
        {provider?.dataBoundary === "local"
          ? "Local boundary"
          : provider?.dataBoundary === "cloud"
            ? "Cloud boundary"
            : "Adaptive boundary"}
      </span>
      <p>
        {provider?.reason ??
          "Agent Builder checks for a capable local model before using configured free cloud inference."}
      </p>
    </section>
  );
}
