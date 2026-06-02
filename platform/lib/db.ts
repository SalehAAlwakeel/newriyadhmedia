import { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Data store — Prisma + SQLite.
//
// Replaces the previous JSON-file store (which had no concurrency safety and
// corrupted under parallel writes). The exported types and function signatures
// are unchanged, so the rest of the app is untouched. Nested/variable-shape
// values are persisted as JSON strings; see the (de)serialization helpers.
//
// To move to Postgres later: switch the datasource in prisma/schema.prisma and
// point DATABASE_URL at the managed instance — these functions don't change.
// ---------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma =
  globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export type ConnectionCapability = "publish" | "stories" | "analytics" | "dms";

export interface SocialConnection {
  platform: string;
  handle: string;
  connectedAt: string;
  /** What the AI is allowed to do on this account. */
  capabilities?: ConnectionCapability[];
  /** Mocked OAuth token until real provider apps are wired up. */
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  /** Most recent successful analytics pull, for the AI digest. */
  lastSyncedAt?: string;
  /** Free-form provider account id (e.g. Meta business id, Snap user id). */
  providerAccountId?: string;
  /** Optional avatar/profile picture surfaced in the integration window. */
  avatarUrl?: string;
  /** Followers/subs surfaced in the integration window after sync. */
  audienceSize?: number;
}

export interface BrandKit {
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  voice: string;
  fonts: string;
  purpose?: string;
  audience?: string;
  character?: string;
  toneTraits?: string[];
  emotionTraits?: string[];
}

export interface ContentPreferences {
  languages: string[];
  tone: string;
  topics: string;
  postsPerWeek: number;
  doNotMention: string;
  /** How aggressively the AI may transform Brand Kit assets. */
  mode?: "growth" | "balanced" | "brand-first" | "strict";
  includeMusic?: boolean;
  includeNarration?: boolean;
  ctaCopy?: string;
  ctaUrl?: string;
  smartCaptions?: boolean;
}

export type AiMemoryKind = "fact" | "preference" | "do-not" | "winning-pattern" | "learning";

export interface AiMemoryEntry {
  id: string;
  kind: AiMemoryKind;
  text: string;
  /** Where this came from: "user", "assistant", "analytics", "auto". */
  source: "user" | "assistant" | "analytics" | "auto";
  /** Optional confidence 0..1 for AI-inferred facts. */
  confidence?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  company: string;
  passwordHash: string;
  subscribed: boolean;
  plan: string | null;
  createdAt: string;
  connections: SocialConnection[];
  brandKit: BrandKit | null;
  contentPrefs: ContentPreferences | null;
  /** Generation credits remaining. Defaults to the trial allowance when unset. */
  credits?: number;
  /** Persistent things the AI strategist has learned about this brand. */
  aiMemory?: AiMemoryEntry[];
}

export type PostType = "Still Image" | "Carousel" | "Blog Post" | "Email" | "Short-form Video" | "Story";
export type PostStatus = "generating" | "ready" | "approved" | "rejected" | "published" | "failed";

export interface PostPublication {
  platform: string;
  status: "queued" | "published" | "failed" | "skipped";
  publishedAt?: string;
  /** Platform-side post id once published. */
  externalId?: string;
  /** Permalink to the live post. */
  url?: string;
  error?: string;
}

export interface GeneratedPost {
  id: string;
  userId: string;
  type: PostType;
  campaignName: string;
  topic: string;
  caption: string;
  body?: string;
  hashtags?: string[];
  imageUrls: string[];
  scheduledFor: string;
  status: PostStatus;
  createdAt: string;
  error?: string;
  /** One record per connected platform we attempted to publish to. */
  publications?: PostPublication[];
}

export interface MediaAsset {
  id: string;
  userId: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  /** "image" | "video" | "other" — derived from mime, cached for filtering. */
  kind: "image" | "video" | "other";
  /** "upload" | "generated" — where the asset came from. */
  source: "upload" | "generated";
  /** Optional caption/label. */
  label?: string;
  /** Public URL the dashboard can render — /api/media/file/<id>. */
  url: string;
  uploadedAt: string;
  /** When source === "generated", which post produced this asset. */
  postId?: string;
}

// ---------------------------------------------------------------------------
// (De)serialization helpers between Prisma rows (JSON-string columns) and the
// app-layer types above.
// ---------------------------------------------------------------------------

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  if (value == null) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

type UserRow = {
  id: string;
  email: string;
  name: string;
  company: string;
  passwordHash: string;
  subscribed: boolean;
  plan: string | null;
  createdAt: string;
  credits: number | null;
  connections: string;
  brandKit: string | null;
  contentPrefs: string | null;
  aiMemory: string;
};

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    company: row.company,
    passwordHash: row.passwordHash,
    subscribed: row.subscribed,
    plan: row.plan,
    createdAt: row.createdAt,
    credits: row.credits ?? undefined,
    connections: parseJson<SocialConnection[]>(row.connections, []),
    brandKit: parseJson<BrandKit | null>(row.brandKit, null),
    contentPrefs: parseJson<ContentPreferences | null>(row.contentPrefs, null),
    aiMemory: parseJson<AiMemoryEntry[]>(row.aiMemory, []),
  };
}

