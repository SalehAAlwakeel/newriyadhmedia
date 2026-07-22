import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { listPosts } from "@/lib/db";
import PageHead from "../PageHead";
import ApprovalsList from "./ApprovalsList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Approvals · New Riyadh Media" };

export default async function ApprovalsPage() {
  const user = await getCurrentUser();
  const posts = user ? await listPosts(user.id) : [];
  return (
    <div className="ds-page">
      <PageHead
        eyebrow="Create · Approvals"
        title="Approvals"
        sub="Nothing posts without your sign-off. Review, then approve to schedule it onto your calendar."
        action={<Link href="/dashboard/assistant" className="btn btn--sm"><Sparkles size={15} /> Generate in studio</Link>}
      />
      <ApprovalsList initial={posts} />
    </div>
  );
}
