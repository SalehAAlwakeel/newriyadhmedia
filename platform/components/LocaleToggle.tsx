"use client";

import { useRouter } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export default function LocaleToggle({ locale, label }: { locale: Locale; label: string }) {
  const router = useRouter();

  async function toggle() {
    const next: Locale = locale === "ar" ? "en" : "ar";
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: next }),
    });
    router.refresh();
  }

  return (
    <button type="button" className="ds-lang" onClick={toggle} aria-label="Switch language">
      {label}
    </button>
  );
}
