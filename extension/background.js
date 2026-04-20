// background.js — service worker
// Bridges extension ↔ app. Background workers can reach http://localhost freely.

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("ai_mode").then(s => {
    if (!s.ai_mode) {
      chrome.storage.local.set({
        ai_mode: "cloud",
        cloud_url: "https://api.groq.com/openai/v1",
        cloud_model: "llama-3.1-8b-instant",
        cloud_key: "",
        app_url: "http://localhost:8080",
        overlay_enabled: false,
      });
    }
  });
});

async function getAppBase() {
  const s = await chrome.storage.local.get("app_url");
  return (s.app_url || "http://localhost:8080").replace(/\/app.*$/, "");
}

// Check if app is running
async function checkHealth() {
  try {
    const base = await getAppBase();
    const res = await fetch(base + "/api/health", { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return data.ok === true;
  } catch {
    return false;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  if (msg.type === "CHECK_HEALTH") {
    checkHealth().then(ok => sendResponse({ ok }));
    return true;
  }

  if (msg.type === "SAVE_CONVERSATION") {
    (async () => {
      try {
        const base = await getAppBase();

        // Check app is running first
        const healthy = await checkHealth();
        if (!healthy) {
          sendResponse({ ok: false, error: "App is not running — start it with npm run dev at " + base });
          return;
        }

        const res = await fetch(base + "/api/save-conversation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(msg.payload),
        });

        const text = await res.text();
        if (!res.ok) {
          throw new Error("App returned " + res.status + ": " + text.slice(0, 100));
        }

        const data = JSON.parse(text);
        sendResponse({ ok: true, id: data.id });

      } catch (e) {
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

});

// Keep service worker alive with periodic health checks
// Also updates badge icon to show connection status
setInterval(async () => {
  const ok = await checkHealth();
  chrome.action.setBadgeText({ text: ok ? "" : "!" });
  chrome.action.setBadgeBackgroundColor({ color: ok ? "#3fb950" : "#f85149" });
}, 10000);
