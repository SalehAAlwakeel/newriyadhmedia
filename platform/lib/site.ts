/**
 * Public site URLs. In production set NEXT_PUBLIC_MARKETING_URL to the
 * marketing site's domain; locally it falls back to the static-site dev server.
 */
export const MARKETING_URL = (process.env.NEXT_PUBLIC_MARKETING_URL || "http://localhost:8080").replace(/\/$/, "");

export const marketingLink = (path = "") => `${MARKETING_URL}/${path.replace(/^\//, "")}`;

/** Contact section on the marketing site — used by "talk to an expert" CTAs. */
export const CONTACT_URL = marketingLink("index.html#contact");
