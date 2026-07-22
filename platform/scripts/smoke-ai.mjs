import OpenAI from "openai";

const openaiKey = process.env.OPENAI_API_KEY;
const geminiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
const imageModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
const veoModel = process.env.GOOGLE_VEO_MODEL || "veo-3.1-generate-preview";

console.log("OPENAI_API_KEY:", openaiKey ? `set (${openaiKey.slice(0, 8)}…)` : "MISSING");
console.log("GEMINI_API_KEY:", geminiKey ? `set (${geminiKey.slice(0, 8)}…)` : "MISSING");
console.log("");

if (openaiKey) {
  const client = new OpenAI({ apiKey: openaiKey, timeout: 120_000 });
  try {
    const res = await client.images.generate({
      model: imageModel,
      prompt: "Minimal product photo of a coffee cup on marble, soft light",
      n: 1,
      size: "1024x1024",
      quality: "high",
    });
    const item = res.data?.[0];
    console.log(`[image] ${imageModel}:`, item?.url || item?.b64_json ? "OK" : "EMPTY");
  } catch (err) {
    console.log(`[image] ${imageModel}: FAIL —`, err?.message || err);
  }
}

if (geminiKey) {
  const base = "https://generativelanguage.googleapis.com/v1beta";
  const body = {
    instances: [{ prompt: "Slow cinematic push-in on a coffee cup, 9:16 vertical" }],
    parameters: { aspectRatio: "9:16", durationSeconds: 8, resolution: "720p" },
  };
  try {
    const res = await fetch(`${base}/models/${veoModel}:predictLongRunning`, {
      method: "POST",
      headers: { "x-goog-api-key": geminiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (res.ok) {
      const j = JSON.parse(text);
      console.log(`[video] ${veoModel}: OK —`, j.name?.slice(-24) || "started");
    } else {
      console.log(`[video] ${veoModel}: FAIL ${res.status} —`, text.slice(0, 320));
    }
  } catch (err) {
    console.log(`[video] ${veoModel}: FAIL —`, err?.message || err);
  }
}
