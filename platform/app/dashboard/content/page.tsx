import { getCurrentUser } from "@/lib/auth";
import PageHead from "../PageHead";
import ContentForm from "./ContentForm";

export const metadata = { title: "Content Preferences · New Riyadh Media" };

export default async function ContentPage() {
  const user = await getCurrentUser();
  return (
    <div className="ds-page">
      <PageHead
        eyebrow="Create · Content Preferences"
        title="Content Preferences"
        sub="Control how the AI transforms your assets, handles video, and tailors captions per platform."
      />
      <ContentForm initial={user?.contentPrefs ?? null} />
    </div>
  );
}
