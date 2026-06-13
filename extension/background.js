// background.js — service worker
// Owns the Cloud session (tokens) and all reads/writes to the backend via REST.

const SUPABASE_URL = "https://kwqoaqifvccxflaajrjv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3cW9hcWlmdmNjeGZsYWFqcmp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODA2NTcsImV4cCI6MjA4ODU1NjY1N30.uNNWvCSPyckxAWjRZfNP7jB8hqCD44noPmlKJ7WjDLI";

const PLATFORM_ENUM = ["instagram", "facebook", "whatsapp", "hubspot"];

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("overlay_enabled").then((s) => {
    if (s.overlay_enabled === undefined) {
      chrome.storage.local.set({ overlay_enabled: false });
    }
  });
});

// ── Session helpers ──────────────────────────────────────────────────────────

async function getSession() {
  const s = await chrome.storage.local.get("session");
  return s.session || null;
}

async function setSession(session) {
  await chrome.storage.local.set({ session });
}

async function clearSession() {
  await chrome.storage.local.remove("session");
}

async function signIn(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || data.msg || data.error || "Sign in failed");
  await setSession(data);
  return { user: data.user };
}

async function refreshSession() {
  const session = await getSession();
  if (!session?.refresh_token) throw new Error("Not signed in");
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ refresh_token: session.refresh_token }),
  });
  const data = await res.json();
  if (!res.ok) {
    await clearSession();
    throw new Error("Session expired — please sign in again");
  }
  await setSession(data);
  return data;
}

// Authenticated fetch with one automatic token refresh on 401
async function authedFetch(path, options = {}, retry = true) {
  let session = await getSession();
  if (!session?.access_token) throw new Error("Not signed in");

  const doFetch = (token) =>
    fetch(`${SUPABASE_URL}${path}`, {
      ...options,
      headers: {
        ...(options.headers || {}),
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

  let res = await doFetch(session.access_token);
  if (res.status === 401 && retry) {
    session = await refreshSession();
    res = await doFetch(session.access_token);
  }
  return res;
}

// ── Save a conversation to the backend ───────────────────────────────────────

async function saveConversation(payload) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Please sign in to the extension first (open the popup).");
  const userId = session.user.id;
  const { prospect, messages, bantScore } = payload;

  const platform = PLATFORM_ENUM.includes(prospect.platform) ? prospect.platform : null;
  const prospectId = crypto.randomUUID();

  const prospectRow = {
    id: prospectId,
    user_id: userId,
    name: prospect.name || "Unknown",
    handle: prospect.handle || null,
    stage: prospect.stage || "New Lead",
    lead_score: prospect.leadScore || 0,
    call_readiness: prospect.callReadiness || 0,
    intent_level: prospect.intentLevel || "Curious",
    intent_confidence: prospect.intentConfidence || 0,
    motivation: prospect.motivation || null,
    concerns: prospect.concerns || null,
    income_goal: prospect.incomeGoal || null,
    source: prospect.source || (prospect.platform + " (Extension)"),
    platform,
    last_contact_at: new Date().toISOString(),
  };

  const pRes = await authedFetch("/rest/v1/prospects", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(prospectRow),
  });
  if (!pRes.ok) {
    const t = await pRes.text();
    throw new Error("Could not save prospect: " + t.slice(0, 160));
  }

  if (Array.isArray(messages) && messages.length) {
    const rows = messages.map((m) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      prospect_id: prospectId,
      sender: m.sender || "prospect",
      content: m.content || "",
      sent_at: new Date().toISOString(),
    }));
    const mRes = await authedFetch("/rest/v1/messages", {
      method: "POST",
      body: JSON.stringify(rows),
    });
    if (!mRes.ok) {
      const t = await mRes.text();
      throw new Error("Saved prospect but messages failed: " + t.slice(0, 160));
    }
  }

  return { id: prospectId };
}

// ── Recently saved (for popup) ───────────────────────────────────────────────

async function getRecent() {
  const res = await authedFetch(
    "/rest/v1/prospects?select=id,name,stage,lead_score,updated_at&order=updated_at.desc&limit=20",
    { method: "GET" }
  );
  if (!res.ok) throw new Error("Could not load prospects");
  return await res.json();
}

// ── AI via Edge Functions (uses the user's offer profile server-side) ─────────

async function callEdgeAI(fn, body) {
  const res = await authedFetch(`/functions/v1/${fn}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits in the app.");
    throw new Error(data.error || "AI request failed");
  }
  return data;
}

// ── Message router ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {
        case "SIGN_IN": {
          const r = await signIn(msg.email, msg.password);
          sendResponse({ ok: true, user: r.user });
          break;
        }
        case "SIGN_OUT": {
          await clearSession();
          sendResponse({ ok: true });
          break;
        }
        case "GET_SESSION": {
          const s = await getSession();
          sendResponse({ ok: true, user: s?.user || null });
          break;
        }
        case "SAVE_CONVERSATION": {
          const r = await saveConversation(msg.payload);
          sendResponse({ ok: true, id: r.id });
          break;
        }
        case "GET_RECENT": {
          const rows = await getRecent();
          sendResponse({ ok: true, rows });
          break;
        }
        case "AI_PROXY": {
          const data = await callEdgeAI("extension-ai", msg.body);
          sendResponse({ ok: true, content: data.content });
          break;
        }
        default:
          sendResponse({ ok: false, error: "Unknown message type" });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
  })();
  return true; // keep channel open for async response
});

// Badge: green when signed in
async function updateBadge() {
  const s = await getSession();
  const signedIn = !!s?.access_token;
  chrome.action.setBadgeText({ text: signedIn ? "" : "!" });
  chrome.action.setBadgeBackgroundColor({ color: signedIn ? "#3fb950" : "#f85149" });
}
updateBadge();
chrome.storage.onChanged.addListener((changes) => {
  if (changes.session) updateBadge();
});
