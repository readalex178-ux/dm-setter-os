// DM Setter OS — Content Script (Page Overlay)

let overlayVisible = false;
let overlayEl = null;

function createOverlay() {
  if (overlayEl) return;

  overlayEl = document.createElement("div");
  overlayEl.id = "dm-setter-overlay";
  overlayEl.innerHTML = `
    <div class="dm-setter-panel">
      <div class="dm-setter-header">
        <span class="dm-setter-title">⚡ DM Setter OS</span>
        <button class="dm-setter-close" id="dm-setter-close">✕</button>
      </div>
      <div class="dm-setter-body">
        <div class="dm-setter-section">
          <div class="dm-setter-label">Prospect Intel</div>
          <div class="dm-setter-card" id="dm-setter-prospect">
            <div class="dm-setter-hint">Highlight a name or message to get instant AI insights</div>
          </div>
        </div>
        <div class="dm-setter-section">
          <div class="dm-setter-label">Suggested Replies</div>
          <div id="dm-setter-replies" class="dm-setter-replies">
            <button class="dm-setter-reply-btn">👋 "Hey! I noticed you've been…"</button>
            <button class="dm-setter-reply-btn">🎯 "Would you be open to a quick chat?"</button>
            <button class="dm-setter-reply-btn">🔥 "I have something perfect for you…"</button>
          </div>
        </div>
        <div class="dm-setter-section">
          <div class="dm-setter-label">Quick Score</div>
          <div class="dm-setter-scores">
            <div class="dm-setter-score"><span class="score-val">—</span><span class="score-lbl">Interest</span></div>
            <div class="dm-setter-score"><span class="score-val">—</span><span class="score-lbl">Call Ready</span></div>
            <div class="dm-setter-score"><span class="score-val">—</span><span class="score-lbl">Urgency</span></div>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlayEl);

  document.getElementById("dm-setter-close").addEventListener("click", () => {
    toggleOverlay(false);
    chrome.storage.local.set({ overlayEnabled: false });
  });

  // Copy reply on click
  overlayEl.querySelectorAll(".dm-setter-reply-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const text = btn.textContent.replace(/^.\\s/, "").replace(/"/g, "");
      navigator.clipboard.writeText(text);
      btn.textContent = "✅ Copied!";
      setTimeout(() => { btn.textContent = text; }, 1500);
    });
  });
}

function toggleOverlay(visible) {
  overlayVisible = visible;
  if (visible) {
    createOverlay();
    overlayEl.classList.add("dm-setter-visible");
  } else if (overlayEl) {
    overlayEl.classList.remove("dm-setter-visible");
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "TOGGLE_OVERLAY") {
    toggleOverlay(msg.visible);
  }
});

// Init
(async () => {
  const { overlayEnabled } = await chrome.storage.local.get("overlayEnabled");
  if (overlayEnabled) toggleOverlay(true);
})();
