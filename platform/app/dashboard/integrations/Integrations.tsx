"use client";

import { useState } from "react";
import type { PlatformDef } from "@/lib/platforms";
import type { SocialConnection } from "@/lib/db";
import ConnectModal, { type ConnectionPayload } from "./ConnectModal";
import PlatformIcon from "./PlatformIcon";

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

export default function Integrations({
  platforms,
  initialConnections,
}: {
  platforms: PlatformDef[];
  initialConnections: SocialConnection[];
}) {
  const [connections, setConnections] = useState<SocialConnection[]>(initialConnections);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ platform: PlatformDef; existing: SocialConnection | null } | null>(null);

  function findConnection(platformId: string): SocialConnection | undefined {
    return connections.find((c) => c.platform === platformId);
  }

  async function persistConnect(payload: ConnectionPayload) {
    const res = await fetch("/api/integrations/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.error || "Could not connect.");
    setConnections(data.connections as SocialConnection[]);
    setEditing(null);
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
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="integrations">
        {platforms.map((p) => {
          const conn = findConnection(p.id);
          const isOn = Boolean(conn);
          const audience = fmtAudience(conn?.audienceSize);
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
                {isOn && <span className="integration__dot" title="Connected" />}
              </div>

              {isOn && (
                <dl className="integration__stats">
                  <div>
                    <dt>Audience</dt>
                    <dd>{audience ?? "—"}</dd>
                  </div>
                  <div>
                    <dt>Last sync</dt>
                    <dd>{timeAgo(conn?.lastSyncedAt)}</dd>
                  </div>
                  <div>
                    <dt>Connected</dt>
                    <dd>{timeAgo(conn?.connectedAt)}</dd>
                  </div>
                </dl>
              )}

              {isOn && conn?.capabilities && conn.capabilities.length > 0 && (
                <div className="integration__caps">
                  {conn.capabilities.map((c) => (
                    <span key={c} className="chip is-on chip--xs">{c}</span>
                  ))}
                </div>
              )}

              <div className="integration__actions">
                {isOn ? (
                  <>
                    <button className="btn btn--sm" onClick={() => syncNow(p)} disabled={busy?.startsWith("sync") || busy === p.id}>
                      {busy === `sync:${p.id}` ? "Syncing…" : "Sync now"}
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => setEditing({ platform: p, existing: conn ?? null })} disabled={!!busy}>
                      Edit
                    </button>
                    <button className="btn btn--ghost btn--sm" onClick={() => disconnect(p)} disabled={busy === p.id}>
                      {busy === p.id ? "…" : "Disconnect"}
                    </button>
                  </>
                ) : (
                  <button className="btn btn--sm" onClick={() => setEditing({ platform: p, existing: null })} disabled={!!busy}>
                    Connect →
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {editing && (
        <ConnectModal
          platform={editing.platform}
          existing={editing.existing}
          onClose={() => setEditing(null)}
          onSaved={persistConnect}
        />
      )}
    </>
  );
}
