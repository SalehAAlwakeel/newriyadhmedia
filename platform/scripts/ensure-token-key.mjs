// Adds TOKEN_ENC_KEY to .env.local if missing (used to encrypt social tokens
// at rest). Never prints the value. Run from platform/:
//   node scripts/ensure-token-key.mjs
import { readFileSync, writeFileSync, existsSync } from "fs";
import crypto from "crypto";

const p = ".env.local";
let txt = existsSync(p) ? readFileSync(p, "utf8") : "";
if (/^TOKEN_ENC_KEY=.+/m.test(txt)) {
  console.log("TOKEN_ENC_KEY already set — leaving it unchanged.");
  process.exit(0);
}
const secret = crypto.randomBytes(32).toString("base64");
if (txt.length && !txt.endsWith("\n")) txt += "\n";
txt += `TOKEN_ENC_KEY=${secret}\n`;
writeFileSync(p, txt);
console.log("TOKEN_ENC_KEY added to .env.local (32 random bytes).");
