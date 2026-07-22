"use client";

import { useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";
import { useRouter } from "next/navigation";
import type { GeneratedPost, PostType } from "@/lib/db";

const PILL_CLS: Record<PostType, string> = {
  "Still Image": "rose",
  Carousel: "orange",
  "Short-form Video": "purple",
  Story: "rose",
  "Blog Post": "green",
  Email: "amber",
};

const PORTRAIT: PostType[] = ["Story", "Short-form Video"];
const LONGFORM: PostType[] = ["Blog Post", "Email"];

// A persisted video is served at /api/media/file/<id>?type=video (no extension),
// while provider fallbacks keep their .mp4/.webm extension.
function isVideoUrl(u: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(u) || u.includes("type=video");
}

function fmtWhen(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })} · ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

// Minimal, safe markdown rendering for blog/email bodies (no raw HTML).
function renderBody(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`ul-${out.length}`} className="pv-body__ul">
          {list.map((li, i) => <li key={i}>{li}</li>)}
        </ul>,
      );
      list = [];
    }
  };
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    if (/^#{1,3}\s+/.test(line)) {
      flush();
      const level = (line.match(/^#+/)?.[0].length ?? 1);
      const txt = line.replace(/^#+\s+/, "");
      out.push(level <= 2
        ? <h3 key={`h-${i}`} className="pv-body__h">{txt}</h3>
        : <h4 key={`h-${i}`} className="pv-body__h4">{txt}</h4>);
    } else if (/^[-*]\s+/.test(line)) {
      list.push(line.replace(/^[-*]\s+/, ""));
    } else if (line === "") {
      flush();
    } else {
      flush();
      out.push(<p key={`p-${i}`} className="pv-body__p" dir="auto">{line}</p>);
    }
  });
  flush();
  return out;
}