type PostRow = {
  id: string;
  userId: string;
  type: string;
  campaignName: string;
  topic: string;
  caption: string;
  body: string | null;
  scheduledFor: string;
  status: string;
  createdAt: string;
  error: string | null;
  hashtags: string;
  imageUrls: string;
  publications: string | null;
};

function toPost(row: PostRow): GeneratedPost {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as PostType,
    campaignName: row.campaignName,
    topic: row.topic,
    caption: row.caption,
    body: row.body ?? undefined,
    hashtags: parseJson<string[]>(row.hashtags, []),
    imageUrls: parseJson<string[]>(row.imageUrls, []),
    scheduledFor: row.scheduledFor,
    status: row.status as PostStatus,
    createdAt: row.createdAt,
    error: row.error ?? undefined,
    publications: row.publications ? parseJson<PostPublication[]>(row.publications, []) : undefined,
  };
}

type MediaRow = {
  id: string;
  userId: string;
  filename: string;
  mime: string;
  sizeBytes: number;
  kind: string;
  source: string;
  label: string | null;
  url: string;
  uploadedAt: string;
  postId: string | null;
};

function toMedia(row: MediaRow): MediaAsset {
  return {
    id: row.id,
    userId: row.userId,
    filename: row.filename,
    mime: row.mime,
    sizeBytes: row.sizeBytes,
    kind: row.kind as MediaAsset["kind"],
    source: row.source as MediaAsset["source"],
    label: row.label ?? undefined,
    url: row.url,
    uploadedAt: row.uploadedAt,
    postId: row.postId ?? undefined,
  };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export async function findUserByEmail(email: string): Promise<User | null> {
  const row = await prisma.user.findFirst({
    where: { email: { equals: email } },
  });
  // SQLite equality is case-sensitive by default; normalize defensively.
  if (row) return toUser(row as UserRow);
  const all = await prisma.user.findMany();
  const match = all.find((u) => u.email.toLowerCase() === email.toLowerCase());
  return match ? toUser(match as UserRow) : null;
}

export async function findUserById(id: string): Promise<User | null> {
  const row = await prisma.user.findUnique({ where: { id } });
  return row ? toUser(row as UserRow) : null;
}

export async function createUser(user: User): Promise<User> {
  const row = await prisma.user.create({
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      company: user.company,
      passwordHash: user.passwordHash,
      subscribed: user.subscribed,
      plan: user.plan,
      createdAt: user.createdAt,
      credits: user.credits ?? null,
      connections: JSON.stringify(user.connections ?? []),
      brandKit: user.brandKit ? JSON.stringify(user.brandKit) : null,
      contentPrefs: user.contentPrefs ? JSON.stringify(user.contentPrefs) : null,
      aiMemory: JSON.stringify(user.aiMemory ?? []),
    },
  });
  return toUser(row as UserRow);
}

