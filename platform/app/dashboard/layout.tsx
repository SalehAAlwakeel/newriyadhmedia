import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getLocale } from "@/lib/i18n.server";
import DashboardShell from "./DashboardShell";

export const metadata = { title: "Dashboard · New Riyadh Media" };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.subscribed) redirect("/subscribe");

  const locale = await getLocale();
  const credits = user.credits ?? 0;
  const initial = user.name.charAt(0).toUpperCase();

  return (
    <DashboardShell
      locale={locale}
      credits={credits}
      initial={initial}
      name={user.name}
      company={user.company}
      plan={user.plan}
    >
      {children}
    </DashboardShell>
  );
}
