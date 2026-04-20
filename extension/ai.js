// ai.js — AI calls via Groq (or any OpenAI-compatible API)
// No Anthropic fallback — Groq only until you decide otherwise

async function getAISettings() {
  return chrome.storage.local.get([
    "ai_mode", "cloud_url", "cloud_model", "cloud_key", "local_model", "app_url"
  ]);
}

async function callAI(systemPrompt, userMessage, maxTokens) {
  const s = await getAISettings();
  const mode = s.ai_mode || "cloud";

  if (mode === "local") {
    const appBase = (s.app_url || "http://localhost:8080").replace(/\/app.*$/, "");
    const res = await fetch(appBase + "/local/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: s.local_model || "llama3",
        max_tokens: maxTokens || 1024,
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) throw new Error("Local AI error " + res.status + " — is LM Studio running?");
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  // Cloud mode (Groq / OpenRouter / OpenAI)
  const url = (s.cloud_url || "https://api.groq.com/openai/v1") + "/chat/completions";
  const model = s.cloud_model || "llama-3.1-8b-instant";
  const key = s.cloud_key || "";
  if (!key) throw new Error("No API key set — open the extension popup, go to Settings, and add your Groq key");

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer " + key },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens || 1024,
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
    }),
    signal: AbortSignal.timeout(30000),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error("AI error " + res.status + ": " + (err?.error?.message || "check your API key in Settings"));
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function parseAIResponse(raw) {
  if (!raw?.trim()) throw new Error("Empty response from AI");

  // Strip markdown fences
  let text = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // Strip any preamble before the first [ or {
  const jsonStart = text.search(/[\[{]/);
  if (jsonStart > 0) text = text.slice(jsonStart);

  // Strip anything after the last ] or }
  const lastClose = Math.max(text.lastIndexOf("]"), text.lastIndexOf("}"));
  if (lastClose >= 0) text = text.slice(0, lastClose + 1);

  try {
    return JSON.parse(text);
  } catch {
    // Try to repair truncated JSON
    let fixed = text.replace(/,\s*"?[^"{\[]*$/, "");
    const missingBraces = (fixed.match(/{/g) || []).length - (fixed.match(/}/g) || []).length;
    const missingBrackets = (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
    for (let i = 0; i < missingBraces; i++) fixed += "}";
    for (let i = 0; i < missingBrackets; i++) fixed += "]";
    return JSON.parse(fixed);
  }
}

async function getReplySuggestions(lines, name, platformName) {
  const system = `You are a DM setter coach trained in the Zenith Sales Academy framework.

Platform: ${platformName}
Zenith flow: Opener → Rapport → Discovery → Income Goal → BANT → Handle Objections → Call Transition

Suggest 3 reply options. Return ONLY a JSON array, no markdown, no explanation:
[{"type":"2-3 word label","content":"exact message to send","note":"1 sentence why this works"}]`;

  const user = `Prospect name: ${name || "Unknown"}

Conversation:
${lines.join("\n")}

Return 3 reply suggestions as a JSON array.`;

  const raw = await callAI(system, user, 800);
  const parsed = parseAIResponse(raw);
  if (!Array.isArray(parsed)) throw new Error("AI returned unexpected format");
  return parsed;
}

async function getBANTScore(lines) {
  const system = `Score this conversation using BANT. Each pillar 0-2 (0=not mentioned, 1=implied, 2=confirmed). Total out of 8.
Verdict: 7-8=Hard Close, 5-6=Close, 3-4=Nurture, 0-2=Disqualify.
Return ONLY JSON: {"need":0,"timeline":0,"authority":0,"budget":0,"total":0,"verdict":"Nurture","note":"next step"}`;

  const raw = await callAI(system, lines.join("\n"), 250);
  return parseAIResponse(raw);
}

async function getProspectIntel(lines, name) {
  const system = `Analyse this DM conversation. Return ONLY JSON:
{"intentLevel":"Curious","intentPct":40,"motivation":"brief","concern":"brief","callReadiness":30,"leadScore":4,"stage":"Discovery","incomeGoal":"amount or null"}`;

  const raw = await callAI(system, `Prospect: ${name || "Unknown"}\n\n${lines.join("\n")}`, 300);
  return parseAIResponse(raw);
}
