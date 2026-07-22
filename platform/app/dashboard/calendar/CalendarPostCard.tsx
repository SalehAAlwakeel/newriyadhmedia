"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import type { GeneratedPost, PostType } from "@/lib/db";
import PostViewer from "../PostViewer";

const PILL_CLS: Record<PostType, string> = {
  "Still Image": "rose",
  Carousel: "orange",
  "Short-form Video": "purple",
  Story: "rose",
  "Blog Post": "green",
  Email: "amber",
};

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function CalendarPostCard({ post: initial }: { post: GeneratedPost }) {
  const [post, setPost] = useState(initial);
  const [open, setOpen] = useState(false);

  return (
    <>
      <article className="post-card post-card--clickable" onClick={() => setOpen(true)} role="button" tabIndex={0}>
        <div className="post-card__top">
          <span className={`post-pill post-pill--${PILL_CLS[post.type]}`}>{post.type}</span>
          <span className="post-card__time">{fmtTime(post.scheduledFor)}</span>
        </div>
        <div className="post-card__media">
          {post.imageUrls[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.imageUrls[0]} alt="" />
          ) : (
            <div className="post-card__placeholder" />
          )}
          {post.status === "generating" && <span className="post-card__gen"><Sparkles size={12} /> Generating…</span>}
        </div>
        <div className="post-card__foot">
          <span className="post-card__status">
            {post.status === "approved" ? "Approved" : post.status === "ready" ? "Ready to publish" : post.status === "rejected" ? "Rejected" : "Generating…"}
          </span>
        </div>
      </article>

      {open && (
        <PostViewer post={post} onClose={() => setOpen(false)} onChange={(u) => setPost(u)} />
      )}
    </>
  );
}
