import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import PlanPicker from "./PlanPicker";

export const metadata = { title: "Choose your plan · New Riyadh Media" };

export default async function SubscribePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.subscribed) redirect("/dashboard");

  return (
    <div className="wrap" style={{ maxWidth: 1040, margin: "0 auto", padding: "64px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span className="eyebrow">[ One step left, {user.name.split(" ")[0]} ]</span>
      </div>
      <h1 className="display" style={{ textAlign: "center", fontSize: "clamp(32px, 5vw, 56px)" }}>
        Choose your plan.
      </h1>
      <p className="lede" style={{ textAlign: "center", maxWidth: "60ch", margin: "0 auto 40px" }}>
        Every plan includes your AI strategist, the content studio, scheduling and analytics.
        Credits cover image &amp; video generation and posting volume.
      </p>
      <PlanPicker />
      <p style={{ textAlign: "center", color: "var(--ink-mute)", fontSize: 13, marginTop: 24 }}>
        This is a demo checkout — no card required. Real billing runs through Stripe.
      </p>
    </div>
  );
}
