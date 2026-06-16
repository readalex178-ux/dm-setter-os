// panel.js — DM Setter OS companion panel.
// RESPONSIBILITY: connection layer only. Extract conversation → send to DM Setter OS →
// display results. NO local AI, scoring, or business logic.

let panelEl = null;
let isOpen = false;
let scanTimer = null;
let lastConv = null;
let lastMsgKey = "";
let lastAnalysis = null;
let signedIn = false;

// ── Build panel HTML ────────────────────────────────────────────────────────

function buildPanel() {
  const div = document.createElement("div");
  div.id = "dms-root";
  div.innerHTML = `
    <div class="dms-panel">

      <div class="dms-head">
        <span class="dms-logo">⚡ DM Setter OS</span>
        <span class="dms-platform-tag" id="dms-platform">—</span>
        <div class="dms-head-btns">
          <button class="dms-btn-sm" id="dms-refresh" title="Re-scan conversation">↻</button>
          <button class="dms-btn-sm" id="dms-close" title="Close">✕</button>
        </div>
      </div>

      <div class="dms-conn" id="dms-conn">
        <span class="dms-dot" id="dms-dot"></span>
        <span id="dms-conn-text">Checking connection…</span>
      </div>

      <div class="dms-prospect" id="dms-prospect">
        <div class="dms-prospect-name" id="dms-name">—</div>
        <div class="dms-prospect-sub" id="dms-sub">Open a DM conversation to get started</div>
      </div>

      <div class="dms-body">

        <div id="dms-status" class="dms-status"></div>

        <button class="dms-analyse-btn" id="dms-analyse-btn">⚡ Analyse Conversation</button>

        <div class="dms-section" id="dms-metrics-section" style="display:none">
          <div class="dms-metrics" id="dms-metrics"></div>
          <div class="dms-meta" id="dms-meta"></div>
        </div>

        <div class="dms-section" id="dms-objections-section" style="display:none">
          <div class="dms-section-head">Objections Detected</div>
          <div id="dms-objections"></div>
        </div>

        <div class="dms-section" id="dms-action-section" style="display:none">
          <div class="dms-section-head">Recommended Next Action</div>
          <div id="dms-action" class="dms-action"></div>
        </div>

        <div class="dms-section" id="dms-replies-section" style="display:none">
          <div class="dms-section-head">
            AI Reply Suggestions
            <button class="dms-btn-sm" id="dms-regen" title="Regenerate">↻ Regenerate</button>
          </div>
          <div id="dms-replies"></div>
        </div>

        <button class="dms-save-btn" id="dms-save-btn" style="display:none">💾 Save to CRM</button>
        <div id="dms-save-msg" class="dms-save-msg"></div>

        <div class="dms-section">
          <div class="dms-section-head">
            Captured Messages
            <span id="dms-msg-count">0 messages</span>
          </div>
          <div id="dms-conv" class="dms-conv">
            <div class="dms-hint">Open a DM and scroll through it, then click Analyse.</div>
          </div>
        </div>

        <div class="dms-section">
          <div class="dms-section-head">
            📋 Paste Conversation Manually
            <button id="dms-paste-toggle" class="dms-btn-sm">Show</button>
          </div>
          <div id="dms-paste-area" style="display:none">
            <p class="dms-hint" style="text-align:left">Format: <b>Name: message</b> per line, or alternate lines.</p>
            <input id="dms-paste-name" type="text" placeholder="Prospect name" class="dms-input" />
            <textarea id="dms-paste-text" rows="5" placeholder="Sarah: Hey I saw your post&#10;You: Hey Sarah! Thanks for reaching out..." class="dms-input"></textarea>
            <button id="dms-paste-load" class="dms-analyse-btn" style="margin-top:6px">Load Pasted Conversation</button>
          </div>
        </div>

      </div>
    </div>
  `;
  return div;
}

// ── Status / connection helpers ─────────────────────────────────────────────

function showStatus(msg, type) {
  const el = document.getElementById("dms-status");
  if (!el) return;
  if (!msg) { el.className = "dms-status"; el.textContent = ""; return; }
  el.className = "dms-status " + (type || "info");
  el.textContent = msg;
}

