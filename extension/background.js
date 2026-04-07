// DM Setter OS — Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ notifsEnabled: true, overlayEnabled: false });
  chrome.alarms.create("check-messages", { periodInMinutes: 5 });
  console.log("DM Setter OS installed");
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "check-messages") return;

  const { notifsEnabled } = await chrome.storage.local.get("notifsEnabled");
  if (!notifsEnabled) return;

  // Demo notification — replace with real API polling
  const shouldNotify = Math.random() > 0.7;
  if (shouldNotify) {
    chrome.notifications.create({
      type: "basic",
      iconUrl: "icon128.png",
      title: "🔥 Hot Lead Activity",
      message: "Sarah Johnson replied: \"I'm definitely interested in the program…\"",
      priority: 2,
    });
  }
});

chrome.notifications.onClicked.addListener(() => {
  chrome.tabs.create({ url: "APP_URL_PLACEHOLDER/inbox" });
});

// Badge for unread count
function updateBadge(count) {
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" });
  chrome.action.setBadgeBackgroundColor({ color: "#00d4aa" });
}

// Set demo badge
updateBadge(6);