export async function updateUser(id: string, patch: Partial<User>): Promise<User | null> {
  const data: Record<string, unknown> = {};
  if (patch.email !== undefined) data.email = patch.email;
  if (patch.name !== undefined) data.name = patch.name;
  if (patch.company !== undefined) data.company = patch.company;
  if (patch.passwordHash !== undefined) data.passwordHash = patch.passwordHash;
  if (patch.subscribed !== undefined) data.subscribed = patch.subscribed;
  if (patch.plan !== undefined) data.plan = patch.plan;
  if (patch.createdAt !== undefined) data.createdAt = patch.createdAt;
  if (patch.credits !== undefined) data.credits = patch.credits;
  if (patch.connections !== undefined) data.connections = JSON.stringify(patch.connections);
  if (patch.brandKit !== undefined) data.brandKit = patch.brandKit ? JSON.stringify(patch.brandKit) : null;
  if (patch.contentPrefs !== undefined) data.contentPrefs = patch.contentPrefs ? JSON.stringify(patch.contentPrefs) : null;
  if (patch.aiMemory !== undefined) data.aiMemory = JSON.stringify(patch.aiMemory);

  try {
    const row = await prisma.user.update({ where: { id }, data });
    return toUser(row as UserRow);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Generated posts
// ---------------------------------------------------------------------------

export async function listPosts(userId: string): Promise<GeneratedPost[]> {
  const rows = await prisma.post.findMany({ where: { userId } });
  return rows.map((r) => toPost(r as PostRow));
}

export async function getPost(id: string): Promise<GeneratedPost | null> {
  const row = await prisma.post.findUnique({ where: { id } });
  return row ? toPost(row as PostRow) : null;
}

export async function createPost(post: GeneratedPost): Promise<GeneratedPost> {
  const row = await prisma.post.create({
    data: {
      id: post.id,
      userId: post.userId,
      type: post.type,
      campaignName: post.campaignName,
      topic: post.topic,
      caption: post.caption,
      body: post.body ?? null,
      scheduledFor: post.scheduledFor,
      status: post.status,
      createdAt: post.createdAt,
      error: post.error ?? null,
      hashtags: JSON.stringify(post.hashtags ?? []),
      imageUrls: JSON.stringify(post.imageUrls ?? []),
      publications: post.publications ? JSON.stringify(post.publications) : null,
    },
  });
  return toPost(row as PostRow);
}

export async function updatePost(id: string, patch: Partial<GeneratedPost>): Promise<GeneratedPost | null> {
  const data: Record<string, unknown> = {};
  if (patch.type !== undefined) data.type = patch.type;
  if (patch.campaignName !== undefined) data.campaignName = patch.campaignName;
  if (patch.topic !== undefined) data.topic = patch.topic;
  if (patch.caption !== undefined) data.caption = patch.caption;
  if (patch.body !== undefined) data.body = patch.body ?? null;
  if (patch.scheduledFor !== undefined) data.scheduledFor = patch.scheduledFor;
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.error !== undefined) data.error = patch.error ?? null;
  if (patch.hashtags !== undefined) data.hashtags = JSON.stringify(patch.hashtags);
  if (patch.imageUrls !== undefined) data.imageUrls = JSON.stringify(patch.imageUrls);
  if (patch.publications !== undefined) data.publications = patch.publications ? JSON.stringify(patch.publications) : null;

  try {
    const row = await prisma.post.update({ where: { id }, data });
    return toPost(row as PostRow);
  } catch {
    return null;
  }
}

export async function deletePost(id: string): Promise<boolean> {
  try {
    await prisma.post.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Media library — per-account picture/video storage metadata.
// The binary content lives on disk under .data/uploads/<userId>/<id>.<ext>.
// This table only carries metadata + the public URL.
// ---------------------------------------------------------------------------

export async function listMedia(userId: string): Promise<MediaAsset[]> {
  const rows = await prisma.media.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
  });
  return rows.map((r) => toMedia(r as MediaRow));
}

export async function getMedia(id: string): Promise<MediaAsset | null> {
  const row = await prisma.media.findUnique({ where: { id } });
  return row ? toMedia(row as MediaRow) : null;
}

export async function createMedia(asset: MediaAsset): Promise<MediaAsset> {
  const row = await prisma.media.create({
    data: {
      id: asset.id,
      userId: asset.userId,
      filename: asset.filename,
      mime: asset.mime,
      sizeBytes: asset.sizeBytes,
      kind: asset.kind,
      source: asset.source,
      label: asset.label ?? null,
      url: asset.url,
      uploadedAt: asset.uploadedAt,
      postId: asset.postId ?? null,
    },
  });
  return toMedia(row as MediaRow);
}

export async function deleteMedia(id: string): Promise<MediaAsset | null> {
  try {
    const row = await prisma.media.delete({ where: { id } });
    return toMedia(row as MediaRow);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// AI memory — persistent things the strategist has learned about the brand.
// ---------------------------------------------------------------------------

export async function listAiMemory(userId: string): Promise<AiMemoryEntry[]> {
  const user = await findUserById(userId);
  return user?.aiMemory ?? [];
}

export async function addAiMemory(userId: string, entry: AiMemoryEntry): Promise<AiMemoryEntry | null> {
  const user = await findUserById(userId);
  if (!user) return null;
  const memory = [...(user.aiMemory ?? []), entry];
  await updateUser(userId, { aiMemory: memory });
  return entry;
}

export async function deleteAiMemory(userId: string, entryId: string): Promise<boolean> {
  const user = await findUserById(userId);
  if (!user) return false;
  const before = user.aiMemory?.length ?? 0;
  const memory = (user.aiMemory ?? []).filter((m) => m.id !== entryId);
  await updateUser(userId, { aiMemory: memory });
  return memory.length < before;
}
