// DM Setter OS — Popup Script (with auth + cloud sync)

const APP_URL = "https://id-preview--3111d325-1216-4abf-b2fb-cbb0926c6d5c.lovable.app/app";

// Init Supabase client
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
dataStore.setSupabase(sb);

let isSignUp = false;

// ---- Auth UI ----

function showAuth() {
  document.getElementById("auth-view").style.display = "block";
  document.getElementById("main-view").style.display = "none";
}

function showMain() {
  document.getElementById("auth-view").style.display = "none";
  document.getElementById("main-view").style.display = "block";
}

document.getElementById("auth-toggle-btn").addEventListener("click", () => {
  isSignUp = !isSignUp;
  document.getElementById("auth-title").textContent = isSignUp ? "Sign Up" : "Sign In";
  document.getElementById("auth-submit").textContent = isSignUp ? "Sign Up" : "Sign In";
  document.getElementById("auth-toggle-text").textContent = isSignUp
    ? "Already have an account?"
    : "Don't have an account?";
  document.getElementById("auth-toggle-btn").textContent = isSignUp ? "Sign In" : "Sign Up";
  document.getElementById("auth-error").style.display = "none";
});

document.getElementById("auth-submit").addEventListener("click", async () => {
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;
  const errEl = document.getElementById("auth-error");
  errEl.style.display = "none";

  if (!email || !password) {
    errEl.textContent = "Please enter email and password";
    errEl.style.display = "block";
    return;
  }

  const btn = document.getElementById("auth-submit");
  btn.disabled = true;
  btn.textContent = "Loading…";

  let result;
  if (isSignUp) {
    result = await sb.auth.signUp({ email, password });
  } else {
    result = await sb.auth.signInWithPassword({ email, password });
  }

  btn.disabled = false;
  btn.textContent = isSignUp ? "Sign Up" : "Sign In";

  if (result.error) {
    errEl.textContent = result.error.message;
    errEl.style.display = "block";
    return;
  }

  if (isSignUp && result.data?.user && !result.data.session) {
    errEl.textContent = "Check your email to confirm your account!";
    errEl.style.display = "block";
    errEl.style.color = "#00d4aa";
    return;
  }

  // Save session info
  await chrome.storage.local.set({ userEmail: email, isLoggedIn: true });
  await initMainView(email);
});

document.getElementById("auth-skip").addEventListener("click", async () => {
  await chrome.storage.local.set({ isLoggedIn: false, offlineOnly: true });
  await initMainView(null);
});

// ---- Main View ----

async function initMainView(email) {
  showMain();

  const userBar = document.getElementById("user-bar");
  if (email) {
    document.getElementById("user-email").textContent = email;
    userBar.style.display = "flex";
    updateSyncStatus(true);

    // Pull latest from cloud
    await dataStore.pullFromCloud();
    // Sync any pending local data
    await dataStore.syncToCloud();
  } else {
    userBar.style.display = "none";
    updateSyncStatus(false);
  }

  await loadConversations();
}

function updateSyncStatus(online) {
  const dot = document.getElementById("sync-dot");
  const label = document.getElementById("sync-label");
  dot.className = "sync-dot " + (online ? "online" : "offline");
  label.textContent = online ? "Synced" : "Offline";
}

async function loadConversations() {
  const prospects = await dataStore.getProspects();
  const messages = await dataStore.getMessages();

  if (prospects.length > 0) {
    // Build conversation list from real data
    const conversations = prospects.map((p) => {
      const pMsgs = messages.filter((m) => m.prospect_id === p.id);
      const lastMsg = pMsgs.sort((a, b) => new Date(b.sent_at || b.saved_at) - new Date(a.sent_at || a.saved_at))[0];
      const unread = pMsgs.filter((m) => m.sender === "prospect" && !m.read).length;

      return {
        id: p.id,
        name: p.name,
        preview: lastMsg?.content || "No messages yet",
        unread,
        time: lastMsg ? timeAgo(lastMsg.sent_at || lastMsg.saved_at) : "",
        hot: (p.lead_score || 0) >= 70,
      };
    });

    renderInbox(conversations);
    updateStats(conversations);
  } else {
    // Show demo data if no real data
    renderInbox(DEMO_CONVERSATIONS);
    updateStats(DEMO_CONVERSATIONS);
  }
}

