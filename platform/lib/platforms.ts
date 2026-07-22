export type ConnectionCapability = "publish" | "stories" | "analytics" | "dms";

export interface OAuthConfig {
  /** Provider authorize endpoint. */
  authUrl: string;
  /** Provider token-exchange endpoint. */
  tokenUrl: string;
  /** OAuth scopes requested. */
  scopes: string[];
  /** Env var holding the OAuth client id. */
  clientIdEnv: string;
  /** Env var holding the OAuth client secret. */
  clientSecretEnv: string;
}

export interface PlatformDef {
  id: string;
  name: string;
  color: string;
  sampleHandle: string;
  blurb: string;
  /** Env var that would hold the OAuth client id once the provider app exists. */
  oauthEnv: string;
  /** Capabilities the AI can use on this network once connected. */
  capabilities?: ConnectionCapability[];
  /** Real OAuth wiring — activates automatically when the env credentials exist. */
  oauth?: OAuthConfig;
}

export const CAPABILITY_LABELS: Record<ConnectionCapability, string> = {
  publish: "Publish posts",
  stories: "Post stories",
  analytics: "Read analytics",
  dms: "Manage messages",
};

// The networks a brand can link. `color` drives the icon chip. `oauth` carries
// the real authorize/token endpoints; when the matching client id + secret env
// vars are present we run a genuine OAuth redirect, otherwise the platform
// falls back to a manual account link so the rest of the product is testable.
export const PLATFORMS: PlatformDef[] = [
  {
    id: "instagram",
    name: "Instagram",
    color: "#E1306C",
    sampleHandle: "@yourbrand",
    blurb: "Feed, Reels & Stories",
    oauthEnv: "META_CLIENT_ID",
    capabilities: ["publish", "stories", "analytics", "dms"],
    oauth: {
      authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
      scopes: [
        "instagram_basic",
        "instagram_content_publish",
        "pages_show_list",
        "pages_read_engagement",
        "instagram_manage_insights",
      ],
      clientIdEnv: "META_CLIENT_ID",
      clientSecretEnv: "META_CLIENT_SECRET",
    },
  },
  {
    id: "tiktok",
    name: "TikTok",
    color: "#000000",
    sampleHandle: "@yourbrand",
    blurb: "Short-form video",
    oauthEnv: "TIKTOK_CLIENT_KEY",
    capabilities: ["publish", "analytics"],
    oauth: {
      authUrl: "https://www.tiktok.com/v2/auth/authorize/",
      tokenUrl: "https://open.tiktokapis.com/v2/oauth/token/",
      scopes: ["user.info.basic", "video.publish", "video.list"],
      clientIdEnv: "TIKTOK_CLIENT_KEY",
      clientSecretEnv: "TIKTOK_CLIENT_SECRET",
    },
  },
  {
    id: "snapchat",
    name: "Snapchat",
    color: "#FFFC00",
    sampleHandle: "yourbrand",
    blurb: "Stories & Spotlight",
    oauthEnv: "SNAP_CLIENT_ID",
    capabilities: ["stories", "analytics"],
    oauth: {
      authUrl: "https://accounts.snapchat.com/login/oauth2/authorize",
      tokenUrl: "https://accounts.snapchat.com/login/oauth2/access_token",
      scopes: ["snapchat-marketing-api"],
      clientIdEnv: "SNAP_CLIENT_ID",
      clientSecretEnv: "SNAP_CLIENT_SECRET",
    },
  },
  {
    id: "x",
    name: "X",
    color: "#0e0d0b",
    sampleHandle: "@yourbrand",
    blurb: "Posts & threads",
    oauthEnv: "X_CLIENT_ID",
    capabilities: ["publish", "analytics", "dms"],
    oauth: {
      authUrl: "https://twitter.com/i/oauth2/authorize",
      tokenUrl: "https://api.twitter.com/2/oauth2/token",
      scopes: ["tweet.read", "tweet.write", "users.read", "offline.access"],
      clientIdEnv: "X_CLIENT_ID",
      clientSecretEnv: "X_CLIENT_SECRET",
    },
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    color: "#0A66C2",
    sampleHandle: "your-company",
    blurb: "Company page posts",
    oauthEnv: "LINKEDIN_CLIENT_ID",
    capabilities: ["publish", "analytics"],
    oauth: {
      authUrl: "https://www.linkedin.com/oauth/v2/authorization",
      tokenUrl: "https://www.linkedin.com/oauth/v2/accessToken",
      scopes: ["openid", "profile", "w_member_social"],
      clientIdEnv: "LINKEDIN_CLIENT_ID",
      clientSecretEnv: "LINKEDIN_CLIENT_SECRET",
    },
  },
  {
    id: "youtube",
    name: "YouTube",
    color: "#FF0000",
    sampleHandle: "@yourbrand",
    blurb: "Videos & Shorts",
    oauthEnv: "GOOGLE_CLIENT_ID",
    capabilities: ["publish", "analytics"],
    oauth: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["https://www.googleapis.com/auth/youtube.upload", "https://www.googleapis.com/auth/yt-analytics.readonly"],
      clientIdEnv: "GOOGLE_CLIENT_ID",
      clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    },
  },
  {
    id: "google_business",
    name: "Google Business",
    color: "#4285F4",
    sampleHandle: "Your Business",
    blurb: "Profile posts & reviews",
    oauthEnv: "GOOGLE_CLIENT_ID",
    capabilities: ["publish", "analytics"],
    oauth: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["https://www.googleapis.com/auth/business.manage"],
      clientIdEnv: "GOOGLE_CLIENT_ID",
      clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    },
  },
  {
    id: "facebook",
    name: "Facebook",
    color: "#1877F2",
    sampleHandle: "Your Page",
    blurb: "Page posts",
    oauthEnv: "META_CLIENT_ID",
    capabilities: ["publish", "analytics", "dms"],
    oauth: {
      authUrl: "https://www.facebook.com/v21.0/dialog/oauth",
      tokenUrl: "https://graph.facebook.com/v21.0/oauth/access_token",
      scopes: ["pages_manage_posts", "pages_read_engagement", "read_insights"],
      clientIdEnv: "META_CLIENT_ID",
      clientSecretEnv: "META_CLIENT_SECRET",
    },
  },
  {
    id: "google_analytics",
    name: "Google Analytics",
    color: "#E37400",
    sampleHandle: "GA4 property",
    blurb: "Traffic & conversions",
    oauthEnv: "GOOGLE_CLIENT_ID",
    capabilities: ["analytics"],
    oauth: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      scopes: ["https://www.googleapis.com/auth/analytics.readonly"],
      clientIdEnv: "GOOGLE_CLIENT_ID",
      clientSecretEnv: "GOOGLE_CLIENT_SECRET",
    },
  },
];

export function getPlatform(id: string): PlatformDef | undefined {
  return PLATFORMS.find((p) => p.id === id);
}

/** Platforms with a live connect + publish flow. Others show as "Coming soon". */
export const LIVE_PLATFORMS = new Set<string>(["instagram"]);

export function isPlatformLive(id: string): boolean {
  return LIVE_PLATFORMS.has(id);
}

/** True when the provider app credentials exist, so real OAuth can run. */
export function oauthConfigured(p: PlatformDef): boolean {
  if (!p.oauth) return false;
  return Boolean(process.env[p.oauth.clientIdEnv] && process.env[p.oauth.clientSecretEnv]);
}
