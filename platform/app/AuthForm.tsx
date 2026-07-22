"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", email: "", company: "", password: "" });

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const endpoint = mode === "signup" ? "/api/auth/signup" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }
      const next = params.get("next");
      const plan = params.get("plan");
      if (!data.subscribed) {
        const dest = plan && ["starter", "growth", "scale"].includes(plan)
          ? `/subscribe?plan=${plan}`
          : "/subscribe";
        router.push(dest);
      } else {
        router.push(next && next.startsWith("/dashboard") ? next : "/dashboard");
      }
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="auth__form" onSubmit={submit}>
      {error && <div className="notice notice--warn">{error}</div>}
      {mode === "signup" && (
        <>
          <div className="field">
            <label htmlFor="name">Your name</label>
            <input id="name" className="input" value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="company">Company <span style={{ color: "var(--ink-mute)" }}>(optional)</span></label>
            <input id="company" className="input" value={form.company} onChange={(e) => set("company", e.target.value)} />
          </div>
        </>
      )}
      <div className="field">
        <label htmlFor="email">Email</label>
        <input id="email" type="email" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} required />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input id="password" type="password" className="input" value={form.password} onChange={(e) => set("password", e.target.value)} required minLength={mode === "signup" ? 8 : undefined} placeholder={mode === "signup" ? "At least 8 characters" : ""} />
      </div>
      <button className="btn btn--lg" type="submit" disabled={busy} style={{ width: "100%", justifyContent: "center" }}>
        {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
      </button>
    </form>
  );
}
