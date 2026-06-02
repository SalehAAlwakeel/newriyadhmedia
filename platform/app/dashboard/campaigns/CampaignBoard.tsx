"use client";

import { useEffect, useState } from "react";

export interface CampaignPost {
  img: string;
  platform: string;
  caption: string;
}

export interface Campaign {
  name: string;
  tag: string;
  img: string;
  timing: string;
  status: string;
  isNew?: boolean;
  description: string;
  posts: CampaignPost[];
}

export default function CampaignBoard({ campaigns }: { campaigns: Campaign[] }) {
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [lightbox, setLightbox] = useState<CampaignPost | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (lightbox) setLightbox(null);
      else if (selected) setSelected(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightbox, selected]);

  return (
    <>
      <div className="camp2">
        <div className="camp2__head">
          <span>Campaign</span>
          <span>Timing</span>
          <span>Status</span>
        </div>
        {campaigns.map((c) => (
          <button key={c.name} type="button" className="camp2__row camp2__row--btn" onClick={() => setSelected(c)}>
            <div className="camp2__main">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.img} alt="" className="camp2__thumb" />
              <div>
                <h3 className="camp2__name">
                  {c.name}
                  {c.isNew && <span className="camp2__new">New</span>}
                </h3>
                <span className="camp2__tag">💡 {c.tag}</span>
              </div>
            </div>
            <span className="camp2__timing">{c.timing}</span>
            <span className="camp2__status">{c.status}</span>
          </button>
        ))}
      </div>

      {selected && (
        <div className="modal-scrim" onClick={() => setSelected(null)}>
          <div className="modal modal--campaign" onClick={(e) => e.stopPropagation()}>
            <button className="modal__x" onClick={() => setSelected(null)} aria-label="Close">×</button>
            <div className="modal__head">
              <div className="modal__campaign">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={selected.img} alt="" className="camp2__thumb" />
                <div>
                  <h2>{selected.name}</h2>
                  <span className="camp-detail__timing">{selected.timing}</span>
                </div>
              </div>
            </div>

            <p className="modal__lede">{selected.description}</p>

            <div className="camp-detail__meta">
              <span className="camp2__tag">💡 {selected.tag}</span>
              <span className="camp2__status">{selected.status}</span>
            </div>

            <h3 className="camp-detail__h">Generated content · {selected.posts.length} posts</h3>
            <div className="camp-grid">
              {selected.posts.map((p, idx) => (
                <figure key={idx} className="camp-card">
                  <button type="button" className="camp-card__media" onClick={() => setLightbox(p)} aria-label="View full screen">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt="" />
                    <span className="camp-card__zoom">⤢</span>
                  </button>
                  <figcaption className="camp-card__body">
                    <span className="camp-card__platform">{p.platform}</span>
                    <p>{p.caption}</p>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      )}

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <button className="lightbox__x" onClick={() => setLightbox(null)} aria-label="Close">×</button>
          <figure className="lightbox__inner" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={lightbox.img.replace(/w=\d+/, "w=1400")} alt="" />
            <figcaption>
              <span className="camp-card__platform">{lightbox.platform}</span>
              <p>{lightbox.caption}</p>
            </figcaption>
          </figure>
        </div>
      )}
    </>
  );
}