export default function PostViewer({
  post: initial,
  onClose,
  onChange,
}: {
  post: GeneratedPost;
  onClose: () => void;
  onChange?: (p: GeneratedPost) => void;
}) {
  const router = useRouter();
  const [post, setPost] = useState<GeneratedPost>(initial);
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [frame, setFrame] = useState(0);
  const [playing, setPlaying] = useState(post.type === "Short-form Video");

  // Editable draft
  const [caption, setCaption] = useState(post.caption);
  const [body, setBody] = useState(post.body ?? "");
  const [tags, setTags] = useState((post.hashtags ?? []).join(", "));
  const [when, setWhen] = useState(post.scheduledFor.slice(0, 16));

  const allMedia = post.imageUrls ?? [];
  const videoUrl = allMedia.find(isVideoUrl);
  const images = allMedia.filter((u) => !isVideoUrl(u));
  const isGallery = images.length > 1;
  const isVideoType = post.type === "Short-form Video";
  const isVideoPreview = isVideoType && !videoUrl;
  // Slideshow fallback when no MP4 exists (no GEMINI_API_KEY, or Veo failed).
  const isSlideshow = isVideoPreview && images.length > 1;
  const isLong = LONGFORM.includes(post.type);

  // Auto-advance slideshow when there's no real video.
  useEffect(() => {
    if (!isSlideshow || !playing || images.length < 2) return;
    const t = setInterval(() => setFrame((f) => (f + 1) % images.length), 1500);
    return () => clearInterval(t);
  }, [isSlideshow, playing, images.length]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, onClose]);

  function sync(next: GeneratedPost) {
    setPost(next);
    onChange?.(next);
  }

  async function save() {
    setBusy("save");
    try {
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: post.id,
          caption,
          body,
          hashtags: tags.split(/[,\n]/).map((t) => t.trim()).filter(Boolean),
          scheduledFor: new Date(when).toISOString(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.post) {
        sync(data.post);
        setEdit(false);
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function regenerate(parts: { text?: boolean; images?: boolean }) {
    setBusy(parts.images && !parts.text ? "regen-img" : parts.text && !parts.images ? "regen-txt" : "regen-all");
    try {
      const res = await fetch(`/api/posts/${post.id}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parts }),
      });
      const data = await res.json();
      if (res.ok && data.post) {
        sync(data.post);
        setCaption(data.post.caption);
        setBody(data.post.body ?? "");
        setTags((data.post.hashtags ?? []).join(", "));
        setFrame(0);
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function setStatus(status: "approved" | "rejected") {
    setBusy(status);
    try {
      const res = await fetch("/api/posts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, status }),
      });
      const data = await res.json();
      if (res.ok && data.post) {
        sync(data.post);
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  async function copyCaption() {
    const text = [post.caption, (post.hashtags ?? []).map((h) => `#${h}`).join(" ")].filter(Boolean).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setBusy("copied");
      setTimeout(() => setBusy(null), 1200);
    } catch {
      /* clipboard blocked */
    }
  }

  const statusLabel =
    post.status === "approved" ? "Approved"
    : post.status === "rejected" ? "Rejected"
    : post.status === "published" ? "Published"
    : post.status === "ready" ? "Ready to review"
    : post.status === "failed" ? "Failed"
    : "Generating…";

  return (
    <div className="modal-scrim" onClick={() => !busy && onClose()}>
      <div className="modal modal--viewer" onClick={(e) => e.stopPropagation()}>
        <button className="modal__x" onClick={() => !busy && onClose()} aria-label="Close">×</button>

        <div className="pv">
          {/* Media side */}
          <div className={`pv__media ${PORTRAIT.includes(post.type) ? "pv__media--portrait" : ""}`}>
            {videoUrl ? (
              <video
                className="pv__video"
                src={videoUrl}
                poster={images[0]}
                controls
                autoPlay
                muted
                loop
                playsInline
              />
            ) : images.length > 0 ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={images[Math.min(frame, images.length - 1)]} alt="" />
                {isGallery && (
                  <>
                    <button className="pv__nav pv__nav--prev" onClick={() => setFrame((f) => (f - 1 + images.length) % images.length)} aria-label="Previous">‹</button>
                    <button className="pv__nav pv__nav--next" onClick={() => setFrame((f) => (f + 1) % images.length)} aria-label="Next">›</button>
                    <div className="pv__dots">
                      {images.map((_, i) => (
                        <span key={i} className={`pv__dot ${i === frame ? "is-on" : ""}`} onClick={() => setFrame(i)} />
                      ))}
                    </div>
                  </>
                )}
                {isSlideshow && (
                  <button className="pv__play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? "Pause" : "Play"}>
                    {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                  </button>
                )}
                {isVideoPreview && (
                  <span className="pv__badge-vid">
                    {isSlideshow
                      ? `Slideshow preview · ${images.length} frames`
                      : "Still preview — use Regenerate video for MP4"}
                  </span>
                )}
              </>
            ) : (
              <div className="pv__noimg">{isLong ? "Article" : "No image"}</div>
            )}
          </div>

          {/* Content side */}
          <div className="pv__content">
            <div className="pv__head">
              <span className={`post-pill post-pill--${PILL_CLS[post.type]}`}>{post.type}</span>
              <span className={`pv__status pv__status--${post.status}`}>{statusLabel}</span>
            </div>
            <div className="pv__when">{fmtWhen(post.scheduledFor)} · {post.campaignName}</div>

            {!edit ? (
              <div className="pv__read">
                {isLong && <p className="pv__lede" dir="auto">{post.caption}</p>}
                {isLong && post.body ? (
                  <div className="pv-body">{renderBody(post.body)}</div>
                ) : (
                  <p className="pv__caption" dir="auto">{post.caption}</p>
                )}
                {(post.hashtags?.length ?? 0) > 0 && (
                  <div className="pv__tags">
                    {post.hashtags!.map((h) => <span key={h} className="pv__tag">#{h}</span>)}
                  </div>
                )}
                {isVideoPreview && (
                  <p className="pv__video-note">
                    Short-form Video uses <strong>Google Veo 3.1</strong> (Gemini API). Add{" "}
                    <code>GEMINI_API_KEY</code> to <code>.env.local</code>, restart the server, then click{" "}
                    <strong>Regenerate video</strong>.
                  </p>
                )}
                {post.imageUrls?.some((u) => u.includes("picsum.photos")) && !isVideoType && (
                  <p className="pv__video-note">
                    Placeholder image — add <code>OPENAI_API_KEY</code> to <code>.env.local</code> for real{" "}
                    GPT Image 2 photos, then <strong>Regenerate image</strong>.
                  </p>
                )}
              </div>
            ) : (
              <div className="pv__edit">
                <label className="pv__label">{post.type === "Email" ? "Subject" : "Caption"}</label>
                <textarea className="input pv__ta" dir="auto" rows={isLong ? 2 : 5} value={caption} onChange={(e) => setCaption(e.target.value)} />
                {isLong && (
                  <>
                    <label className="pv__label">{post.type === "Email" ? "Email body" : "Article body"} (markdown)</label>
                    <textarea className="input pv__ta pv__ta--body" dir="auto" rows={12} value={body} onChange={(e) => setBody(e.target.value)} />
                  </>
                )}
                {!isLong && (
                  <>
                    <label className="pv__label">Hashtags (comma separated)</label>
                    <input className="input" value={tags} onChange={(e) => setTags(e.target.value)} />
                  </>
                )}
                <label className="pv__label">Scheduled for</label>
                <input className="input" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
              </div>
            )}

            {/* Actions */}
            <div className="pv__actions">
              {!edit ? (
                <>
                  <button className="btn btn--sm" onClick={() => setEdit(true)} disabled={!!busy}>Edit</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => regenerate({ text: true })} disabled={!!busy}>
                    {busy === "regen-txt" ? "…" : "Regenerate text"}
                  </button>
                  {!isLong && (
                    <button className="btn btn--ghost btn--sm" onClick={() => regenerate({ images: true })} disabled={!!busy}>
                      {busy === "regen-img" ? "…" : isVideoType ? "Regenerate video" : "Regenerate image"}
                    </button>
                  )}
                  <button className="btn btn--ghost btn--sm" onClick={copyCaption} disabled={!!busy}>
                    {busy === "copied" ? "Copied ✓" : "Copy caption"}
                  </button>
                  {(videoUrl || images[0]) && (
                    <a className="btn btn--ghost btn--sm" href={videoUrl ?? images[Math.min(frame, images.length - 1)]} download target="_blank" rel="noreferrer">
                      {videoUrl ? "Download video" : "Download"}
                    </a>
                  )}
                  <span className="pv__spacer" />
                  {(post.status === "ready" || post.status === "generating") && (
                    <>
                      <button className="btn btn--sm" onClick={() => setStatus("approved")} disabled={!!busy}>{busy === "approved" ? "…" : "Approve"}</button>
                      <button className="btn btn--ghost btn--sm" onClick={() => setStatus("rejected")} disabled={!!busy}>Reject</button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <button className="btn btn--sm" onClick={save} disabled={!!busy}>{busy === "save" ? "Saving…" : "Save changes"}</button>
                  <button className="btn btn--ghost btn--sm" onClick={() => { setEdit(false); setCaption(post.caption); setBody(post.body ?? ""); setTags((post.hashtags ?? []).join(", ")); setWhen(post.scheduledFor.slice(0, 16)); }} disabled={!!busy}>Cancel</button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
