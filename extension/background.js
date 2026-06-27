// background.js — DM Setter OS service worker
// Owns the Supabase session and all API calls to DM Setter OS.
// The extension is a dumb interface layer — ALL intelligence lives server-side.

const SUPABASE_URL = "https://mtvtzwxymlfgiffuvlzp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10dnR6d3h5bWxmZ2lmZnV2bHpwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjUzODEsImV4cCI6MjA5NzMwMTM4MX0.B2oaaXGMUptlJQJO8_pe3cdCK-rXKZLjAxREE-DAyVI";
const APP_URL = "https://dm-wingman-pro.vercel.app";

const PLATFORM_IDS = ["instagram", "tiktok", "twitter", "facebook", "linkedin", "messenger", "whatsapp"];

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

// ── Edge Function bridge ─────────────────────────────────────────────────────

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

// Mirrors deriveProfileUrl() in src/hooks/useSetterData.tsx — derives a
// best-effort profile URL from platform + handle when the extension's
// actual page URL (the most accurate source) isn't usable for some reason.
function deriveProfileUrl(platform, handle) {
  if (!handle) return null;
  const cleanHandle = handle.trim().replace(/^@/, "");
  if (!cleanHandle) return null;
  switch ((platform || "").toLowerCase()) {
    case "instagram":
      return `https://instagram.com/${cleanHandle}`;
    case "tiktok":
      return `https://tiktok.com/@${cleanHandle}`;
    case "facebook":
      return `https://facebook.com/${cleanHandle}`;
    case "linkedin":
      return `https://linkedin.com/in/${cleanHandle}`;
    case "twitter":
    case "x":
      return `https://x.com/${cleanHandle}`;
    default:
      return null;
  }
}

function isUsableProfileUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

// Looks up an existing prospect for this user by handle+platform — the
// natural dedup key for "the same person you're DMing." Returns the row id
// or null. Only handle+platform is used (not name), since names are
// freeform and unreliable, while handle+platform uniquely identifies the
// account on that platform.
async function findExistingProspect(userId, handle, platform) {
  if (!handle) return null; // nothing reliable to dedup on
  const params = new URLSearchParams({
    select: "id",
    user_id: `eq.${userId}`,
    handle: `eq.${handle}`,
    limit: "1",
  });
  // platform can legitimately be null (unrecognized platform) — match that too.
  params.set("platform", platform ? `eq.${platform}` : "is.null");
  const res = await authedFetch(`/rest/v1/prospects?${params.toString()}`, { method: "GET" });
  if (!res.ok) return null; // best-effort — fall through to insert rather than block the save
  const rows = await res.json().catch(() => []);
  return rows?.[0]?.id || null;
}


// ── Webhook (Zapier / Make → any CRM) ─────────────────────────────────────────
async function fireWebhook(payload) {
  try {
    const s = await chrome.storage.local.get("crm_webhook_url");
    const url = s?.crm_webhook_url?.trim();
    if (!url) return;
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.warn("[DM Setter OS] Webhook error:", e?.message);
  }
}

