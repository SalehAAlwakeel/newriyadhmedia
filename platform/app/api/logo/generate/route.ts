import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { updateUser, type BrandKit, type GeneratedLogoEntry } from "@/lib/db";
import { DEFAULT_CREDITS, LOGO_GENERATION_COST } from "@/lib/credits";
import { generateFluxImages, isLiveImage } from "@/lib/image";
import { persistGeneratedImage } from "@/lib/mediaStore";

export const runtime = "nodejs";

const EMPTY_KIT: BrandKit = {
  primaryColor: "#15352b",
  secondaryColor: "#7cae3f",
  logoUrl: "",
  voice: "",
  fonts: "Akzidenz-Grotesk Next",
};

function mediaIdFromUrl(url: string): string | null {
  const m = url.match(/\/api\/media\/file\/([^/?#]+)/);
  return m?.[1] ?? null;
}

function buildLogoPrompt(opts: {
  companyName: string;
  style: string;
  colors: string;
  vibe: string;
}): string {
  return [
    `Professional vector logo for the company "${opts.companyName}".`,
    `Logo style: ${opts.style}.`,
    opts.colors ? `Color palette: ${opts.colors}.` : "",
    opts.vibe ? `Visual vibe: ${opts.vibe}.` : "",
    `The company name "${opts.companyName}" must be clearly legible inside the logo.`,
    "Clean, modern, and scalable design. Isolated on a white or transparent background.",
    "No watermarks, no copyright symbols, no additional text beyond the company name.",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  let body: {
    companyName?: string;
    style?: string;
    colors?: string;
    vibe?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const companyName = ((body.companyName as string) || user.company || "My Company").slice(0, 100);
  const style = ((body.style as string) || "Modern").slice(0, 100);
  const colors = ((body.colors as string) || "").slice(0, 200);
  const vibe = ((body.vibe as string) || "").slice(0, 200);

  const credits = user.credits ?? DEFAULT_CREDITS;
  if (credits < LOGO_GENERATION_COST) {
    return NextResponse.json(
      { error: `Not enough credits — logo generation needs ${LOGO_GENERATION_COST}, you have ${credits}.` },
      { status: 402 },
    );
  }

  const prompt = buildLogoPrompt({ companyName, style, colors, vibe });

  let imageItem: { url?: string };

  if (!isLiveImage()) {
    const seed = companyName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 30) || "logo";
    imageItem = { url: `https://picsum.photos/seed/${seed}-logo/1024/1024` };
  } else {
    try {
      const result = await generateFluxImages({
        prompt,
        count: 1,
        imageSize: "square_hd",
      });
      const url = result?.urls[0];
      if (!url) throw new Error("Image model returned no images");
      imageItem = { url };
    } catch (err) {
      console.error("[logo/generate] image error, falling back to placeholder:", err);
      const seed = companyName.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").slice(0, 30) || "logo";
      imageItem = { url: `https://picsum.photos/seed/${seed}-logo/1024/1024` };
    }
  }

  const persistedUrl = await persistGeneratedImage(
    user.id,
    undefined,
    imageItem,
    `logo-${companyName}`,
  );

  const url = persistedUrl ?? imageItem.url ?? null;
  if (!url) return NextResponse.json({ error: "Could not save logo." }, { status: 500 });

  const entry: GeneratedLogoEntry = {
    id: mediaIdFromUrl(url) ?? crypto.randomUUID(),
    url,
    style,
    vibe: vibe || undefined,
    createdAt: new Date().toISOString(),
  };

  const kit = { ...EMPTY_KIT, ...(user.brandKit ?? {}) };
  const logoHistory = [entry, ...(kit.logoHistory ?? [])].slice(0, 24);
  await updateUser(user.id, {
    brandKit: { ...kit, logoHistory },
    credits: credits - LOGO_GENERATION_COST,
  });

  return NextResponse.json({ logo: entry, creditsRemaining: credits - LOGO_GENERATION_COST });
}

/** Remove a logo from history (does not delete the media file). */
export async function DELETE(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const kit = { ...EMPTY_KIT, ...(user.brandKit ?? {}) };
  const logoHistory = (kit.logoHistory ?? []).filter((l) => l.id !== id);
  const patch: BrandKit = {
    ...kit,
    logoHistory,
    logoUrl: kit.logoUrl && mediaIdFromUrl(kit.logoUrl) === id ? "" : kit.logoUrl,
  };
  await updateUser(user.id, { brandKit: patch });

  return NextResponse.json({ ok: true, logoHistory });
}