function setConnection(state, text) {
  const dot = document.getElementById("dms-dot");
  const t = document.getElementById("dms-conn-text");
  if (!dot || !t) return;
  dot.className = "dms-dot " + state; // ok | warn | err
  t.textContent = text;
}

function sendBg(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (res) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(res);
    });
  });
}

async function refreshConnection() {
  try {
    const res = await sendBg({ type: "VERIFY_SESSION" });
    signedIn = !!res?.signedIn;
    if (signedIn) {
      const who = res?.profile?.display_name || res?.user?.email || "your account";
      setConnection("ok", `Connected · ${who}`);
    } else {
      setConnection("err", "Not signed in — open the extension popup to log in");
    }
  } catch {
    signedIn = false;
    setConnection("err", "Can't reach DM Setter OS");
  }
}

function setAnalyseBtnLoading(loading) {
  const btn = document.getElementById("dms-analyse-btn");
  if (!btn) return;
  btn.textContent = loading ? "⏳ Analysing…" : "⚡ Analyse Conversation";
  btn.disabled = loading;
}

// ── Render: conversation preview ────────────────────────────────────────────

function renderConvPreview(conv) {
  const platform = (typeof getCurrentPlatform === "function" && getCurrentPlatform()) || null;
  document.getElementById("dms-platform").textContent = platform ? platform.emoji + " " + platform.name : "—";
  document.getElementById("dms-name").textContent = conv.name || "Unknown Prospect";
  document.getElementById("dms-sub").textContent = conv.lines.length + " messages captured";
  document.getElementById("dms-msg-count").textContent = conv.lines.length + " messages";

  const el = document.getElementById("dms-conv");
  if (!conv.lines.length) {
    const debugText = conv.debug ? `<div class="dms-hint" style="text-align:left;font-family:monospace;font-size:10px;white-space:pre-wrap">${conv.debug}</div>` : "";
    el.innerHTML = '<div class="dms-hint">No messages found — scroll through the conversation then re-scan.</div>' + debugText;
    return;
  }
  el.innerHTML = conv.lines.slice(-6).map(line => {
    const isYou = line.startsWith("You:");
    return `<div class="dms-msg ${isYou ? "you" : "them"}">${escapeHtml(line)}</div>`;
  }).join("");
}

// ── Render: analysis ────────────────────────────────────────────────────────

function tempColor(t) {
  return t === "hot" ? "#f85149" : t === "warm" ? "#d29922" : "#58a6ff";
}
function scoreColor(n) {
  return n >= 70 ? "#3fb950" : n >= 40 ? "#d29922" : "#8b949e";
}

function renderAnalysis(a) {
  lastAnalysis = a;

  // Metrics
  document.getElementById("dms-metrics-section").style.display = "block";
  const metrics = [
    ["Conv. Score", a.conversation_score + "", scoreColor(a.conversation_score), "/100"],
    ["Booking", a.booking_probability + "", scoreColor(a.booking_probability), "%"],
  ];
  document.getElementById("dms-metrics").innerHTML = metrics.map(([label, v, c, suffix]) => `
    <div class="dms-metric">
      <div class="dms-metric-val" style="color:${c}">${v}<span class="dms-metric-suffix">${suffix}</span></div>
      <div class="dms-metric-lbl">${label}</div>
    </div>
  `).join("");

  const tc = tempColor(a.temperature);
  document.getElementById("dms-meta").innerHTML = `
    <span class="dms-badge" style="color:${tc};background:${tc}18;border:1px solid ${tc}44">${(a.temperature || "").toUpperCase()}</span>
    <span class="dms-badge" style="color:#58a6ff;background:#58a6ff18;border:1px solid #58a6ff44">${escapeHtml(a.stage || "—")}</span>
    ${a.summary ? `<div class="dms-summary">${escapeHtml(a.summary)}</div>` : ""}
  `;

  // Objections
  const objSec = document.getElementById("dms-objections-section");
  if (a.objections?.length) {
    objSec.style.display = "block";
    document.getElementById("dms-objections").innerHTML = a.objections
      .map(o => `<div class="dms-objection">⚠️ ${escapeHtml(o)}</div>`).join("");
  } else {
    objSec.style.display = "none";
  }

  // Next action
  if (a.next_action) {
    document.getElementById("dms-action-section").style.display = "block";
    document.getElementById("dms-action").textContent = a.next_action;
  } else {
    document.getElementById("dms-action-section").style.display = "none";
  }

  // Replies
  renderReplies(a.replies);

  // Save
  document.getElementById("dms-save-btn").style.display = "block";
}

