import { getCurrentUser } from "@/lib/auth";
import { PLATFORMS } from "@/lib/platforms";
import PageHead from "../PageHead";
import Integrations from "./Integrations";

export const metadata = { title: "Integrations · New Riyadh Media" };
export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  const connections = user?.connections ?? [];

  const ANALYTICS = [
    {
      id: "google_analytics",
      name: "Google Analytics",
      color: "#E37400",
      sampleHandle: "GA4 property",
      blurb: "Traffic & conversions",
      oauthEnv: "GOOGLE_CLIENT_ID",
    },
  ];

  return (
    <div className="ds-page">
      <PageHead
        eyebrow="Grow · Integrations"
        title="Connect your channels."
        sub="Link a network once. We schedule, post and pull analytics from it — so your strategist learns what works."
      />
      <Integrations platforms={PLATFORMS} initialConnections={connections} />

      <section className="card" style={{ marginTop: 24 }}>
        <h2 className="card__title">Analytics sources</h2>
        <p className="card__lede">
          Connect Google Analytics so your AI strategist can learn from real traffic, not just social metrics.
        </p>
        <Integrations platforms={ANALYTICS} initialConnections={connections} />
      </section>
    </div>
  );
}
