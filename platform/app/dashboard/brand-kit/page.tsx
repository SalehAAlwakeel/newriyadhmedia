import { getCurrentUser } from "@/lib/auth";
import PageHead from "../PageHead";
import BrandKit from "./BrandKit";

export const metadata = { title: "Brand Kit · New Riyadh Media" };

export default async function BrandKitPage() {
  const user = await getCurrentUser();
  return (
    <div className="ds-page">
      <PageHead
        eyebrow="Create · Brand Kit"
        title="Brand Kit"
        sub="Your media, style, voice and profile in one place. Everything the platform generates stays on-brand."
      />
      <BrandKit initial={user?.brandKit ?? null} company={user?.company ?? ""} />
    </div>
  );
}
