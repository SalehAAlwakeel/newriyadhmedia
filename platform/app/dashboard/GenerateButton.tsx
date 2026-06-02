"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function GenerateButton({
  label = "✦ Generate this week",
  className = "btn",
  payload,
}: {
  label?: string;
  className?: string;
  payload?: Record<string, unknown>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload ?? {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Generation failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className={className} onClick={run} disabled={busy}>
        {busy ? "Generating…" : label}
      </button>
      {error && <span className="hint" style={{ color: "#b54545", marginLeft: 8 }}>{error}</span>}
    </>
  );
}
