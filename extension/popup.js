// popup.js

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

async function init() {
  const s = await chrome.storage.local.get([
    "ai_mode", "cloud_url", "cloud_model", "cloud_key",
    "local_model", "app_url", "overlay_enabled",
  ]);

  // Set settings fields
  document.getElementById("ai-mode").value = s.ai_mode || "cloud";
  document.getElementById("cloud-url").value = s.cloud_url || "https://api.groq.com/openai/v1";
  document.getElementById("cloud-model").value = s.cloud_model || "llama-3.1-8b-instant";
  document.getElementById("cloud-key").value = s.cloud_key || "";
  document.getElementById("local-model").value = s.local_model || "";
  document.getElementById("app-url").value = s.app_url || "http://localhost:8080";
  document.getElementById("toggle-overlay").checked = s.overlay_enabled || false;

  updateAIMode(s.ai_mode || "cloud");
  updateStatAI(s.ai_mode || "cloud");

  // Check current tab
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

  // Check app connection and load recent
  const appUrl = s.app_url || "http://localhost:8080";
  chrome.runtime.sendMessage({ type: "CHECK_HEALTH" }, result => {
    if (result?.ok) {
      loadRecent(appUrl);
    } else {
      document.getElementById("stat-saved").textContent = "—";
      document.getElementById("stat-today").textContent = "—";
      document.getElementById("recent-list").innerHTML = '<div class="empty" style="color:#f85149">App offline — run npm run dev</div>';
    }
  });
}

function updateAIMode(mode) {
  document.getElementById("cloud-fields").style.display = mode === "cloud" ? "block" : "none";
  document.getElementById("local-fields").style.display = mode === "local" ? "block" : "none";
}

function updateStatAI(mode) {
  const labels = { cloud: "Groq", local: "Local" };
  document.getElementById("stat-ai").textContent = labels[mode] || "Cloud";
}

async function loadRecent(appUrl) {
  try {
    const base = appUrl.replace(/\/app.*$/, "");
    const res = await fetch(base + "/api/conversations", { signal: AbortSignal.timeout(2000) });
    const data = await res.json();
    const convs = data.conversations || [];

    document.getElementById("stat-saved").textContent = convs.length;
    const today = new Date().toDateString();
    const todayCount = convs.filter(c => new Date(c.savedAt).toDateString() === today).length;
    document.getElementById("stat-today").textContent = todayCount;

    const list = document.getElementById("recent-list");
    if (!convs.length) {
      list.innerHTML = '<div class="empty">Nothing saved yet.</div>';
      return;
    }
    list.innerHTML = convs.slice(0, 4).map(c => `
      <div class="recent-item">
        <div class="avatar">${(c.prospect.name || "?").split(" ").map(w => w[0]).join("").slice(0, 2)}</div>
        <div>
          <div class="recent-name">${c.prospect.name || "Unknown"}</div>
          <div class="recent-sub">${c.prospect.stage || "New Lead"} · ${c.messages?.length || 0} msgs</div>
        </div>
        <span class="recent-score">${c.prospect.leadScore || 0}/10</span>
      </div>
    `).join("");
  } catch {
    document.getElementById("stat-saved").textContent = "—";
    document.getElementById("stat-today").textContent = "—";
  }
}

// Toggle overlay
document.getElementById("toggle-overlay").onchange = async e => {
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
document.getElementById("btn-open-app").onclick = async () => {
  const s = await chrome.storage.local.get("app_url");
  const base = (s.app_url || "http://localhost:8080").replace(/\/app.*$/, "");
  chrome.tabs.create({ url: base + "/app/inbox" });
};

// AI mode switch
document.getElementById("ai-mode").onchange = e => {
  updateAIMode(e.target.value);
  updateStatAI(e.target.value);
};

// Save settings
document.getElementById("btn-save").onclick = async () => {
  await chrome.storage.local.set({
    ai_mode: document.getElementById("ai-mode").value,
    cloud_url: document.getElementById("cloud-url").value.trim() || "https://api.groq.com/openai/v1",
    cloud_model: document.getElementById("cloud-model").value.trim() || "llama-3.1-8b-instant",
    cloud_key: document.getElementById("cloud-key").value.trim(),
    local_model: document.getElementById("local-model").value.trim(),
    app_url: document.getElementById("app-url").value.trim() || "http://localhost:8080",
  });
  const msg = document.getElementById("saved-msg");
  msg.style.display = "block";
  setTimeout(() => { msg.style.display = "none"; }, 2000);
};

init();
