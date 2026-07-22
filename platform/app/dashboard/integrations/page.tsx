import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { updateUser } from "@/lib/db";
import { getLocale } from "@/lib/i18n.server";
import { t } from "@/lib/i18n";
import { PLATFORMS, isPlatformLive, oauthConfigured } from "@/lib/platforms";
import { publicConnections, sanitizeConnections } from "@/lib/social";
import PageHead from "../PageHead";
import Integrations, { type PlatformStatus } from "./Integrations";

export const metadata = { title: "Integrations · New Riyadh Media" };
export const dynamic = "force-dynamic";

function buildPlatformStatus(): Record<string, PlatformStatus> {
  const out: Record<string, PlatformStatus> = {};
  for (const p of PLATFORMS) {
    out[p.id] = { live: isPlatformLive(p.id), oauthReady: oauthConfigured(p) };
  }
  return out;
}

export default async function IntegrationsPage() {
  const user = await getCurrentUser();
  const locale = await getLocale();
  const platformStatus = buildPlatformStatus();

  let connections = sanitizeConnections(user?.connections ?? []);
  if (user && connections.length !== user.connections.length) {
    await updateUser(user.id, { connections });
  }

  const safe = publicConnections(connections);
  const livePlatforms = PLATFORMS.filter((p) => isPlatformLive(p.id));
  const soonPlatforms = PLATFORMS.filter((p) => !isPlatformLive(p.id));

  return (
    <div className="ds-page">
      <PageHead
        eyebrow="Grow · Integrations"
        title={t("integrations.title", locale)}
        sub={t("integrations.sub", locale)}
      />
      <Suspense fallback={<p className="ds-note">Loading…</p>}>
        <Integrations
          platforms={livePlatforms}
          soonPlatforms={soonPlatforms}
          initialConnections={safe}
          platformStatus={platformStatus}
          locale={locale}
        />
      </Suspense>
    </div>
  );
}
