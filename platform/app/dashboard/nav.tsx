import type { ReactNode } from "react";

export interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  group: "Workspace" | "Create" | "Grow";
}

const i = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none"><path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", group: "Workspace", icon: i("M3 11l9-8 9 8M5 10v10a1 1 0 001 1h12a1 1 0 001-1V10") },
  { href: "/dashboard/insights", label: "Insights", group: "Workspace", icon: i("M3 13h4v8H3zM10 3h4v18h-4zM17 9h4v12h-4z") },
  { href: "/dashboard/assistant", label: "AI Strategist", group: "Workspace", icon: i("M12 3a7 7 0 017 7c0 2.4-1.2 4.5-3 5.7V18a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2.3C8.2 14.5 7 12.4 7 10a7 7 0 015-7zM10 22h4") },
  { href: "/dashboard/learning", label: "Learning", group: "Workspace", icon: i("M4 6a2 2 0 012-2h12a2 2 0 012 2M4 6v12a2 2 0 002 2h12a2 2 0 002-2V6M4 6l8 5 8-5") },

  { href: "/dashboard/calendar", label: "Calendar", group: "Create", icon: i("M4 5h16v16H4zM4 9h16M8 3v4M16 3v4") },
  { href: "/dashboard/campaigns", label: "Campaigns", group: "Create", icon: i("M3 11l18-8-8 18-2-7-8-3z") },
  { href: "/dashboard/content", label: "Content Preferences", group: "Create", icon: i("M4 6h16M4 12h16M4 18h10") },
  { href: "/dashboard/brand-kit", label: "Brand Kit", group: "Create", icon: i("M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z") },
  { href: "/dashboard/files", label: "Files & Projects", group: "Create", icon: i("M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z") },
  { href: "/dashboard/approvals", label: "Approvals", group: "Create", icon: i("M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z") },

  { href: "/dashboard/seo", label: "SEO", group: "Grow", icon: i("M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3") },
  { href: "/dashboard/integrations", label: "Integrations", group: "Grow", icon: i("M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M4 7h16v13a1 1 0 01-1 1H5a1 1 0 01-1-1zM9 12h6") },
];

export const NAV_GROUPS = ["Workspace", "Create", "Grow"] as const;
