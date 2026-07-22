"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

const TYPES = ["Still Image", "Carousel", "Short-form Video", "Story", "Blog Post", "Email"] as const;
type DraftType = (typeof TYPES)[number];

interface Draft {
  id: number;
  topic: string;
  type: DraftType;
  when: string; // human-readable for display
  scheduledFor: string; // ISO
}

function nextSlot(offsetDays: number): { when: string; scheduledFor: string } {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays + 1);
  d.setHours(10, 0, 0, 0);
  return {
    when: d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }),
    scheduledFor: d.toISOString(),
  };
}

export default function NewPostButton({ label = "+ Create New", className = "btn" }: { label?: string; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Draft[]>(() => {
    const s = nextSlot(0);
    return [{ id: 1, topic: "", type: "Short-form Video", ...s }];
  });
  const [next, setNext] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [campaignName, setCampaignName] = useState("Custom");

  function addDraft() {
    const s = nextSlot(drafts.length);
    setDrafts((d) => [...d, { id: next, topic: "", type: "Still Image", ...s }]);
    setNext((n) => n + 1);
  }
  function update(id: number, patch: Partial<Draft>) {
    setDrafts((d) => d.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }
  function remove(id: number) {
    setDrafts((d) => (d.length === 1 ? d : d.filter((x) => x.id !== id)));
  }

  async function schedule() {
    setBusy(true);
    setError(null);
    try {
      for (const d of drafts) {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: d.type,
            topic: d.topic || undefined,
            campaignName,
            scheduledFor: d.scheduledFor,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error || `Generation failed for ${d.type}`);
        }
      }
      setOpen(false);
      router.refresh();
      // reset
      const s = nextSlot(0);
      setDrafts([{ id: 1, topic: "", type: "Short-form Video", ...s }]);
      setNext(2);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button className={className} onClick={() => setOpen(true)}>{label}</button>

      {open && (
        <div className="modal-scrim" onClick={() => !busy && setOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal__x" onClick={() => !busy && setOpen(false)} aria-label="Close">×</button>
            <div className="modal__head">
              <h2>New Post</h2>
              <div className="modal__campaign">
                <span>Campaign</span>
                <input className="input input--sm" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} placeholder="Campaign name" />
              </div>
            </div>
            <p className="modal__lede">
              Create one or more posts with AI. Leave the topic blank and the strategist will pick one from your brand kit.
            </p>

            <div className="modal__drafts">
              {drafts.map((d) => (
                <div key={d.id} className="np-draft">
                  <div className="np-draft__thumb">
                    <span><Sparkles size={13} /> Will generate on schedule</span>
                  </div>
                  <div className="np-draft__body">
                    <div className="np-draft__topicrow">
                      <span className="np-draft__label">Topic (optional)</span>
                      {drafts.length > 1 && <button className="np-draft__reroll" onClick={() => remove(d.id)} aria-label="Remove draft">×</button>}
                    </div>
                    <input
                      className="input input--sm"
                      dir="auto"
                      placeholder="e.g. How to start your first online request"
                      value={d.topic}
                      onChange={(e) => update(d.id, { topic: e.target.value })}
                    />
                    <div className="np-draft__controls">
                      <select className="input input--sm" value={d.type} onChange={(e) => update(d.id, { type: e.target.value as DraftType })}>
                        {TYPES.map((t) => <option key={t}>{t}</option>)}
                      </select>
                      <label className="np-draft__when">Posting on
                        <input
                          className="input input--sm"
                          type="datetime-local"
                          value={d.scheduledFor.slice(0, 16)}
                          onChange={(e) => {
                            const iso = new Date(e.target.value).toISOString();
                            update(d.id, { scheduledFor: iso, when: new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) });
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {error && <p className="hint" style={{ color: "#b54545" }}>{error}</p>}

            <div className="modal__foot">
              <div className="modal__foot-l">
                <button className="btn btn--ghost btn--sm" onClick={addDraft} disabled={busy}>+ Add another</button>
              </div>
              <button className="btn" onClick={schedule} disabled={busy}>{busy ? "Generating…" : `Generate ${drafts.length} Post${drafts.length === 1 ? "" : "s"}`}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
