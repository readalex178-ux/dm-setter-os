// popup.js — DM Setter OS extension popup v6.0.0
// Session comes from auth-bridge.js (reads Supabase localStorage on the web app).
// No email/password here — sign in happens on dm-wingman-pro.vercel.app via Google OAuth.

const APP_URL = "https://dm-wingman-pro.vercel.app";

const PLATFORM_NAMES = {
  "www.instagram.com": "Instagram",
  "www.tiktok.com": "TikTok",
  "tiktok.com": "TikTok",
  "twitter.com": "Twitter/X",
  "x.com": "Twitter/X",
  "www.facebook.com": "Facebook",
  "www.messenger.com": "Messenger",
  "www.linkedin.com": "LinkedIn",
  "linkedin.com": "LinkedIn",
  "web.whatsapp.com": "WhatsApp",
};

const DM_PATHS = {
  "www.instagram.com": /\/direct\//,
  "www.tiktok.com": /\/messages/,
  "tiktok.com": /\/messages/,
  "twitter.com": /\/messages/,
  "x.com": /\/messages/,
  "www.facebook.com": /\/messages/,
  "www.messenger.com": /.*/,
  "www.linkedin.com": /\/messaging/,
  "linkedin.com": /\/messaging/,
  "web.whatsapp.com": /.*/,
};

function send(type, extra = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...extra }, (res) => resolve(res || { ok: false }));
  });
}

function showView(id) {
  ["view-loading", "view-auth", "view-main"].forEach((v) => {
    const el = document.getElementById(v);
    if (el) el.style.display = v === id ? "" : "none";
  });
}

async function init() {
  showView("view-loading");

  // Determine session state
  const res = await send("GET_SESSION");
  const signedIn = !!res?.user;

  if (!signedIn) {
    showView("view-auth");
    return;
  }

  showView("view-main");

  // Version badge
  try {
    const v = chrome.runtime.getManifest().version;
    document.getElementById("version").textContent = "v" + v;
  } catch (_) {}

  // Account email
  const email = res.user?.email || "";
  document.getElementById("auth-user-email").textContent = email;

  // Overlay toggle state
  const s = await chrome.storage.local.get(["overlay_enabled"]);
  document.getElementById("toggle-overlay").checked = !!s.overlay_enabled;

  // Platform detection
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ? new URL(tab.url) : null;
  const host = url?.hostname || "";
  const path = url?.pathname || "";
  const platformName = PLATFORM_NAMES[host];
  const dmPattern = DM_PATHS[host];
  const isOnDM = dmPattern ? dmPattern.test(path) : false;

  const dot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");
  const analyseBtn = document.getElementById("btn-analyse");

  if (platformName) {
    if (isOnDM) {
      dot.className = "dot green";
      statusText.textContent = platformName + " DM detected ✓";
      analyseBtn.disabled = false;
      analyseBtn.textContent = "⚡ Analyse " + platformName + " DM";
    } else {
      dot.className = "dot orange";
      statusText.textContent = platformName + " — open a DM conversation";
      analyseBtn.disabled = true;
    }
  } else {
    dot.className = "dot grey";
    statusText.textContent = "Not on a supported platform";
    analyseBtn.disabled = true;
  }

  await loadRecent();
}

async function loadRecent() {
  const res = await send("GET_RECENT");
  if (!res?.ok) {
    document.getElementById("recent-list").innerHTML =
      `<div class="empty" style="color:#ef4444">${res?.error || "Could not load recent"}</div>`;
    return;
  }
  const rows = res.rows || [];
  document.getElementById("stat-saved").textContent = rows.length;

  const today = new Date().toDateString();
  document.getElementById("stat-today").textContent = rows.filter(
    (r) => new Date(r.updated_at).toDateString() === today
  ).length;

  const list = document.getElementById("recent-list");
  if (!rows.length) {
    list.innerHTML = '<div class="empty">Nothing saved yet. Open a DM, analyse it, then save.</div>';
    return;
  }

  list.innerHTML = rows.slice(0, 4).map((r) => {
    const initials = (r.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const score = r.conversation_score ?? r.lead_score;
    return `
      <div class="recent-item">
        <div class="avatar">${initials}</div>
        <div>
          <div class="recent-name">${r.name || "Unknown"}</div>
          <div class="recent-sub">${r.stage || "New Lead"}</div>
        </div>
        ${score != null ? `<span class="recent-score">${score}/100</span>` : ""}
      </div>
    `;
  }).join("");
}

// ── Event listeners ──────────────────────────────────────────────────────────

// Sign in via web app (Google OAuth)
document.getElementById("btn-open-for-signin").addEventListener("click", () => {
  chrome.tabs.create({ url: APP_URL + "/auth" });
  window.close();
});

// Toggle panel on page
document.getElementById("toggle-overlay")?.addEventListener("change", async (e) => {
  const enabled = e.target.checked;
  await chrome.storage.local.set({ overlay_enabled: enabled });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_OVERLAY", visible: enabled }).catch(() => {});
  }
});

// Analyse button
document.getElementById("btn-analyse")?.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.storage.local.set({ overlay_enabled: true });
  document.getElementById("toggle-overlay").checked = true;
  chrome.tabs.sendMessage(tab.id, { type: "ANALYSE_NOW" }).catch(() => {});
  window.close();
});

// Open app button
document.getElementById("btn-open-app")?.addEventListener("click", () => {
  chrome.tabs.create({ url: APP_URL + "/app/inbox" });
});

// Sign out
document.getElementById("btn-signout")?.addEventListener("click", async () => {
  await send("SIGN_OUT");
  showView("view-auth");
});

init();