function renderReplies(replies) {
  const sec = document.getElementById("dms-replies-section");
  const el = document.getElementById("dms-replies");
  if (!replies?.length) { sec.style.display = "none"; return; }
  sec.style.display = "block";
  el.innerHTML = replies.map(r => `
    <div class="dms-reply">
      <div class="dms-reply-top">
        <span class="dms-tag">${escapeHtml(r.label || "Reply")}</span>
        <button class="dms-copy" data-text="${encodeURIComponent(r.content || "")}">Copy</button>
      </div>
      <div class="dms-reply-text">${escapeHtml(r.content || "")}</div>
      ${r.note ? `<div class="dms-reply-note">💡 ${escapeHtml(r.note)}</div>` : ""}
    </div>
  `).join("");

  el.querySelectorAll(".dms-copy").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      navigator.clipboard.writeText(decodeURIComponent(btn.dataset.text));
      const orig = btn.textContent;
      btn.textContent = "✓ Copied";
      btn.classList.add("done");
      setTimeout(() => { btn.textContent = orig; btn.classList.remove("done"); }, 2000);
    };
  });
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ── Analyse (delegates to DM Setter OS) ─────────────────────────────────────

async function analyse() {
  // Use the latest scrape unless a manual paste is loaded.
  if (!lastConv?._manual) {
    const conv = scrape();
    lastConv = conv;
  }
  renderConvPreview(lastConv);

  if (!lastConv.lines.length) {
    showStatus("No messages found — open a DM conversation and scroll through it first.", "error");
    return;
  }
  if (!signedIn) {
    showStatus("Sign in via the extension popup to analyse conversations.", "error");
    return;
  }

  showStatus("");
  setAnalyseBtnLoading(true);
  document.getElementById("dms-save-msg").textContent = "";

  const payload = {
    platform: lastConv.platformName || lastConv.platformId || "unknown",
    name: lastConv.name || "Unknown",
    handle: lastConv.handle || "",
    messages: lastConv.msgs,
  };

  try {
    const res = await sendBg({ type: "ANALYZE_CONVERSATION", payload });
    if (!res?.ok) throw new Error(res?.error || "Analysis failed");
    renderAnalysis(res.analysis);
    showStatus("");
  } catch (e) {
    console.error("[DM Setter OS] Analyse failed:", e);
    showStatus(e.message, "error");
  } finally {
    setAnalyseBtnLoading(false);
  }
}

// ── Save to CRM ─────────────────────────────────────────────────────────────

async function saveToApp() {
  if (!lastConv?.msgs?.length) return;
  const btn = document.getElementById("dms-save-btn");
  const msgEl = document.getElementById("dms-save-msg");
  btn.disabled = true;
  btn.textContent = "Saving…";
  msgEl.textContent = "";

  if (!lastConv.name) {
    const entered = prompt("What's this prospect's name?", "");
    if (entered?.trim()) lastConv.name = entered.trim();
  }

  const payload = {
    prospect: {
      name: lastConv.name || "Unknown",
      handle: lastConv.handle || "",
      source: lastConv.platformName + " (Extension)",
      platform: lastConv.platformId,
    },
    messages: lastConv.msgs,
    analysis: lastAnalysis,
  };

  try {
    const result = await sendBg({ type: "SAVE_CONVERSATION", payload });
    if (!result?.ok) throw new Error(result?.error || "Unknown error");
    btn.textContent = "✓ Saved to CRM";
    btn.classList.add("done");
    msgEl.textContent = "Synced to DM Setter OS — check your CRM.";
    msgEl.style.color = "#3fb950";
  } catch (e) {
    btn.textContent = "💾 Save to CRM";
    btn.disabled = false;
    btn.classList.remove("done");
    msgEl.textContent = "Save failed: " + e.message;
    msgEl.style.color = "#f85149";
  }
}

// ── Auto-scan (keeps the captured preview fresh) ────────────────────────────

