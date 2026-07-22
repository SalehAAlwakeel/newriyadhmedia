import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n.server";
import { t } from "@/lib/i18n";
import LocaleToggle from "@/components/LocaleToggle";
import PlanPicker from "./PlanPicker";

export const metadata = { title: "Choose your plan · New Riyadh Media" };

export default async function SubscribePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.subscribed) redirect("/dashboard");

  const locale = await getLocale();

  return (
    <div className="wrap" style={{ maxWidth: 1040, margin: "0 auto", padding: "64px 24px" }}>
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
        <LocaleToggle locale={locale} label={t("nav.lang", locale)} />
      </div>
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <span className="eyebrow">[ One step left, {user.name.split(" ")[0]} ]</span>
      </div>
      <h1 className="display" style={{ textAlign: "center", fontSize: "clamp(32px, 5vw, 56px)" }}>
        {t("subscribe.title", locale)}
      </h1>
      <p className="lede" style={{ textAlign: "center", maxWidth: "60ch", margin: "0 auto 40px" }}>
        {t("subscribe.lede", locale)}
      </p>
      <Suspense fallback={<p>Loading plans…</p>}>
        <PlanPicker />
      </Suspense>
      <p style={{ textAlign: "center", color: "var(--ink-mute)", fontSize: 13, marginTop: 24 }}>
        {t("subscribe.payment", locale)}
      </p>
    </div>
  );
}
