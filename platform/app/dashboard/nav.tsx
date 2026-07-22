import type { ReactNode } from "react";
import {
  Home,
  BarChart3,
  Sparkles,
  GraduationCap,
  CalendarDays,
  Megaphone,
  SlidersHorizontal,
  Palette,
  FolderOpen,
  CheckCircle2,
  Search,
  Plug,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  group: "Workspace" | "Create" | "Grow";
}

const ICON = { size: 18, strokeWidth: 1.75 } as const;

export const NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", group: "Workspace", icon: <Home {...ICON} /> },
  { href: "/dashboard/insights", label: "Insights", group: "Workspace", icon: <BarChart3 {...ICON} /> },
  { href: "/dashboard/assistant", label: "Content studio", group: "Workspace", icon: <Sparkles {...ICON} /> },
  { href: "/dashboard/learning", label: "Learning", group: "Workspace", icon: <GraduationCap {...ICON} /> },

  { href: "/dashboard/calendar", label: "Calendar", group: "Create", icon: <CalendarDays {...ICON} /> },
  { href: "/dashboard/campaigns", label: "Campaigns", group: "Create", icon: <Megaphone {...ICON} /> },
  { href: "/dashboard/content", label: "Content Preferences", group: "Create", icon: <SlidersHorizontal {...ICON} /> },
  { href: "/dashboard/brand-kit", label: "Brand Kit", group: "Create", icon: <Palette {...ICON} /> },
  { href: "/dashboard/files", label: "Files & Projects", group: "Create", icon: <FolderOpen {...ICON} /> },
  { href: "/dashboard/approvals", label: "Approvals", group: "Create", icon: <CheckCircle2 {...ICON} /> },

  { href: "/dashboard/seo", label: "SEO", group: "Grow", icon: <Search {...ICON} /> },
  { href: "/dashboard/integrations", label: "Integrations", group: "Grow", icon: <Plug {...ICON} /> },
];

export const NAV_GROUPS = ["Workspace", "Create", "Grow"] as const;
