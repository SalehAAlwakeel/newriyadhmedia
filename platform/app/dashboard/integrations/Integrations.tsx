"use client";

import { useEffect, useState } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { PlatformDef } from "@/lib/platforms";
import type { SocialConnection } from "@/lib/db";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import PlatformIcon from "./PlatformIcon";

export interface PlatformStatus {
  oauthReady: boolean;
  live: boolean;
}

function timeAgo(iso: string | undefined): string {
  if (!iso) return "never";
  const ms = Date.now() - +new Date(iso);
  const s = Math.max(1, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function fmtAudience(n: number | undefined): string | null {
  if (n === undefined) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const ERROR_MESSAGES: Record<string, string> = {
  not_configured: "Instagram OAuth is not configured on this server yet.",
  bad_state: "Sign-in expired — please try connecting again.",
  token_exchange: "Could not complete sign-in with Meta. Check your app credentials.",
  missing_code: "Sign-in was cancelled or incomplete.",
  not_available: "This platform is not available yet.",
};

export default function Integrations({
  platforms,
  soonPlatforms = [],
  initialConnections,
  platformStatus,
  locale = "en",
}: {
  platforms: PlatformDef[];
  soonPlatforms?: PlatformDef[];
  initialConnections: SocialConnection[];
  platformStatus: Record<string, PlatformStatus>;
  locale?: Locale;
}) {
  const searchParams = useSearchParams();
  const [connections, setConnections] = useState<SocialConnection[]>(initialConnections);
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    const platform = searchParams.get("platform") ?? "";
    if (connected) {
      setBanner({ kind: "ok", text: `${platform || "Account"} connected successfully.` });
    } else if (error) {
      const decoded = decodeURIComponent(error);
      setBanner({
        kind: "err",
        text: ERROR_MESSAGES[decoded] ?? decoded,
      });
    }
  }, [searchParams]);

  function findConnection(platformId: string): SocialConnection | undefined {
    return connections.find((c) => c.platform === platformId);
  }

  async function disconnect(p: PlatformDef) {
    if (!confirm(`Disconnect ${p.name}? Scheduled posts on this account will be skipped.`)) return;
    setBusy(p.id);
    try {
      const res = await fetch("/api/integrations/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: p.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setConnections(data.connections as SocialConnection[]);
    } finally {
      setBusy(null);
    }
  }

  async function syncNow(p: PlatformDef) {
    setBusy(`sync:${p.id}`);
    try {
      const res = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform: p.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.connection) {
        setConnections((prev) => prev.map((c) => (c.platform === p.id ? data.connection : c)));
      } else if (data.error) {
        setBanner({ kind: "err", text: data.error });
      }
    } finally {
      setBusy(null);
    }
  }

  function connectOAuth(p: PlatformDef) {
    window.location.href = `/api/integrations/oauth/${p.id}`;
  }

  return (
    <>
      {banner && (
        <div className={`ds-banner ${banner.kind === "err" ? "ds-banner--warn" : ""}`} style={{ marginBottom: 16 }}>
          <span className="ds-banner__dot">{banner.kind === "ok" ? <Check size={15} /> : <AlertTriangle size={14} />}</span>
          <p>{banner.text}</p>
          <button className="btn btn--ghost btn--sm" type="button" onClick={() => setBanner(null)}>{t("integrations.dismiss", locale)}</button>
        </div>
      )}

      <div className="integrations">
        {platforms.map((p) => {
          const conn = findConnection(p.id);
          const isOn = Boolean(conn);
          const audience = fmtAudience(conn?.audienceSize);
          const status = platformStatus[p.id] ?? { oauthReady: false, live: true };

          return (
            <div key={p.id} className={`integration ${isOn ? "is-connected" : ""}`}>
              <div className="integration__head">
                {conn?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="integration__avatar" src={conn.avatarUrl} alt="" />
                ) : (
                  <span
                    className="integration__chip"
                    style={{ background: p.color, color: p.color === "#FFFC00" ? "#0e0d0b" : "#fff" }}
                  >
                    <PlatformIcon platformId={p.id} className="integration__chip-icon" />
                  </span>
                )}
                <div className="integration__meta">
                  <strong>{p.name}</strong>
                  <span>{isOn ? conn?.handle : p.blurb}</span>
                </div>
                {isOn && <span className="integration__dot" title="Connected via OAuth" />}
              </div>

              {isOn && (
                <>
                  <dl className="integration__stats">
                    <div>
                      <dt>{t("integrations.audience", locale)}</dt>
                      <dd>{audience ?? "—"}</dd>
                    </div>
                    <div>
                      <dt>{t("integrations.lastSync", locale)}</dt>
                      <dd>{timeAgo(conn?.lastSyncedAt)}</dd>
                    </div>
                    <div>
                      <dt>{t("integrations.verified", locale)}</dt>
                      <dd>OAuth</dd>
                    </div>
                  </dl>
                  {conn?.capabilities && conn.capabilities.length > 0 && (
                    <div className="integration__caps">
                      {conn.capabilities.map((c) => (
                        <span key={c} className="chip is-on chip--xs">{c}</span>
                      ))}
                    </div>
                  )}
                </>
              )}

              {!status.oauthReady && !isOn && (
                <p className="integration__setup">{t("integrations.setup", locale)}</p>
              )}

              <div className="integration__actions">
                {isOn ? (
                  <>
                    <button className="btn btn--sm" onClick={() => syncNow(p)} disabled={busy?.startsWith("sync") || busy === p.id}>
                      {busy === `sync:${p.id}` ? "Syncing…" : t("integrations.sync", locale)}
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => disconnect(p)} disabled={busy === p.id}>
                      {busy === p.id ? "…" : t("integrations.disconnect", locale)}
                    </button>
                  </>
                ) : status.oauthReady ? (
                  <button className="btn btn--sm" onClick={() => connectOAuth(p)} disabled={!!busy}>
                    {t("integrations.connect", locale)} {p.name} →
                  </button>
                ) : (
                  <button className="btn btn--sm" disabled>
                    Setup required
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {soonPlatforms.length > 0 && (
        <div className="integrations-soon" style={{ marginTop: 20 }}>
          <p className="ds-note" style={{ marginBottom: 10 }}>{t("integrations.comingSoon", locale)}</p>
          <div className="integrations-soon__row" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {soonPlatforms.map((p) => (
              <span key={p.id} className="chip chip--xs" style={{ opacity: 0.7, display: "inline-flex", alignItems: "center", gap: 4 }}>
                <PlatformIcon platformId={p.id} className="integration__chip-icon" />
                {p.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
