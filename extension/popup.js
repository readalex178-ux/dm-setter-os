// popup.js — Cloud-connected

const APP_URL = "https://id-preview--3111d325-1216-4abf-b2fb-cbb0926c6d5c.lovable.app";

const PLATFORM_NAMES = {
  "www.instagram.com": "Instagram",
  "www.tiktok.com": "TikTok",
  "tiktok.com": "TikTok",
  "twitter.com": "Twitter/X",
  "x.com": "Twitter/X",
  "www.facebook.com": "Facebook",
  "www.messenger.com": "Messenger",
};

const DM_PAGES = {
  "www.instagram.com": /\/direct\//,
  "www.tiktok.com": /\/messages/,
  "tiktok.com": /\/messages/,
  "twitter.com": /\/messages/,
  "x.com": /\/messages/,
  "www.facebook.com": /\/messages/,
  "www.messenger.com": /.*/,
};

function send(type, extra = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type, ...extra }, (res) => resolve(res || { ok: false }));
  });
}

async function init() {
  const s = await chrome.storage.local.get(["overlay_enabled"]);
  document.getElementById("toggle-overlay").checked = s.overlay_enabled || false;
  document.getElementById("stat-ai").textContent = "Cloud";

  // Platform detection
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ? new URL(tab.url) : null;
  const host = url?.hostname || "";
  const path = url?.pathname || "";
  const platformName = PLATFORM_NAMES[host];
  const dmPattern = DM_PAGES[host];
  const isOnDM = dmPattern ? dmPattern.test(path) : false;

  if (platformName) {
    document.getElementById("status-dot").className = "dot green";
    document.getElementById("status-text").textContent = platformName + " detected ✓";
    document.getElementById("btn-analyse").disabled = false;
    document.getElementById("btn-analyse").textContent = "⚡ Analyse " + platformName + " DM";
    if (!isOnDM) {
      document.getElementById("status-dot").className = "dot orange";
      document.getElementById("status-text").textContent = platformName + " — open a DM conversation first";
    }
  } else {
    document.getElementById("status-dot").className = "dot grey";
    document.getElementById("status-text").textContent = "Not on a supported platform";
    document.getElementById("btn-analyse").disabled = true;
  }

  await refreshAccount();
}

async function refreshAccount() {
  const res = await send("GET_SESSION");
  const signedIn = !!res?.user;
  document.getElementById("signed-in").style.display = signedIn ? "block" : "none";
  document.getElementById("signed-out").style.display = signedIn ? "none" : "block";

  if (signedIn) {
    document.getElementById("auth-user").textContent = res.user.email || "your account";
    loadRecent();
  } else {
    document.getElementById("account-details").open = true;
    document.getElementById("stat-saved").textContent = "—";
    document.getElementById("stat-today").textContent = "—";
    document.getElementById("recent-list").innerHTML =
      '<div class="empty" style="color:#d29922">Sign in below to sync your DMs</div>';
  }
}

async function loadRecent() {
  const res = await send("GET_RECENT");
  if (!res?.ok) {
    document.getElementById("recent-list").innerHTML =
      '<div class="empty" style="color:#f85149">' + (res?.error || "Could not load") + "</div>";
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
    list.innerHTML = '<div class="empty">Nothing saved yet.</div>';
    return;
  }
  list.innerHTML = rows
    .slice(0, 4)
    .map(
      (r) => `
      <div class="recent-item">
        <div class="avatar">${(r.name || "?").split(" ").map((w) => w[0]).join("").slice(0, 2)}</div>
        <div>
          <div class="recent-name">${r.name || "Unknown"}</div>
          <div class="recent-sub">${r.stage || "New Lead"}</div>
        </div>
        <span class="recent-score">${r.lead_score || 0}/10</span>
      </div>`
    )
    .join("");
}

// Toggle overlay
document.getElementById("toggle-overlay").onchange = async (e) => {
  const enabled = e.target.checked;
  await chrome.storage.local.set({ overlay_enabled: enabled });
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_OVERLAY", visible: enabled }).catch(() => {});
  }
};

// Analyse button
document.getElementById("btn-analyse").onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.storage.local.set({ overlay_enabled: true });
  document.getElementById("toggle-overlay").checked = true;
  chrome.tabs.sendMessage(tab.id, { type: "ANALYSE_NOW" }).catch(() => {});
  window.close();
};

// Open app
document.getElementById("btn-open-app").onclick = () => {
  chrome.tabs.create({ url: APP_URL + "/app/inbox" });
};

// Sign in
document.getElementById("btn-signin").onclick = async () => {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const err = document.getElementById("auth-error");
  err.style.display = "none";
  if (!email || !password) {
    err.textContent = "Enter your email and password";
    err.style.display = "block";
    return;
  }
  const btn = document.getElementById("btn-signin");
  btn.textContent = "Signing in…";
  btn.disabled = true;
  const res = await send("SIGN_IN", { email, password });
  btn.textContent = "Sign In";
  btn.disabled = false;
  if (!res?.ok) {
    err.textContent = res?.error || "Sign in failed";
    err.style.display = "block";
    return;
  }
  await refreshAccount();
};

// Sign out
document.getElementById("btn-signout").onclick = async () => {
  await send("SIGN_OUT");
  await refreshAccount();
};

init();
