// auth-bridge.js
// Runs on dm-wingman-pro.vercel.app
// Reads the Supabase session from localStorage and syncs it to the extension background.

const STORAGE_KEY = "sb-mtvtzwxymlfgiffuvlzp-auth-token";

function sendSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    // Supabase JS v2 stores the session directly; v1 wraps it in { currentSession: {...} }
    const parsed = raw ? JSON.parse(raw) : null;
    const session = parsed?.currentSession || parsed || null;
    chrome.runtime.sendMessage({ type: "SYNC_SESSION", session });
  } catch (e) {
    // Extension context may be invalidated on updates; ignore silently.
  }
}

// Send immediately on page load
sendSession();

// Listen for sign-in / sign-out events
window.addEventListener("storage", (e) => {
  if (e.key === STORAGE_KEY) {
    sendSession();
  }
});

// Also poll every 2 s to catch in-page auth state changes that don't fire storage events
setInterval(sendSession, 5000);
