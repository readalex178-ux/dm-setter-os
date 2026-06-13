// ai.js — AI calls routed through the app's secure Edge Function (free Lovable AI).
// No user API key needed. The server injects the user's Offer Profile automatically.

async function callAI(systemPrompt, userMessage, maxTokens) {
  const result = await new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: "AI_PROXY",
        body: { system: systemPrompt, user: userMessage, maxTokens: maxTokens || 1024 },
      },
      (res) => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(res);
      }
    );
  });

  if (!result?.ok) {
    throw new Error(result?.error || "AI request failed — make sure you're signed in (open the popup).");
  }
  return result.content ?? "";
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