const DEMO_CONVERSATIONS = [
  { id: 1, name: "Sarah Johnson", preview: "I'm definitely interested in the program…", unread: 2, time: "2m", hot: true },
  { id: 2, name: "Mike Chen", preview: "What's the investment look like?", unread: 1, time: "15m", hot: true },
  { id: 3, name: "Jessica Williams", preview: "Can we hop on a call tomorrow?", unread: 0, time: "1h", hot: false },
  { id: 4, name: "David Brown", preview: "Thanks for reaching out!", unread: 0, time: "3h", hot: false },
  { id: 5, name: "Emma Davis", preview: "I've been struggling with exactly this…", unread: 3, time: "5m", hot: true },
];

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return mins + "m";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h";
  return Math.floor(hours / 24) + "d";
}

function getInitials(name) {
  return name.split(" ").map((w) => w[0]).join("").toUpperCase();
}

function renderInbox(conversations) {
  const list = document.getElementById("inbox-list");
  if (!conversations.length) {
    list.innerHTML = '<div class="empty-state">No conversations yet</div>';
    return;
  }

  list.innerHTML = conversations
    .map(
      (c) => `
    <div class="inbox-item" data-id="${c.id}">
      <div class="inbox-avatar">${getInitials(c.name)}</div>
      <div class="inbox-info">
        <div class="inbox-name">${c.name}</div>
        <div class="inbox-preview">${c.preview}</div>
      </div>
      ${c.unread ? `<div class="inbox-badge">${c.unread}</div>` : ""}
      <div class="inbox-time">${c.time}</div>
    </div>
  `
    )
    .join("");

  list.querySelectorAll(".inbox-item").forEach((item) => {
    item.addEventListener("click", () => openApp("/inbox"));
  });
}

function updateStats(conversations) {
  const unread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);
  const hot = conversations.filter((c) => c.hot).length;
  const ready = conversations.filter((c) => c.preview.toLowerCase().includes("call")).length;

  document.getElementById("stat-unread").textContent = unread;
  document.getElementById("stat-hot").textContent = hot;
  document.getElementById("stat-ready").textContent = ready;
}

function openApp(path = "") {
  chrome.tabs.create({ url: APP_URL + path });
}

// ---- Navigation ----
document.getElementById("open-full-app").addEventListener("click", () => openApp());
document.getElementById("btn-inbox").addEventListener("click", () => openApp("/inbox"));
document.getElementById("btn-pipeline").addEventListener("click", () => openApp("/pipeline"));
document.getElementById("btn-scripts").addEventListener("click", () => openApp("/scripts"));
document.getElementById("btn-training").addEventListener("click", () => openApp("/training"));

// ---- Sync & Logout ----
document.getElementById("btn-sync").addEventListener("click", async () => {
  const label = document.getElementById("sync-label");
  label.textContent = "Syncing…";
  await dataStore.pullFromCloud();
  await dataStore.syncToCloud();
  label.textContent = "Synced ✓";
  await loadConversations();
  setTimeout(() => { label.textContent = "Synced"; }, 2000);
});

document.getElementById("btn-logout").addEventListener("click", async () => {
  await sb.auth.signOut();
  await chrome.storage.local.set({ isLoggedIn: false, userEmail: null });
  showAuth();
});

// ---- Toggle settings ----
document.getElementById("toggle-overlay").addEventListener("change", (e) => {
  chrome.storage.local.set({ overlayEnabled: e.target.checked });
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type: "TOGGLE_OVERLAY", visible: e.target.checked });
    }
  });
});

document.getElementById("toggle-notifs").addEventListener("change", (e) => {
  chrome.storage.local.set({ notifsEnabled: e.target.checked });
  if (e.target.checked) {
    chrome.alarms.create("check-messages", { periodInMinutes: 5 });
  } else {
    chrome.alarms.clear("check-messages");
  }
});

// ---- Init ----
(async () => {
  const settings = await chrome.storage.local.get(["overlayEnabled", "notifsEnabled", "isLoggedIn", "userEmail", "offlineOnly"]);
  document.getElementById("toggle-overlay").checked = settings.overlayEnabled || false;
  document.getElementById("toggle-notifs").checked = settings.notifsEnabled !== false;

  // Check for existing Supabase session
  const { data: { session } } = await sb.auth.getSession();

  if (session) {
    await initMainView(session.user.email);
  } else if (settings.offlineOnly) {
    await initMainView(null);
  } else {
    showAuth();
  }
})();