function startScan() {
  if (scanTimer) return;
  scanTimer = setInterval(() => {
    if (!isOpen || lastConv?._manual) return;
    const conv = scrape();
    const key = conv.lines.slice(-3).join("|");
    if (key !== lastMsgKey && conv.lines.length > 0) {
      lastMsgKey = key;
      lastConv = conv;
      renderConvPreview(conv);
    }
  }, 2500);
}

function stopScan() {
  if (scanTimer) { clearInterval(scanTimer); scanTimer = null; }
}

// ── Manual paste loader ─────────────────────────────────────────────────────

function loadPasted() {
  const name = document.getElementById("dms-paste-name").value.trim();
  const text = document.getElementById("dms-paste-text").value.trim();
  if (!text) return;

  const platform = (typeof getCurrentPlatform === "function" && getCurrentPlatform()) || null;
  const lines = text.split("\n").filter(l => l.trim());
  const msgs = [];
  const seen = new Set();

  lines.forEach((line, i) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 30) {
      const speaker = line.slice(0, colonIdx).trim().toLowerCase();
      const content = line.slice(colonIdx + 1).trim();
      if (!content || seen.has(content)) return;
      const isYou = ["you", "me", "setter", "i"].includes(speaker);
      seen.add(content);
      msgs.push({ sender: isYou ? "setter" : "prospect", content });
    } else {
      const content = line.trim();
      if (!content || seen.has(content)) return;
      seen.add(content);
      msgs.push({ sender: i % 2 === 0 ? "prospect" : "setter", content });
    }
  });

  if (!msgs.length) { showStatus("Could not parse messages. Use: Name: message per line.", "error"); return; }

  const convLines = msgs.map(m => (m.sender === "setter" ? "You" : (name || "Prospect")) + ": " + m.content);
  lastConv = {
    platformId: platform?.id || "unknown",
    platformName: platform?.name || "Manual",
    name: name || null,
    handle: "",
    msgs,
    lines: convLines,
    _manual: true,
  };
  renderConvPreview(lastConv);
  showStatus("Loaded " + msgs.length + " messages — click Analyse.", "info");
  document.getElementById("dms-paste-area").style.display = "none";
  document.getElementById("dms-paste-toggle").textContent = "Show";
}

// ── Panel open/close ─────────────────────────────────────────────────────────

function openPanel() {
  if (!panelEl) {
    panelEl = buildPanel();
    document.body.appendChild(panelEl);
    document.getElementById("dms-close").onclick = closePanel;
    document.getElementById("dms-refresh").onclick = () => {
      lastConv = scrape();
      renderConvPreview(lastConv);
      refreshConnection();
    };
    document.getElementById("dms-analyse-btn").onclick = analyse;
    document.getElementById("dms-regen").onclick = analyse;
    document.getElementById("dms-save-btn").onclick = saveToApp;
    document.getElementById("dms-paste-toggle").onclick = () => {
      const area = document.getElementById("dms-paste-area");
      const tbtn = document.getElementById("dms-paste-toggle");
      const hidden = area.style.display === "none";
      area.style.display = hidden ? "block" : "none";
      tbtn.textContent = hidden ? "Hide" : "Show";
    };
    document.getElementById("dms-paste-load").onclick = loadPasted;
  }

  isOpen = true;
  panelEl.classList.add("open");
  chrome.storage.local.set({ overlay_enabled: true });

  refreshConnection();
  lastConv = scrape();
  renderConvPreview(lastConv);
  startScan();
}

function closePanel() {
  isOpen = false;
  if (panelEl) panelEl.classList.remove("open");
  chrome.storage.local.set({ overlay_enabled: false });
  stopScan();
}

function togglePanel(show) {
  if (show) openPanel();
  else closePanel();
}

// React to session changes (sign in/out from popup) live.
chrome.storage.onChanged.addListener((changes) => {
  if (changes.session && isOpen) refreshConnection();
  if (changes.overlay_enabled) {
    const enabled = changes.overlay_enabled.newValue;
    if (enabled && !isOpen) openPanel();
    else if (!enabled && isOpen) closePanel();
  }
});

// Toggle from popup / action click.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "TOGGLE_PANEL") togglePanel(msg.show);
});

// Restore last state.
chrome.storage.local.get("overlay_enabled").then((s) => {
  if (s.overlay_enabled) openPanel();
});
