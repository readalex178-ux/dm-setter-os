// background.js — DM Setter OS service worker
// Owns the Supabase session and all API calls to DM Setter OS.
// The extension is a dumb interface layer — ALL intelligence lives server-side.

const SUPABASE_URL = "https://kwqoaqifvccxflaajrjv.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt3cW9hcWlmdmNjeGZsYWFqcmp2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5ODA2NTcsImV4cCI6MjA4ODU1NjY1N30.uNNWvCSPyckxAWjRZfNP7jB8hqCD44noPmlKJ7WjDLI";
const APP_URL = "https://dm-wingman-pro.vercel.app";

// All valid platform IDs — must match Supabase enum
const PLATFORM_IDS = ["instagram", "tiktok", "twitter", "facebook", "linkedin", "messenger"];

// ── Init ────────────────────────────────────────────────────────────────────

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

// ── Edge Function bridge (AI + CRM lives entirely in DM Setter OS) ───────────

async function callEdgeFn(fn, body) {
  const res = await authedFetch(`/functions/v1/${fn}`, {
    method: "POST",
    body: JSON.stringify(body || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new Error("Session expired — please sign in again.");
    if (res.status === 429) throw new Error("Rate limit hit — try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Top up in the DM Setter OS app.");
    throw new Error(data.error || `DM Setter OS returned ${res.status}`);
  }
  return data;
}

// ── DM Setter OS API calls ───────────────────────────────────────────────────

async function analyzeConversation(payload) {
  const session = await getSession();
  if (!session?.access_token) throw new Error("Sign in via the extension popup first.");
  return await callEdgeFn("extension-analyze", payload);
}

async function getProspectContext(payload) {
  const session = await getSession();
  if (!session?.access_token) throw new Error("Sign in via the extension popup first.");
  return await callEdgeFn("extension-context", payload);
}

async function verifySession() {
  const session = await getSession();
  if (!session?.access_token) return { ok: true, signedIn: false };
  try {
    const res = await authedFetch("/rest/v1/profiles?select=id,display_name&limit=1", { method: "GET" });
    if (!res.ok) return { ok: true, signedIn: false };
    const rows = await res.json().catch(() => []);
    return { ok: true, signedIn: true, user: session.user || null, profile: rows?.[0] || null };
  } catch {
    return { ok: true, signedIn: false };
  }
}

async function saveConversation(payload) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Sign in via the extension popup first.");
  const userId = session.user.id;
  const { prospect, messages, analysis } = payload;

  // Normalise platform to a valid DB enum value
  const pid = (prospect.platform || "").toLowerCase();
  const platform = PLATFORM_IDS.includes(pid) ? pid : null;

  const prospectId = crypto.randomUUID();
  const prospectRow = {
    id: prospectId,
    user_id: userId,
    name: prospect.name || "Unknown",
    handle: prospect.handle || null,
    stage: analysis?.stage || prospect.stage || "New Lead",
    conversation_score: analysis?.conversation_score ?? null,
    booking_probability: analysis?.booking_probability ?? null,
    lead_temperature: analysis?.temperature || null,
    suggested_action: analysis?.next_action || null,
    concerns: Array.isArray(analysis?.objections) && analysis.objections.length
      ? analysis.objections.join("; ")
      : (prospect.concerns || null),
    source: prospect.source || `${prospect.platform || "Extension"} (Extension)`,
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

async function getRecent() {
  const res = await authedFetch(
    "/rest/v1/prospects?select=id,name,stage,lead_score,conversation_score,updated_at&order=updated_at.desc&limit=20",
    { method: "GET" }
  );
  if (!res.ok) throw new Error("Could not load prospects");
  return await res.json();
}

// ── Message router ───────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
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
        case "VERIFY_SESSION": {
          const r = await verifySession();
          sendResponse(r);
          break;
        }
        case "ANALYZE_CONVERSATION": {
          const data = await analyzeConversation(msg.payload);
          sendResponse({ ok: true, analysis: data });
          break;
        }
        case "GET_CONTEXT": {
          const data = await getProspectContext(msg.payload);
          sendResponse({ ok: true, context: data });
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
        case "GET_APP_URL": {
          sendResponse({ ok: true, url: APP_URL });
          break;
        }
        default:
          sendResponse({ ok: false, error: "Unknown message type: " + msg.type });
      }
    } catch (e) {
      sendResponse({ ok: false, error: e.message });
    }
  })();
  return true; // keep channel open for async response
});

// ── Badge: green dot when signed in, ! when signed out ──────────────────────

async function updateBadge() {
  const s = await getSession();
  const signedIn = !!s?.access_token;
  chrome.action.setBadgeText({ text: signedIn ? "" : "!" });
  chrome.action.setBadgeBackgroundColor({ color: signedIn ? "#7c3aed" : "#f85149" });
}

updateBadge();
chrome.storage.onChanged.addListener((changes) => {
  if (changes.session) updateBadge();
});
