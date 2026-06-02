// Adds a strong AUTH_SECRET to .env.local if one isn't already set.
// Never prints the secret. Run from platform/:  node scripts/ensure-auth-secret.mjs
import { readFileSync, writeFileSync, existsSync } from "fs";
import crypto from "crypto";

const p = ".env.local";
let txt = existsSync(p) ? readFileSync(p, "utf8") : "";

if (/^AUTH_SECRET=.+/m.test(txt)) {
  console.log("AUTH_SECRET already set — leaving it unchanged.");
  process.exit(0);
}

const secret = crypto.randomBytes(48).toString("base64url");
if (txt.length && !txt.endsWith("\n")) txt += "\n";
txt += `AUTH_SECRET=${secret}\n`;
writeFileSync(p, txt);
console.log("AUTH_SECRET added to .env.local (48 random bytes). Restart the dev server; existing sessions will be invalidated.");
