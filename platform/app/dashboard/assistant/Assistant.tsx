"use client";

import { useRef, useState } from "react";

interface Msg { role: "user" | "assistant"; content: string }

const SUGGESTIONS = [
  "What worked best last week?",
  "Draft this week's content calendar",
  "Why is my engagement dropping on X?",
  "Give me 5 Reel ideas for Ramadan",
];

export default function Assistant({ company }: { company: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: `Hi — I'm your strategist for ${company}. I've been watching your numbers this week. Ask me anything, or pick a starting point below.` },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m.role === "user" || m.role === "assistant").slice(-20) }),
      });
      const data = await res.json().catch(() => ({}));
      setMessages((m) => [...m, { role: "assistant", content: data.reply || data.error || "Something went wrong." }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network error. Please try again." }]);
    } finally {
      setBusy(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
    }
  }

  return (
    <div className="chat">
      <div className="chat__scroll" ref={scrollRef}>
        {messages.map((m, idx) => (
          <div key={idx} className={`chat__msg chat__msg--${m.role}`}>
            {m.role === "assistant" && <span className="chat__avatar">N</span>}
            <div className="chat__bubble" dir="auto">{m.content}</div>
          </div>
        ))}
        {busy && (
          <div className="chat__msg chat__msg--assistant">
            <span className="chat__avatar">N</span>
            <div className="chat__bubble chat__bubble--typing"><span /><span /><span /></div>
          </div>
        )}
      </div>

      {messages.length <= 1 && (
        <div className="chat__suggest">
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => send(s)} className="chat__chip">{s}</button>
          ))}
        </div>
      )}

      <form className="chat__form" onSubmit={(e) => { e.preventDefault(); send(input); }}>
        <input
          className="input"
          placeholder="Ask your strategist…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          dir="auto"
        />
        <button className="btn" type="submit" disabled={busy || !input.trim()}>Send</button>
      </form>
    </div>
  );
}
