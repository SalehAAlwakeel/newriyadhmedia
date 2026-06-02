import { getCurrentUser } from "@/lib/auth";
import { listPosts } from "@/lib/db";
import PageHead from "../PageHead";
import ApprovalsList from "./ApprovalsList";
import GenerateButton from "../GenerateButton";

export const metadata = { title: "Approvals · New Riyadh Media" };

export default async function ApprovalsPage() {
  const user = await getCurrentUser();
  const posts = user ? await listPosts(user.id) : [];
  return (
    <div className="ds-page">
      <PageHead
        eyebrow="Create · Approvals"
        title="Approvals"
        sub="Nothing posts without your sign-off. Review the week's content, then approve or reject."
        action={<GenerateButton label="✦ Generate more" className="btn btn--sm" />}
      />
      <ApprovalsList initial={posts} />
    </div>
  );
}