async function saveConversation(payload) {
  const session = await getSession();
  if (!session?.user?.id) throw new Error("Sign in via the extension popup first.");
  const userId = session.user.id;
  const { prospect, messages, analysis } = payload;

  const pid = (prospect.platform || "").toLowerCase();
  const platform = PLATFORM_IDS.includes(pid) ? pid : null;
  const handle = (prospect.handle || "").trim() || null;

  // Basic identity fields are always written. AI-derived fields are optional
  // enrichment — they're only included when analysis actually produced a
  // value, so a plain "Save to CRM" click (no analysis run) never clobbers
  // previously-analyzed data with nulls, and never blocks on analysis being
  // present in the first place.
  // The content script's window.location.href (passed as prospect.profileUrl)
  // is the most accurate possible profile link since it's the actual page
  // being scraped — only fall back to a guessed pattern if it's missing or
  // not a usable http(s) URL.
  const profileUrl = isUsableProfileUrl(prospect.profileUrl)
    ? prospect.profileUrl
    : deriveProfileUrl(platform, handle);

  const baseRow = {
    user_id: userId,
    name: prospect.name || "Unknown",
    handle,
    stage: analysis?.stage || prospect.stage || "New Lead",
    source: prospect.source || `${prospect.platform || "Extension"} (Extension)`,
    platform,
    profile_url: profileUrl,
    last_contact_at: new Date().toISOString(),
  };
  const aiFields = {};
  if (analysis?.conversation_score != null) aiFields.conversation_score = analysis.conversation_score;
  if (analysis?.booking_probability != null) aiFields.booking_probability = analysis.booking_probability;
  if (analysis?.temperature) aiFields.lead_temperature = analysis.temperature;
  if (analysis?.next_action) aiFields.suggested_action = analysis.next_action;
  if (Array.isArray(analysis?.objections) && analysis.objections.length) {
    aiFields.concerns = analysis.objections.join("; ");
  } else if (prospect.concerns) {
    aiFields.concerns = prospect.concerns;
  }

  // Dedup on handle+platform: if this prospect already exists (saved before,
  // or being enriched by a later Analyse run), update that row instead of
  // inserting a duplicate.
  const existingId = await findExistingProspect(userId, handle, platform);
  let prospectId = existingId;

  if (existingId) {
    const upRes = await authedFetch(`/rest/v1/prospects?id=eq.${existingId}`, {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...baseRow, ...aiFields }),
    });
    if (!upRes.ok) {
      const t = await upRes.text();
      throw new Error("Could not update existing prospect: " + t.slice(0, 160));
    }
  } else {
    prospectId = crypto.randomUUID();
    const prospectRow = {
      id: prospectId,
      conversation_score: null,
      booking_probability: null,
      lead_temperature: null,
      suggested_action: null,
      concerns: null,
      ...baseRow,
      ...aiFields,
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
  }

  // Only insert messages when the prospect is NEW — skip on re-saves to avoid
  // duplicate rows for conversations that were already persisted.
  if (!existingId && Array.isArray(messages) && messages.length) {
    const rows = messages.map((m, i) => ({
      id: crypto.randomUUID(),
      user_id: userId,
      prospect_id: prospectId,
      sender: m.sender || "prospect",
      content: m.content || "",
      sent_at: new Date(Date.now() - (messages.length - 1 - i) * 2000).toISOString(),
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

  // Fire CRM webhook (Zapier/Make/HubSpot/Salesforce) if configured
  const session2 = await getSession();
  fireWebhook({
    id: prospectId,
    name: baseRow.name,
    handle: baseRow.handle,
    platform: baseRow.platform,
    stage: baseRow.stage,
    profile_url: baseRow.profile_url,
    source: baseRow.source,
    last_contact_at: baseRow.last_contact_at,
    conversation_score: aiFields.conversation_score ?? null,
    booking_probability: aiFields.booking_probability ?? null,
    lead_temperature: aiFields.lead_temperature ?? null,
    suggested_action: aiFields.suggested_action ?? null,
    concerns: aiFields.concerns ?? null,
    user_email: session2?.user?.email ?? null,
    timestamp: new Date().toISOString(),
  });

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
        case "SYNC_SESSION": {
          // Sent by auth-bridge.js when user signs in/out on dm-wingman-pro.vercel.app
          const raw = msg.session;
          const session = raw?.currentSession || raw || null;
          if (session?.access_token) {
            await setSession(session);
          } else {
            await clearSession();
          }
          sendResponse({ ok: true });
          break;
        }
        case "CLEAR_SESSION": {
          await clearSession();
          sendResponse({ ok: true });
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
  return true;
});

// ── Badge: cyan when signed in, red ! when signed out ───────────────────────

async function updateBadge() {
  const s = await getSession();
  const signedIn = !!s?.access_token;
  chrome.action.setBadgeText({ text: signedIn ? "" : "!" });
  chrome.action.setBadgeBackgroundColor({ color: signedIn ? "#00e5ff" : "#f85149" });
}

updateBadge();
chrome.storage.onChanged.addListener((changes) => {
  if (changes.session) updateBadge();
});
