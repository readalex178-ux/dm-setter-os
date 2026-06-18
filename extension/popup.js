// popup.js — DM Setter OS extension popup v6.0.0
// Session comes from auth-bridge.js (reads Supabase localStorage on the web app).
// No email/password — sign in happens on dm-wingman-pro.vercel.app via Google OAuth.

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function send(type, extra = {}) {
  return new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type, ...extra }, (res) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false });
          return;
        }
        resolve(res || { ok: false });
      });
    } catch (e) {
      resolve({ ok: false });
    }
  });
}

function showView(id) {
  ["view-loading", "view-auth", "view-main"].forEach((v) => {
    const el = document.getElementById(v);
    if (el) el.style.display = v === id ? "" : "none";
  });
}

// ── Init ─────────────────────────────────────────────────────────────────────

async function init() {
  showView("view-loading");

  try {
    const res = await Promise.race([
      send("GET_SESSION"),
      new Promise((resolve) => setTimeout(() => resolve({ ok: false }), 3000)),
    ]);

    const signedIn = !!res?.user;

    if (!signedIn) {
      showView("view-auth");
      return;
    }

    showView("view-main");

    try {
      const v = chrome.runtime.getManifest().version;
      const el = document.getElementById("version");
      if (el) el.textContent = "v" + v;
    } catch (_) {}

    const email = res.user?.email || "";
    const emailEl = document.getElementById("auth-user-email");
    if (emailEl) emailEl.textContent = email;

    const s = await chrome.storage.local.get(["overlay_enabled"]);
    const toggle = document.getElementById("toggle-overlay");
    if (toggle) toggle.checked = !!s.overlay_enabled;

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
        if (dot) dot.className = "dot green";
        if (statusText) statusText.textContent = platformName + " DM detected ✓";
        if (analyseBtn) {
          analyseBtn.disabled = false;
          analyseBtn.textContent = "⚡ Analyse " + platformName + " DM";
        }
      } else {
        if (dot) dot.className = "dot orange";
        if (statusText) statusText.textContent = platformName + " — open a DM conversation";
      }
    } else {
      if (dot) dot.className = "dot grey";
      if (statusText) statusText.textContent = "Not on a supported platform";
    }

    await loadRecent();
  } catch (e) {
    showView("view-auth");
  }
}

async function loadRecent() {
  try {
    const res = await send("GET_RECENT");
    if (!res?.ok) {
      const el = document.getElementById("recent-list");
      if (el) el.innerHTML = `<div class="empty" style="color:#ef4444">${res?.error || "Could not load recent"}</div>`;
      return;
    }
    const rows = res.rows || [];

    const savedEl = document.getElementById("stat-saved");
    if (savedEl) savedEl.textContent = rows.length;

    const today = new Date().toDateString();
    const todayEl = document.getElementById("stat-today");
    if (todayEl) todayEl.textContent = rows.filter(
      (r) => new Date(r.updated_at).toDateString() === today
    ).length;

    const list = document.getElementById("recent-list");
    if (!list) return;

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
  } catch (_) {}
}

// ── Event listeners ───────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("btn-open-for-signin")?.addEventListener("click", () => {
    chrome.tabs.create({ url: APP_URL + "/auth" });
    window.close();
  });

  document.getElementById("toggle-overlay")?.addEventListener("change", async (e) => {
    const enabled = e.target.checked;
    await chrome.storage.local.set({ overlay_enabled: enabled });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_OVERLAY", visible: enabled }).catch(() => {});
    }
  });

  document.getElementById("btn-analyse")?.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.storage.local.set({ overlay_enabled: true });
    const toggle = document.getElementById("toggle-overlay");
    if (toggle) toggle.checked = true;
    chrome.tabs.sendMessage(tab.id, { type: "ANALYSE_NOW" }).catch(() => {});
    window.close();
  });

  document.getElementById("btn-open-app")?.addEventListener("click", () => {
    chrome.tabs.create({ url: APP_URL + "/app/inbox" });
  });

  document.getElementById("btn-signout")?.addEventListener("click", async () => {
    await send("SIGN_OUT");
    showView("view-auth");
  });

  init();
});
