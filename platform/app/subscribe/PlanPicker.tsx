"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PLANS } from "@/lib/plans";
import { CONTACT_URL } from "@/lib/site";

export default function PlanPicker() {
  const router = useRouter();
  const params = useSearchParams();
  const preselected = params.get("plan");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(plan: "starter" | "growth" | "scale") {
    if (plan === "scale") {
      window.location.href = CONTACT_URL;
      return;
    }

    setBusy(plan);
    setError(null);
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Could not start your subscription.");
        return;
      }
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
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
          <div
            key={p.id}
            className={`plan ${p.featured ? "plan--featured" : ""} ${preselected === p.id ? "plan--selected" : ""}`}
          >
            {p.featured && <span className="plan__tag">Most popular</span>}
            <h3 className="plan__name">{p.name}</h3>
            <div className="plan__price">
              <strong>{p.priceLabel}</strong>
              {p.amountHalalas > 0 && <span>/ month</span>}
            </div>
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
              {busy === p.id
                ? "Processing…"
                : p.id === "scale"
                  ? "Contact sales"
                  : `Choose ${p.name}`}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
