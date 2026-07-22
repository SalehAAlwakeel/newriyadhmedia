"use client";

import Link from "next/link";
import { useState } from "react";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import LocaleToggle from "@/components/LocaleToggle";
import Sidebar from "./Sidebar";

export default function DashboardShell({
  locale,
  credits,
  initial,
  name,
  company,
  plan,
  children,
}: {
  locale: Locale;
  credits: number;
  initial: string;
  name: string;
  company: string;
  plan: string | null;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="ds">
      <Sidebar
        name={name}
        company={company}
        plan={plan}
        locale={locale}
        open={menuOpen}
        onOpenChange={setMenuOpen}
      />
      <div className="ds-main">
        <header className="ds-topbar">
          <button
            type="button"
            className="ds-burger"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <div className="ds-topbar__right">
            <LocaleToggle locale={locale} label={t("nav.lang", locale)} />
            <span className="ds-credits" title={t("nav.credits", locale)}>
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
              <span className="ds-credits__num">{credits.toLocaleString()}</span>
              <span className="ds-credits__label">{t("nav.credits", locale)}</span>
            </span>
            <Link href="/subscribe" className="ds-upgrade">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M6 10V8a6 6 0 1112 0v2M5 10h14v9a1 1 0 01-1 1H6a1 1 0 01-1-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="ds-upgrade__label">{t("nav.upgrade", locale)}</span>
            </Link>
            <span className="ds-topbar__avatar" aria-hidden="true">{initial}</span>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
