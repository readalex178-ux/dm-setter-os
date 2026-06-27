// popup.js — DM Setter OS v6
// Auth via Google OAuth on dm-wingman-pro.vercel.app.
// Session is synced automatically by auth-bridge.js content script.

const APP = "https://dm-wingman-pro.vercel.app";

const HOSTS = {
  "www.instagram.com": { name: "Instagram", dm: /\/direct\// },
  "www.tiktok.com":    { name: "TikTok",    dm: /\/messages/ },
  "tiktok.com":        { name: "TikTok",    dm: /\/messages/ },
  "twitter.com":       { name: "Twitter/X", dm: /\/messages/ },
  "x.com":             { name: "Twitter/X", dm: /\/messages/ },
  "www.facebook.com":  { name: "Facebook",  dm: /\/messages/ },
  "www.messenger.com": { name: "Messenger", dm: /.*/ },
  "www.linkedin.com":  { name: "LinkedIn",  dm: /\/messaging/ },
  "linkedin.com":      { name: "LinkedIn",  dm: /\/messaging/ },
  "web.whatsapp.com":  { name: "WhatsApp",  dm: /.*/ },
};

// ── Messaging ──────────────────────────────────────────────────────────────────────────────

function msg(type, payload) {
  return new Promise(resolve => {
    try {
      chrome.runtime.sendMessage({ type, ...payload }, res => {
        if (chrome.runtime.lastError) { resolve({ ok: false }); return; }
        resolve(res || { ok: false });
      });
    } catch { resolve({ ok: false }); }
  });
}

// ── Views ────────────────────────────────────────────────────────────────────────────

function show(id) {
  ["view-auth", "view-main", "view-loading"].forEach(v => {
    const el = document.getElementById(v);
    if (el) el.style.display = v === id ? "" : "none";
  });
}

// ── Init ───────────────────────────────────────────────────────────────────────────────

async function init() {
  show("view-loading");

  // 3-second timeout in case background service worker is cold-starting
  const res = await Promise.race([
    msg("GET_SESSION"),
    new Promise(r => setTimeout(() => r({ ok: false }), 3000)),
  ]);

  if (!res?.user) { show("view-auth"); return; }

  show("view-main");
  populateMain(res.user);
}

async function populateMain(user) {
  // Version
  try { document.getElementById("ver").textContent = "v" + chrome.runtime.getManifest().version; } catch {}

  // Email
  const emailEl = document.getElementById("footer-email");
  if (emailEl) emailEl.textContent = user.email || "";

  // Overlay toggle
  const s = await chrome.storage.local.get("overlay_enabled").catch(() => ({}));
  const tog = document.getElementById("tog-overlay");
  if (tog) tog.checked = !!s.overlay_enabled;

  // Platform detection
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const host = tab?.url ? new URL(tab.url).hostname : "";
    const path = tab?.url ? new URL(tab.url).pathname : "";
    const plat = HOSTS[host];
    const dot = document.getElementById("dot");
    const txt = document.getElementById("status-txt");
    const btn = document.getElementById("btn-analyse");

    if (plat) {
      if (plat.dm.test(path)) {
        dot?.classList.add("green");
        if (txt) txt.textContent = plat.name + " DM detected \u2713";
        if (btn) { btn.disabled = false; btn.textContent = "Analyse " + plat.name + " DM"; }
      } else {
        dot?.classList.add("amber");
        if (txt) txt.textContent = plat.name + " — open a DM conversation";
      }
    } else {
      if (txt) txt.textContent = "Not on a supported platform";
    }
  } catch {}

  // Recent prospects
  loadRecent();
  loadWebhook();
}

async function loadRecent() {
  const res = await msg("GET_RECENT");
  const rows = res?.rows || [];

  const sv = document.getElementById("s-saved");
  const tv = document.getElementById("s-today");
  if (sv) sv.textContent = rows.length;

  const today = new Date().toDateString();
  if (tv) tv.textContent = rows.filter(r => new Date(r.updated_at).toDateString() === today).length;

  const list = document.getElementById("recent-list");
  if (!list) return;

  if (!rows.length) {
    list.innerHTML = '<div class="empty-msg">Nothing saved yet. Analyse a DM to get started.</div>';
    return;
  }

  list.innerHTML = rows.slice(0, 4).map(r => {
    const init = (r.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const score = r.conversation_score ?? r.lead_score;
    return `<div class="recent-item">
      <div class="av">${init}</div>
      <div><div class="ri-name">${r.name || "Unknown"}</div><div class="ri-stage">${r.stage || "New Lead"}</div></div>
      ${score != null ? `<span class="ri-score">${score}/100</span>` : ""}
    </div>`;
  }).join("");
}


async function loadWebhook() {
  const s = await chrome.storage.local.get("crm_webhook_url").catch(() => ({}));
  const url = s.crm_webhook_url || "";
  const inp = document.getElementById("webhook-url");
  if (inp) inp.value = url;
}

// ── Events ───────────────────────────────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", () => {

  document.getElementById("btn-signin")?.addEventListener("click", () => {
    chrome.tabs.create({ url: APP + "/auth" });
    window.close();
  });

  document.getElementById("btn-open-app")?.addEventListener("click", () => {
    chrome.tabs.create({ url: APP + "/app/inbox" });
    window.close();
  });

  document.getElementById("tog-overlay")?.addEventListener("change", async e => {
    const on = e.target.checked;
    await chrome.storage.local.set({ overlay_enabled: on });
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_OVERLAY", visible: on }).catch(() => {});
  });

  document.getElementById("btn-analyse")?.addEventListener("click", async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    await chrome.storage.local.set({ overlay_enabled: true });
    const tog = document.getElementById("tog-overlay");
    if (tog) tog.checked = true;
    chrome.tabs.sendMessage(tab.id, { type: "ANALYSE_NOW" }).catch(() => {});
    window.close();
  });

  document.getElementById("btn-signout")?.addEventListener("click", async () => {
    await msg("SIGN_OUT");
    show("view-auth");
  });


  document.getElementById("btn-toggle-webhook")?.addEventListener("click", () => {
    const sec = document.getElementById("webhook-section");
    if (sec) sec.style.display = sec.style.display === "none" ? "" : "none";
  });

  document.getElementById("btn-save-webhook")?.addEventListener("click", async () => {
    const url = document.getElementById("webhook-url")?.value?.trim() || "";
    await chrome.storage.local.set({ crm_webhook_url: url });
    const msg = document.getElementById("webhook-saved-msg");
    if (msg) { msg.style.display = ""; setTimeout(() => { msg.style.display = "none"; }, 2000); }
  });

    init();
});
