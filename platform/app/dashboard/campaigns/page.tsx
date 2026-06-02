import PageHead from "../PageHead";
import CampaignBoard, { type Campaign } from "./CampaignBoard";

export const metadata = { title: "Campaigns · New Riyadh Media" };

const CAMPAIGNS: Campaign[] = [
  {
    name: "Digital Gateways: Easy Access",
    tag: "Quick Tips",
    img: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=300&q=70&auto=format&fit=crop",
    timing: "Tue, Jun 2 – Mon, Jun 8",
    status: "Generating now…",
    isNew: true,
    description:
      "A week focused on how seamless digital access is reshaping daily life in the Kingdom. We highlight quick, practical tips that make your services feel effortless — building trust and showing your audience the value of frictionless experiences.",
    posts: [
      { img: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=600&q=70&auto=format&fit=crop", platform: "Instagram", caption: "3 taps. That's all it takes to get started. Here's how we made access effortless. ⚡ #DigitalGateways" },
      { img: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=600&q=70&auto=format&fit=crop", platform: "LinkedIn", caption: "Friction is the silent killer of good products. This week we break down 3 ways to remove it from your customer journey." },
      { img: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=600&q=70&auto=format&fit=crop", platform: "X", caption: "Easy access isn't a feature. It's the whole product. 🧵" },
      { img: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=600&q=70&auto=format&fit=crop", platform: "Instagram Story", caption: "Swipe up to see how fast onboarding can really be 👆" },
    ],
  },
  {
    name: "Community Champions: Local Events",
    tag: "Quick Tips",
    img: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=300&q=70&auto=format&fit=crop",
    timing: "Tue, Jun 9 – Mon, Jun 15",
    status: "Generating in 5 days",
    isNew: true,
    description:
      "Celebrating the people and gatherings that hold communities together. This campaign spotlights local events, partnerships, and the everyday champions who make them happen — positioning your brand as a genuine part of the community.",
    posts: [
      { img: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=600&q=70&auto=format&fit=crop", platform: "Instagram", caption: "Behind every great event is a community that shows up. This week, we celebrate them. 🤝" },
      { img: "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=600&q=70&auto=format&fit=crop", platform: "LinkedIn", caption: "Sponsoring local isn't charity — it's strategy. Here's why community presence compounds." },
      { img: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=600&q=70&auto=format&fit=crop", platform: "Instagram Story", caption: "Tag a community champion who deserves a shoutout 👇" },
    ],
  },
  {
    name: "Community Pulse: Building Better",
    tag: "Quick Tips",
    img: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=300&q=70&auto=format&fit=crop",
    timing: "Tue, Jun 16 – Mon, Jun 22",
    status: "Generating on Jun 14",
    isNew: true,
    description:
      "Tapping into what the community is feeling right now. We take the pulse of local conversations and turn insights into content that shows your brand is listening, responsive, and committed to building something better together.",
    posts: [
      { img: "https://images.unsplash.com/photo-1542744094-3a31f272c490?w=600&q=70&auto=format&fit=crop", platform: "Instagram", caption: "We asked. You answered. Here's what the community told us this month. 📊" },
      { img: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&q=70&auto=format&fit=crop", platform: "LinkedIn", caption: "Listening at scale: how we turn community feedback into a product roadmap." },
      { img: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=600&q=70&auto=format&fit=crop", platform: "X", caption: "Building better starts with one question: what do you actually need from us?" },
    ],
  },
  {
    name: "Urban Development in Action",
    tag: "Quick Tips",
    img: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=300&q=70&auto=format&fit=crop",
    timing: "Tue, Jun 23 – Mon, Jun 29",
    status: "Generating on Jun 21",
    isNew: true,
    description:
      "Showcasing growth, progress, and the transformation happening across the Kingdom's cities. This week ties your brand to the momentum of Vision 2030 — ambitious, forward-looking, and proudly part of the change.",
    posts: [
      { img: "https://images.unsplash.com/photo-1449157291145-7efd050a4d0e?w=600&q=70&auto=format&fit=crop", platform: "Instagram", caption: "The skyline is changing. So is what's possible. 🏗️ #Vision2030" },
      { img: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=600&q=70&auto=format&fit=crop", platform: "LinkedIn", caption: "Growth you can see. A look at the projects reshaping our cities — and our role in them." },
      { img: "https://images.unsplash.com/photo-1493397212122-2b85dda8e9aa?w=600&q=70&auto=format&fit=crop", platform: "Instagram Story", caption: "From blueprint to skyline — swipe through the transformation 🌇" },
    ],
  },
  {
    name: "Strong Communities, Sustainable Future",
    tag: "Quick Tips",
    img: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=300&q=70&auto=format&fit=crop",
    timing: "Tue, Jun 30 – Mon, Jul 6",
    status: "Generating on Jun 28",
    isNew: true,
    description:
      "Connecting community strength with long-term sustainability. We frame your brand as a partner in building a future that lasts — responsible, rooted, and optimistic about what comes next.",
    posts: [
      { img: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=600&q=70&auto=format&fit=crop", platform: "Instagram", caption: "Strong today. Sustainable tomorrow. The future we're building together. 🌱" },
      { img: "https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=600&q=70&auto=format&fit=crop", platform: "LinkedIn", caption: "Sustainability isn't a campaign — it's a commitment. Here's how we're acting on it." },
      { img: "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=600&q=70&auto=format&fit=crop", platform: "X", caption: "A strong community is the most sustainable thing you can build. 🌍" },
    ],
  },
];

export default function CampaignsPage() {
  return (
    <div className="ds-page">
      <PageHead
        eyebrow="Create · Campaigns"
        title="Campaigns"
        sub="Each week is a themed campaign. Brief your strategist once and content flows to the calendar automatically."
        action={
          <div className="ds-head__btns">
            <button className="btn btn--ghost btn--sm">⚙ Settings</button>
          </div>
        }
      />

      <div className="ds-banner">
        <span className="ds-banner__dot">⚡</span>
        <p>
          <strong>Your campaigns aren&rsquo;t going out yet.</strong> Connect all of your accounts to publish automatically.
        </p>
        <a href="/dashboard/integrations" className="btn btn--sm">Connect</a>
      </div>

      <CampaignBoard campaigns={CAMPAIGNS} />

      <div className="expert-banner">
        <div className="expert-banner__avatar">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=160&q=70&auto=format&fit=crop" alt="" />
        </div>
        <div className="expert-banner__text">
          <strong>Get free expert campaign strategy advice</strong>
          <span>A specialist reviews your campaign strategy, content, and publishing — free.</span>
        </div>
        <button className="btn btn--ghost btn--sm">Talk to an expert 1:1 →</button>
      </div>
    </div>
  );
}
