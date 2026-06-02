"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { NAV, NAV_GROUPS } from "./nav";

export default function Sidebar({ name, company, plan }: { name: string; company: string; plan: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));

  return (
    <>
      <button className="ds-burger" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu">
        <svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>
      <aside className={`ds-side ${open ? "is-open" : ""}`}>
        <Link href="/dashboard" className="ds-side__brand" onClick={() => setOpen(false)}>
          <b>New Riyadh Media</b>
          <span>Platform</span>
        </Link>

        <nav className="ds-nav">
          {NAV_GROUPS.map((group) => (
            <div key={group} className="ds-nav__group">
              <span className="ds-nav__label">{group}</span>
              {NAV.filter((n) => n.group === group).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`ds-nav__link ${isActive(item.href) ? "is-active" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="ds-nav__icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="ds-side__foot">
          <div className="ds-user">
            <div className="ds-user__avatar">{name.charAt(0).toUpperCase()}</div>
            <div className="ds-user__meta">
              <strong>{name}</strong>
              <span>{company || (plan ? `${plan} plan` : "Member")}</span>
            </div>
          </div>
          <button className="ds-logout" onClick={logout}>Sign out</button>
        </div>
      </aside>
      {open && <div className="ds-scrim" onClick={() => setOpen(false)} />}
    </>
  );
}
