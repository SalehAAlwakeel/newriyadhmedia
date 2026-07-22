"use client";

import Link from "next/link";
import { Play, FileText, PenLine, Mail, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { Campaign, GeneratedPost, MediaAsset, PostType } from "@/lib/db";
import PostViewer from "../PostViewer";

type Tab = "recents" | "media" | "weeks" | "archived";

const TABS: { id: Tab; label: string }[] = [
  { id: "recents", label: "Recents" },
  { id: "media", label: "Media Library" },
  { id: "weeks", label: "Weekly Folders" },
  { id: "archived", label: "Archived Posts" },
];

const PILL_CLS: Record<PostType, string> = {
  "Still Image": "rose",
  Carousel: "orange",
  "Short-form Video": "purple",
  Story: "rose",
  "Blog Post": "green",
  Email: "amber",
};

function isVideoUrl(u: string): boolean {
  return /\.(mp4|webm|mov)(\?|$)/i.test(u) || u.includes("type=video");
}

function timeAgo(iso: string): string {
  const ms = Date.now() - +new Date(iso);
  const s = Math.max(1, Math.floor(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 14) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function weekKey(iso: string): string {
  const w = startOfWeek(new Date(iso));
  return w.toISOString().slice(0, 10);
}

function fmtWeekRange(weekStart: Date): string {
  const end = new Date(weekStart);
  end.setDate(end.getDate() + 6);
  const opt: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${weekStart.toLocaleDateString("en-US", opt)} – ${end.toLocaleDateString("en-US", opt)}`;
}

function postTitle(p: GeneratedPost): string {
  return p.topic?.trim() || p.caption.split("\n")[0]?.slice(0, 60) || p.campaignName || "Untitled";
}

function postThumb(p: GeneratedPost): string | null {
  return (p.imageUrls ?? []).find((u) => u && !isVideoUrl(u)) ?? null;
}

function postActivityAt(p: GeneratedPost): string {
  return p.createdAt;
}

interface WeekFolder {
  key: string;
  label: string;
  range: string;
  count: number;
  posts: GeneratedPost[];
}

interface ArchiveFolder {
  name: string;
  count: number;
  when: string;
  posts: GeneratedPost[];
}

function buildWeekFolders(posts: GeneratedPost[]): WeekFolder[] {
  const map = new Map<string, GeneratedPost[]>();
  for (const p of posts) {
    if (p.status === "rejected") continue;
    const key = weekKey(p.scheduledFor || p.createdAt);
    const arr = map.get(key) ?? [];
    arr.push(p);
    map.set(key, arr);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, items]) => {
      const start = new Date(key);
      return {
        key,
        label: `Week of ${start.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`,
        range: fmtWeekRange(start),
        count: items.length,
        posts: items.sort((a, b) => +new Date(a.scheduledFor) - +new Date(b.scheduledFor)),
      };
    });
}

function buildArchived(posts: GeneratedPost[], campaigns: Campaign[]): ArchiveFolder[] {
  const published = posts.filter((p) => p.status === "published");
  const doneNames = new Set(campaigns.filter((c) => c.status === "done").map((c) => c.name));
  const map = new Map<string, GeneratedPost[]>();

  for (const p of published) {
    const arr = map.get(p.campaignName) ?? [];
    arr.push(p);
    map.set(p.campaignName, arr);
  }
  for (const name of doneNames) {
    if (!map.has(name)) map.set(name, posts.filter((p) => p.campaignName === name));
  }

  return [...map.entries()]
    .map(([name, items]) => {
      const latest = items.reduce((max, p) => (p.createdAt > max ? p.createdAt : max), items[0]?.createdAt ?? "");
      return {
        name,
        count: items.length,
        when: latest ? new Date(latest).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "",
        posts: items,
      };
    })
    .sort((a, b) => b.when.localeCompare(a.when));
}

function matchesQuery(text: string, q: string): boolean {
  return text.toLowerCase().includes(q.toLowerCase());
}

interface MediaGroup {
  id: string;
  title: string;
  items: MediaAsset[];
}

function isLogoAsset(m: MediaAsset): boolean {
  const t = `${m.label ?? ""} ${m.filename}`.toLowerCase();
  return t.includes("logo");
}

function groupMedia(items: MediaAsset[]): MediaGroup[] {
  const videos: MediaAsset[] = [];
  const photos: MediaAsset[] = [];
  const logos: MediaAsset[] = [];
  const other: MediaAsset[] = [];

  for (const m of items) {
    if (isLogoAsset(m)) logos.push(m);
    else if (m.kind === "video") videos.push(m);
    else if (m.kind === "image") photos.push(m);
    else other.push(m);
  }

  const groups: MediaGroup[] = [];
  if (videos.length) groups.push({ id: "videos", title: "Videos", items: videos });
  if (photos.length) groups.push({ id: "photos", title: "Photos", items: photos });
  if (logos.length) groups.push({ id: "logos", title: "Logos", items: logos });
  if (other.length) groups.push({ id: "other", title: "Other files", items: other });
  return groups;
}

function longformPosts(posts: GeneratedPost[]): GeneratedPost[] {
  return posts.filter((p) => p.type === "Blog Post" || p.type === "Email");
}

function fmtBytes(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} MB`;
  if (n >= 1000) return `${(n / 1000).toFixed(0)} KB`;
  return `${n} B`;
}

function MediaPreviewModal({
  asset,
  onClose,
  onDelete,
}: {
  asset: MediaAsset;
  onClose: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="modal-scrim" onClick={onClose}>
      <div className="modal media-preview" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal__x" onClick={onClose} aria-label="Close">×</button>
        <div className="media-preview__stage">
          {asset.kind === "video" ? (
            <video src={asset.url} controls autoPlay playsInline className="media-preview__video" />
          ) : asset.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.url} alt={asset.filename} className="media-preview__img" />
          ) : (
            <div className="media-preview__fallback">
              <span>{asset.filename}</span>
              <a href={asset.url} className="btn btn--sm" download>Download file</a>
            </div>
          )}
        </div>
        <div className="media-preview__meta">
          <div>
            <strong dir="auto">{asset.label || asset.filename}</strong>
            <span>{asset.source} · {fmtBytes(asset.sizeBytes)} · {new Date(asset.uploadedAt).toLocaleDateString()}</span>
          </div>
          <div className="media-preview__btns">
            <a href={asset.url} download={asset.filename} className="btn btn--ghost btn--sm">Download</a>
            <button
              type="button"
              className="btn btn--sm media-preview__del"
              onClick={() => {
                onDelete(asset.id);
                onClose();
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MediaLibraryGrid({
  groups,
  onOpen,
  onDelete,
}: {
  groups: MediaGroup[];
  onOpen: (m: MediaAsset) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="media-lib">
      {groups.map((g) => (
        <section key={g.id} className="media-lib__section">
          <div className="media-lib__head">
            <h3 className="media-lib__title">{g.title}</h3>
            <span className="media-lib__count">{g.items.length}</span>
          </div>
          <div className="media-lib__grid">
            {g.items.map((m) => (
              <article key={m.id} className="media-lib-card">
                <button type="button" className="media-lib-card__open" onClick={() => onOpen(m)}>
                  <div className="media-lib-card__media">
                    {m.kind === "video" ? (
                      <>
                        <video src={m.url} muted preload="metadata" playsInline />
                        <span className="media-lib-card__play" aria-hidden><Play size={26} fill="currentColor" /></span>
                      </>
                    ) : m.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.url} alt="" />
                    ) : (
                      <span className="media-lib-card__file"><FileText size={34} /></span>
                    )}
                  </div>
                  <div className="media-lib-card__body">
                    <strong dir="auto">{m.label || m.filename}</strong>
                    <span>{new Date(m.uploadedAt).toLocaleDateString()} · {fmtBytes(m.sizeBytes)}</span>
                  </div>
                </button>
                <div className="media-lib-card__actions">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => onOpen(m)}>View</button>
                  <button type="button" className="btn btn--ghost btn--sm media-lib-card__del" onClick={() => onDelete(m.id)}>Delete</button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default function Files({
  initialPosts,
  initialMedia,
  initialCampaigns,
}: {
  initialPosts: GeneratedPost[];
  initialMedia: MediaAsset[];
  initialCampaigns: Campaign[];
}) {
  const [tab, setTab] = useState<Tab>("recents");
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState(initialPosts);
  const [media, setMedia] = useState(initialMedia);
  const [viewing, setViewing] = useState<GeneratedPost | null>(null);
  const [weekFilter, setWeekFilter] = useState<string | null>(null);
  const [archiveFilter, setArchiveFilter] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<MediaAsset | null>(null);

  const recents = useMemo(() => {
    let list = [...posts].sort((a, b) => +new Date(postActivityAt(b)) - +new Date(postActivityAt(a)));
    if (weekFilter) {
      list = list.filter((p) => weekKey(p.scheduledFor || p.createdAt) === weekFilter);
    }
    if (archiveFilter) {
      list = list.filter((p) => p.campaignName === archiveFilter);
    }
    if (query.trim()) {
      const q = query.trim();
      list = list.filter(
        (p) =>
          matchesQuery(postTitle(p), q) ||
          matchesQuery(p.campaignName, q) ||
          matchesQuery(p.type, q) ||
          matchesQuery(p.caption, q),
      );
    }
    return list;
  }, [posts, query, weekFilter, archiveFilter]);

  const weeks = useMemo(() => {
    const folders = buildWeekFolders(posts);
    if (!query.trim()) return folders;
    const q = query.trim();
    return folders.filter((w) => matchesQuery(w.label, q) || matchesQuery(w.range, q));
  }, [posts, query]);

  const archived = useMemo(() => {
    const folders = buildArchived(posts, initialCampaigns);
    if (!query.trim()) return folders;
    const q = query.trim();
    return folders.filter((a) => matchesQuery(a.name, q));
  }, [posts, initialCampaigns, query]);

  const filteredMedia = useMemo(() => {
    if (!query.trim()) return media;
    const q = query.trim();
    return media.filter(
      (m) => matchesQuery(m.filename, q) || matchesQuery(m.label ?? "", q) || matchesQuery(m.kind, q),
    );
  }, [media, query]);

  const mediaGroups = useMemo(() => groupMedia(filteredMedia), [filteredMedia]);

  const filteredLongform = useMemo(() => {
    let list = longformPosts(posts);
    if (!query.trim()) return list;
    const q = query.trim();
    return list.filter(
      (p) => matchesQuery(postTitle(p), q) || matchesQuery(p.type, q) || matchesQuery(p.campaignName, q),
    );
  }, [posts, query]);

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploadBusy(true);
    try {
      for (const f of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", f);
        const res = await fetch("/api/media", { method: "POST", body: fd });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.asset) setMedia((m) => [data.asset, ...m]);
      }
    } finally {
      setUploadBusy(false);
    }
  }

  async function removeMedia(id: string) {
    if (!confirm("Delete this file?")) return;
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (res.ok) {
      setMedia((m) => m.filter((x) => x.id !== id));
      if (mediaPreview?.id === id) setMediaPreview(null);
    }
  }

  function openPost(p: GeneratedPost) {
    setViewing(p);
  }

  function clearFilters() {
    setWeekFilter(null);
    setArchiveFilter(null);
  }

  function openWeek(key: string) {
    setWeekFilter(key);
    setArchiveFilter(null);
    setTab("recents");
  }

  function openArchive(name: string) {
    setArchiveFilter(name);
    setWeekFilter(null);
    setTab("recents");
  }

  return (
    <>
      <div className="files-bar">
        <div className="files-bar__left">
          <div className="files-tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`files-tab ${tab === t.id ? "is-active" : ""}`}
                onClick={() => {
                  setTab(t.id);
                  if (t.id !== "recents") clearFilters();
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            className="input files-search"
            placeholder="Search files…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search files"
          />
        </div>
        {tab === "media" ? (
          <label className="btn btn--sm">
            {uploadBusy ? "Uploading…" : "+ Upload media"}
            <input type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={(e) => upload(e.target.files)} disabled={uploadBusy} />
          </label>
        ) : (
          <Link href="/dashboard/assistant" className="btn btn--sm">+ Create new</Link>
        )}
      </div>

      {(weekFilter || archiveFilter) && tab === "recents" && (
        <div className="files-filter">
          <span>
            Showing: {weekFilter ? weeks.find((w) => w.key === weekFilter)?.label : archiveFilter}
          </span>
          <button type="button" className="btn btn--ghost btn--sm" onClick={clearFilters}>Clear filter</button>
        </div>
      )}

      {tab === "recents" && (
        recents.length === 0 ? (
          <div className="empty-card">
            <p>{query || weekFilter || archiveFilter ? "No matches." : "Nothing here yet."}</p>
            <Link href="/dashboard/assistant" className="btn btn--sm"><Sparkles size={15} /> Generate content</Link>
          </div>
        ) : (
          <div className="file-grid">
            {recents.map((p) => {
              const thumb = postThumb(p);
              return (
                <button key={p.id} type="button" className="file-card file-card--btn" onClick={() => openPost(p)}>
                  <div className="file-card__thumb" data-kind={p.type}>
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={thumb} alt="" />
                    ) : null}
                  </div>
                  <strong dir="auto">{postTitle(p)}</strong>
                  <span>
                    <span className={`post-pill post-pill--${PILL_CLS[p.type]} post-pill--xs`}>{p.type}</span>
                    {" · "}
                    {timeAgo(postActivityAt(p))}
                  </span>
                </button>
              );
            })}
          </div>
        )
      )}

      {tab === "media" && (
        filteredMedia.length === 0 && filteredLongform.length === 0 ? (
          <div className="empty-card">
            <p>{query ? "No media matches your search." : "No uploads yet. Add images or videos for the AI to use."}</p>
            <label className="btn btn--sm">
              + Upload media
              <input type="file" accept="image/*,video/*" multiple style={{ display: "none" }} onChange={(e) => upload(e.target.files)} />
            </label>
          </div>
        ) : (
          <>
            {mediaGroups.length > 0 && (
              <MediaLibraryGrid groups={mediaGroups} onOpen={setMediaPreview} onDelete={removeMedia} />
            )}
            {filteredLongform.length > 0 && (
              <section className="media-lib__section">
                <div className="media-lib__head">
                  <h3 className="media-lib__title">Blogs & emails</h3>
                  <span className="media-lib__count">{filteredLongform.length}</span>
                </div>
                <div className="media-lib__grid">
                  {filteredLongform.map((p) => (
                    <article key={p.id} className="media-lib-card media-lib-card--doc">
                      <button type="button" className="media-lib-card__open" onClick={() => openPost(p)}>
                        <div className="media-lib-card__media media-lib-card__media--doc">
                          <span className="media-lib-card__docicon">{p.type === "Blog Post" ? <PenLine size={30} /> : <Mail size={30} />}</span>
                          <span className={`post-pill post-pill--${PILL_CLS[p.type]} post-pill--xs`}>{p.type}</span>
                        </div>
                        <div className="media-lib-card__body">
                          <strong dir="auto">{postTitle(p)}</strong>
                          <span>{timeAgo(p.createdAt)} · {p.campaignName}</span>
                        </div>
                      </button>
                      <div className="media-lib-card__actions">
                        <button type="button" className="btn btn--ghost btn--sm" onClick={() => openPost(p)}>Preview</button>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )
      )}

      {tab === "weeks" && (
        weeks.length === 0 ? (
          <div className="empty-card">
            <p>No weekly folders yet. Approved and scheduled posts appear here by week.</p>
            <Link href="/dashboard/campaigns" className="btn btn--sm">View campaigns</Link>
          </div>
        ) : (
          <div className="folder-grid">
            {weeks.map((w) => (
              <button key={w.key} type="button" className="folder folder--btn" onClick={() => openWeek(w.key)}>
                <span className="folder__icon">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" /></svg>
                </span>
                <strong>{w.label}</strong>
                <span>{w.count} {w.count === 1 ? "item" : "items"} · {w.range}</span>
              </button>
            ))}
          </div>
        )
      )}

      {tab === "archived" && (
        archived.length === 0 ? (
          <div className="empty-card">
            <p>Published posts and completed campaigns show up here.</p>
          </div>
        ) : (
          <div className="folder-grid">
            {archived.map((a) => (
              <button key={a.name} type="button" className="folder folder--archived folder--btn" onClick={() => openArchive(a.name)}>
                <span className="folder__icon">
                  <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M5 7l1 13a1 1 0 001 1h10a1 1 0 001-1l1-13M4 7l1-3h14l1 3M10 11v6M14 11v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                <strong dir="auto">{a.name}</strong>
                <span>{a.count} {a.count === 1 ? "post" : "posts"} · {a.when}</span>
              </button>
            ))}
          </div>
        )
      )}

      {viewing && (
        <PostViewer
          post={viewing}
          onClose={() => setViewing(null)}
          onChange={(updated) => {
            setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setViewing(updated);
          }}
        />
      )}

      {mediaPreview && (
        <MediaPreviewModal asset={mediaPreview} onClose={() => setMediaPreview(null)} onDelete={removeMedia} />
      )}
    </>
  );
}
