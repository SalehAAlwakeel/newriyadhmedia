"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const PLANS = [
  {
    id: "starter" as const,
    name: "Starter",
    price: "SAR 499",
    cadence: "/ month",
    blurb: "For solo founders and small brands getting started.",
    features: ["1 brand workspace", "3 connected channels", "300 credits / mo", "AI strategist + content studio", "Weekly insights"],
  },
  {
    id: "growth" as const,
    name: "Growth",
    price: "SAR 1,299",
    cadence: "/ month",
    blurb: "For growing businesses posting across every channel.",
    features: ["3 brand workspaces", "Unlimited channels", "1,200 credits / mo", "Approvals & scheduling", "SEO + learning engine", "Priority generation"],
    featured: true,
  },
  {
    id: "scale" as const,
    name: "Scale",
    price: "Let's talk",
    cadence: "",
    blurb: "For agencies and multi-brand operators.",
    features: ["Unlimited workspaces", "Team roles & approvals", "Custom credit volume", "Dedicated strategist", "API & integrations"],
  },
];

export default function PlanPicker() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(plan: "starter" | "growth" | "scale") {
    setBusy(plan);
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error || "Could not start your subscription.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {error && <div className="notice notice--warn" style={{ maxWidth: 420, margin: "0 auto 20px" }}>{error}</div>}
      <div className="plans">
        {PLANS.map((p) => (
          <div key={p.id} className={`plan ${p.featured ? "plan--featured" : ""}`}>
            {p.featured && <span className="plan__tag">Most popular</span>}
            <h3 className="plan__name">{p.name}</h3>
            <div className="plan__price"><strong>{p.price}</strong>{p.cadence && <span>{p.cadence}</span>}</div>
            <p className="plan__blurb">{p.blurb}</p>
            <ul className="plan__features">
              {p.features.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
            <button
              className={`btn ${p.featured ? "" : "btn--ghost"}`}
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => choose(p.id)}
              disabled={busy !== null}
            >
              {busy === p.id ? "Activating…" : p.id === "scale" ? "Contact sales" : "Choose " + p.name}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
