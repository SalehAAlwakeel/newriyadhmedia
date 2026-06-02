import { getCurrentUser } from "@/lib/auth";
import PageHead from "../PageHead";
import Assistant from "./Assistant";

export const metadata = { title: "AI Strategist · New Riyadh Media" };

export default async function AssistantPage() {
  const user = await getCurrentUser();
  return (
    <div className="ds-page">
      <PageHead
        eyebrow="Workspace · AI Strategist"
        title="Your dedicated strategist."
        sub="Trained on your brand and your numbers. It learns what's working each week and tells you what to do next."
      />
      <Assistant company={user?.company || user?.name || "your brand"} />
    </div>
  );
}
