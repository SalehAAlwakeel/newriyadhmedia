import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Sidebar from "./Sidebar";

export const metadata = { title: "Dashboard · New Riyadh Media" };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.subscribed) redirect("/subscribe");

  const credits = user.credits ?? 200;
  const initial = user.name.charAt(0).toUpperCase();

  return (
    <div className="ds">
      <Sidebar name={user.name} company={user.company} plan={user.plan} />
      <div className="ds-main">
        <div className="ds-topbar">
          <div className="ds-topbar__right">
            <span className="ds-credits">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
              {credits.toLocaleString()} Credits
            </span>
            <Link href="/subscribe" className="ds-upgrade">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 10V8a6 6 0 1112 0v2M5 10h14v9a1 1 0 01-1 1H6a1 1 0 01-1-1z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Upgrade
            </Link>
            <span className="ds-topbar__avatar">{initial}</span>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
