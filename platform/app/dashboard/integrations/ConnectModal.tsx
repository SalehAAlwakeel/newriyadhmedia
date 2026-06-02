"use client";

import { useEffect, useState } from "react";
import type { PlatformDef } from "@/lib/platforms";
import type { ConnectionCapability } from "@/lib/db";

export interface ConnectionPayload {
  platform: string;
  handle: string;
  providerAccountId?: string;
  avatarUrl?: string;
  audienceSize?: number;
  capabilities: ConnectionCapability[];
  accessToken?: string;
}

export interface ExistingConnection {
  handle: string;
  providerAccountId?: string;
  avatarUrl?: string;
  audienceSize?: number;
  capabilities?: ConnectionCapability[];
}

const ALL_CAPS: { id: ConnectionCapability; label: string; desc: string }[] = [
  { id: "publish", label: "Publish posts", desc: "Allow the AI to schedule and publish posts on your behalf." },
  { id: "stories", label: "Stories / Reels", desc: "Permit short-form / ephemeral content publishing." },
  { id: "analytics", label: "Pull analytics", desc: "Read followers, reach, engagement for the Learning Loop." },
  { id: "dms", label: "Reply to DMs", desc: "Draft replies in the inbox for your approval before sending." },
];

export default function ConnectModal({
  platform,
  existing,
  onClose,
  onSaved,
}: {
  platform: PlatformDef;
  existing: ExistingConnection | null;
  onClose: () => void;
  onSaved: (payload: ConnectionPayload) => Promise<void> | void;
}) {
  const [handle, setHandle] = useState(existing?.handle ?? platform.sampleHandle);
  const [providerAccountId, setProviderAccountId] = useState(existing?.providerAccountId ?? "");
  const [avatarUrl, setAvatarUrl] = useState(existing?.avatarUrl ?? "");
  const [audienceSize, setAudienceSize] = useState<string>(
    existing?.audienceSize !== undefined ? String(existing.audienceSize) : "",
  );
  const [accessToken, setAccessToken] = useState("");
  const [caps, setCaps] = useState<ConnectionCapability[]>(
    existing?.capabilities ?? ["publish", "analytics"],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"consent" | "details">(existing ? "details" : "consent");

  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [busy, onClose]);

  function toggleCap(c: ConnectionCapability) {
    setCaps((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));
  }

  async function submit() {
    setError(null);
    if (!handle.trim()) {
      setError("Enter the handle or page name for this account.");
      return;
    }
    const audience = audienceSize.trim() === "" ? undefined : Number(audienceSize.replace(/[, _]/g, ""));
    if (audience !== undefined && (!Number.isFinite(audience) || audience < 0)) {
      setError("Audience size must be a positive number.");
      return;
    }
    setBusy(true);
    try {
      await onSaved({
        platform: platform.id,
        handle: handle.trim(),
        providerAccountId: providerAccountId.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
        audienceSize: audience,
        capabilities: caps,
        accessToken: accessToken.trim() || undefined,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not connect.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-scrim" onClick={() => !busy && onClose()}>
      <div className="modal cm" onClick={(e) => e.stopPropagation()}>
        <button className="modal__x" onClick={() => !busy && onClose()} aria-label="Close">×</button>

        <div className="cm__head">
          <span
            className="cm__chip"
            style={{ background: platform.color, color: platform.color === "#FFFC00" ? "#0e0d0b" : "#fff" }}
          >
            {platform.name.charAt(0)}
          </span>
          <div>
            <h2>{existing ? `Edit ${platform.name}` : `Connect ${platform.name}`}</h2>
            <p>{platform.blurb}</p>
          </div>
        </div>

        {stage === "consent" ? (
          <div className="cm__consent">
            <p className="cm__lede">
              We use the official {platform.name} API. New Riyadh Media will only do what you
              explicitly allow below — you can change permissions or disconnect at any time.
            </p>
            <ul className="cm__perms">
              {ALL_CAPS.map((c) => (
                <li key={c.id}>
                  <label>
                    <input type="checkbox" checked={caps.includes(c.id)} onChange={() => toggleCap(c.id)} />
                    <span>
                      <strong>{c.label}</strong>
                      <small>{c.desc}</small>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="cm__foot">
              <button className="btn btn--ghost btn--sm" onClick={onClose} disabled={busy}>
                Cancel
              </button>
              <button
                className="btn"
                onClick={() => setStage("details")}
                disabled={busy || caps.length === 0}
              >
                Continue to {platform.name} →
              </button>
            </div>
          </div>
        ) : (
          <div className="cm__details">
            <p className="cm__lede">
              {existing
                ? "Update the account details below — changes are saved when you click Save."
                : `Paste the ${platform.name} account info you want the AI strategist to work with.`}{" "}
              The access token is optional and only used when a server-side
              <code> {platform.oauthEnv}</code> is configured.
            </p>

            <div className="cm__grid">
              <label className="cm__field">
                <span>Handle / page name</span>
                <input className="input" value={handle} onChange={(e) => setHandle(e.target.value)} placeholder={platform.sampleHandle} dir="auto" />
              </label>
              <label className="cm__field">
                <span>Profile / page URL <em>optional</em></span>
                <input className="input" value={providerAccountId} onChange={(e) => setProviderAccountId(e.target.value)} placeholder={`https://${platform.id === "x" ? "x.com" : platform.id + ".com"}/${platform.sampleHandle.replace("@", "")}`} />
              </label>
              <label className="cm__field">
                <span>Audience size <em>optional</em></span>
                <input className="input" value={audienceSize} onChange={(e) => setAudienceSize(e.target.value)} placeholder="e.g. 12,500" inputMode="numeric" />
              </label>
              <label className="cm__field">
                <span>Avatar URL <em>optional</em></span>
                <input className="input" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://…/photo.jpg" />
              </label>
              <label className="cm__field cm__field--full">
                <span>Access token <em>optional, used by API</em></span>
                <input className="input" type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} placeholder="paste long-lived token (kept server-side)" />
              </label>
            </div>

            <h3 className="cm__h3">Permissions</h3>
            <ul className="cm__perms cm__perms--compact">
              {ALL_CAPS.map((c) => (
                <li key={c.id}>
                  <label>
                    <input type="checkbox" checked={caps.includes(c.id)} onChange={() => toggleCap(c.id)} />
                    <span><strong>{c.label}</strong></span>
                  </label>
                </li>
              ))}
            </ul>

            {error && <p className="cm__error">{error}</p>}

            <div className="cm__foot">
              <button className="btn btn--ghost btn--sm" onClick={onClose} disabled={busy}>Cancel</button>
              <button className="btn" onClick={submit} disabled={busy}>
                {busy ? "Saving…" : existing ? "Save changes" : `Authorize & connect`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
