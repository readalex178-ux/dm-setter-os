// DM Setter OS — Popup Script

const APP_URL = "APP_URL_PLACEHOLDER"; // Replace after publishing

// Demo data for offline / demo mode
const DEMO_CONVERSATIONS = [
  { id: 1, name: "Sarah Johnson", preview: "I'm definitely interested in the program…", unread: 2, time: "2m", hot: true },
  { id: 2, name: "Mike Chen", preview: "What's the investment look like?", unread: 1, time: "15m", hot: true },
  { id: 3, name: "Jessica Williams", preview: "Can we hop on a call tomorrow?", unread: 0, time: "1h", hot: false },
  { id: 4, name: "David Brown", preview: "Thanks for reaching out!", unread: 0, time: "3h", hot: false },
  { id: 5, name: "Emma Davis", preview: "I've been struggling with exactly this…", unread: 3, time: "5m", hot: true },
];

function getInitials(name) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase();
}

function renderInbox(conversations) {
  const list = document.getElementById("inbox-list");
  if (!conversations.length) {
    list.innerHTML = '<div class="empty-state">No conversations yet</div>';
    return;
  }

  list.innerHTML = conversations.map(c => `
    <div class="inbox-item" data-id="${c.id}">
      <div class="inbox-avatar">${getInitials(c.name)}</div>
      <div class="inbox-info">
        <div class="inbox-name">${c.name}</div>
        <div class="inbox-preview">${c.preview}</div>
      </div>
      ${c.unread ? `<div class="inbox-badge">${c.unread}</div>` : ""}
      <div class="inbox-time">${c.time}</div>
    </div>
  `).join("");

  list.querySelectorAll(".inbox-item").forEach(item => {
    item.addEventListener("click", () => {
      openApp("/inbox");
    });
  });
}

function updateStats(conversations) {
  const unread = conversations.reduce((sum, c) => sum + (c.unread || 0), 0);
  const hot = conversations.filter(c => c.hot).length;
  const ready = conversations.filter(c => c.preview.toLowerCase().includes("call")).length;

  document.getElementById("stat-unread").textContent = unread;
  document.getElementById("stat-hot").textContent = hot;
  document.getElementById("stat-ready").textContent = ready;
}

function openApp(path = "") {
  const url = APP_URL + path;
  chrome.tabs.create({ url });
}

// Navigation buttons
document.getElementById("open-full-app").addEventListener("click", () => openApp());
document.getElementById("btn-inbox").addEventListener("click", () => openApp("/inbox"));
document.getElementById("btn-pipeline").addEventListener("click", () => openApp("/pipeline"));
document.getElementById("btn-scripts").addEventListener("click", () => openApp("/scripts"));
document.getElementById("btn-training").addEventListener("click", () => openApp("/training"));

// Toggle settings
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

// Init
(async () => {
  const settings = await chrome.storage.local.get(["overlayEnabled", "notifsEnabled"]);
  document.getElementById("toggle-overlay").checked = settings.overlayEnabled || false;
  document.getElementById("toggle-notifs").checked = settings.notifsEnabled !== false;

  // Use demo data (replace with real API calls when deployed)
  renderInbox(DEMO_CONVERSATIONS);
  updateStats(DEMO_CONVERSATIONS);
})();
