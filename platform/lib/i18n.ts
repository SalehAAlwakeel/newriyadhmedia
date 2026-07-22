import en from "./locales/en.json";
import ar from "./locales/ar.json";

export type Locale = "en" | "ar";

const dicts: Record<Locale, Record<string, string>> = { en, ar };

export const LOCALE_COOKIE = "nrm_locale";

export function t(key: string, locale: Locale): string {
  return dicts[locale][key] ?? dicts.en[key] ?? key;
}

export function dirFor(locale: Locale): "ltr" | "rtl" {
  return locale === "ar" ? "rtl" : "ltr";
}

/** Nav label keys mapped to routes */
export const NAV_KEYS: { href: string; key: string; group: "nav.group.workspace" | "nav.group.create" | "nav.group.grow" }[] = [
  { href: "/dashboard", key: "nav.home", group: "nav.group.workspace" },
  { href: "/dashboard/insights", key: "nav.insights", group: "nav.group.workspace" },
  { href: "/dashboard/assistant", key: "nav.studio", group: "nav.group.workspace" },
  { href: "/dashboard/learning", key: "nav.learning", group: "nav.group.workspace" },
  { href: "/dashboard/calendar", key: "nav.calendar", group: "nav.group.create" },
  { href: "/dashboard/campaigns", key: "nav.campaigns", group: "nav.group.create" },
  { href: "/dashboard/content", key: "nav.content", group: "nav.group.create" },
  { href: "/dashboard/brand-kit", key: "nav.brandKit", group: "nav.group.create" },
  { href: "/dashboard/files", key: "nav.files", group: "nav.group.create" },
  { href: "/dashboard/approvals", key: "nav.approvals", group: "nav.group.create" },
  { href: "/dashboard/seo", key: "nav.seo", group: "nav.group.grow" },
  { href: "/dashboard/integrations", key: "nav.integrations", group: "nav.group.grow" },
];

export const NAV_GROUP_KEYS = ["nav.group.workspace", "nav.group.create", "nav.group.grow"] as const;
