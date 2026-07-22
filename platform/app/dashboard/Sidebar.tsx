"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Home, BarChart3, Sparkles, GraduationCap, CalendarDays, Megaphone, SlidersHorizontal, Palette, FolderOpen, CheckCircle2, Search, Plug } from "lucide-react";
import type { Locale } from "@/lib/i18n";
import { NAV_GROUP_KEYS, NAV_KEYS, t } from "@/lib/i18n";
import LocaleToggle from "@/components/LocaleToggle";

const ICONS: Record<string, React.ReactNode> = {
  "/dashboard": <Home size={18} strokeWidth={1.75} />,
  "/dashboard/insights": <BarChart3 size={18} strokeWidth={1.75} />,
  "/dashboard/assistant": <Sparkles size={18} strokeWidth={1.75} />,
  "/dashboard/learning": <GraduationCap size={18} strokeWidth={1.75} />,
  "/dashboard/calendar": <CalendarDays size={18} strokeWidth={1.75} />,
  "/dashboard/campaigns": <Megaphone size={18} strokeWidth={1.75} />,
  "/dashboard/content": <SlidersHorizontal size={18} strokeWidth={1.75} />,
  "/dashboard/brand-kit": <Palette size={18} strokeWidth={1.75} />,
  "/dashboard/files": <FolderOpen size={18} strokeWidth={1.75} />,
  "/dashboard/approvals": <CheckCircle2 size={18} strokeWidth={1.75} />,
  "/dashboard/seo": <Search size={18} strokeWidth={1.75} />,
  "/dashboard/integrations": <Plug size={18} strokeWidth={1.75} />,
};

export default function Sidebar({
  name,
  company,
  plan,
  locale,
  open,
  onOpenChange,
}: {
  name: string;
  company: string;
  plan: string | null;
  locale: Locale;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const main = document.querySelector<HTMLElement>(".ds-main");
    if (!main) return;

    if (open) {
      main.dataset.scrollLock = String(main.scrollTop);
      main.classList.add("is-scroll-locked");
    } else {
      const scrollTop = Number(main.dataset.scrollLock || 0);
      main.classList.remove("is-scroll-locked");
      main.scrollTop = scrollTop;
      delete main.dataset.scrollLock;
    }

    return () => {
      main.classList.remove("is-scroll-locked");
      delete main.dataset.scrollLock;
    };
  }, [open]);

  const setOpen = (next: boolean) => onOpenChange(next);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));

  return (
    <>
      <aside className={`ds-side ${open ? "is-open" : ""}`}>
        <Link href="/dashboard" className="ds-side__brand" onClick={() => setOpen(false)}>
          <b>New Riyadh Media</b>
          <span>{t("nav.platform", locale)}</span>
        </Link>

        <nav className="ds-nav">
          {NAV_GROUP_KEYS.map((groupKey) => (
            <div key={groupKey} className="ds-nav__group">
              <span className="ds-nav__label">{t(groupKey, locale)}</span>
              {NAV_KEYS.filter((n) => n.group === groupKey).map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`ds-nav__link ${isActive(item.href) ? "is-active" : ""}`}
                  onClick={() => setOpen(false)}
                >
                  <span className="ds-nav__icon">{ICONS[item.href]}</span>
                  <span>{t(item.key, locale)}</span>
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
              <span>{company || (plan ? `${plan} ${t("dashboard.plan", locale)}` : t("dashboard.member", locale))}</span>
            </div>
          </div>
          <LocaleToggle locale={locale} label={t("nav.lang", locale)} />
          <button className="ds-logout" onClick={logout}>{t("nav.signOut", locale)}</button>
        </div>
      </aside>
      {open && <div className="ds-scrim" onClick={() => setOpen(false)} />}
    </>
  );
}
