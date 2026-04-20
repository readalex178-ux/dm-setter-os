// panel.js — the side panel UI and main logic

let panelEl = null;
let isOpen = false;
let scanTimer = null;
let lastConv = null;
let lastMsgKey = "";

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
          <button class="dms-btn-sm" id="dms-refresh" title="Re-scan">↻</button>
          <button class="dms-btn-sm" id="dms-close" title="Close">✕</button>
        </div>
      </div>

      <div class="dms-prospect" id="dms-prospect">
        <div class="dms-prospect-name" id="dms-name">—</div>
        <div class="dms-prospect-sub" id="dms-sub">Open a DM conversation to get started</div>
      </div>

      <div class="dms-body">

        <div id="dms-status" class="dms-status"></div>

        <button class="dms-analyse-btn" id="dms-analyse-btn">⚡ Analyse Conversation</button>

        <div class="dms-section" id="dms-replies-section">
          <div class="dms-section-head">Reply Suggestions</div>
          <div id="dms-replies"><div class="dms-hint">Click Analyse to get AI-powered reply suggestions.</div></div>
        </div>

        <div class="dms-section" id="dms-bant-section" style="display:none">
          <div class="dms-section-head">BANT Score</div>
          <div id="dms-bant-grid" class="dms-bant-grid"></div>
          <div id="dms-bant-verdict" class="dms-bant-verdict"></div>
        </div>

        <div class="dms-section" id="dms-intel-section" style="display:none">
          <div class="dms-section-head">Prospect Intel</div>
          <div id="dms-intel"></div>
        </div>

        <button class="dms-save-btn" id="dms-save-btn" style="display:none">💾 Save Conversation to App</button>
        <div id="dms-save-msg" class="dms-save-msg"></div>

        <div class="dms-section">
          <div class="dms-section-head">
            Captured Messages
            <span id="dms-msg-count">0 messages</span>
          </div>
          <div id="dms-conv" class="dms-conv">
            <div class="dms-hint">Open a DM and scroll through it first, then click Analyse.</div>
          </div>
        </div>

        <div class="dms-section">
          <div class="dms-section-head">
            📋 Paste Conversation Manually
            <button id="dms-paste-toggle" style="font-size:10px;background:none;border:1px solid #30363d;color:#8b949e;padding:2px 6px;border-radius:4px;cursor:pointer">Show</button>
          </div>
          <div id="dms-paste-area" style="display:none">
            <p style="font-size:10px;color:#8b949e;margin-bottom:6px">Copy messages from Instagram/TikTok and paste below. Format: <b>Name: message</b> per line, or just alternate lines.</p>
            <input id="dms-paste-name" type="text" placeholder="Prospect name" style="width:100%;background:#161b22;border:1px solid #30363d;border-radius:5px;color:#e6edf3;padding:6px 8px;font-size:11px;margin-bottom:6px;box-sizing:border-box" />
            <textarea id="dms-paste-text" rows="5" placeholder="Sarah: Hey I saw your post&#10;You: Hey Sarah! Thanks for reaching out..." style="width:100%;background:#161b22;border:1px solid #30363d;border-radius:5px;color:#e6edf3;padding:6px 8px;font-size:11px;resize:vertical;box-sizing:border-box;font-family:inherit"></textarea>
            <button id="dms-paste-analyse" style="margin-top:6px;width:100%;padding:8px;background:#1f6feb;border:none;border-radius:6px;color:white;font-size:12px;font-weight:600;cursor:pointer">⚡ Analyse Pasted Conversation</button>
          </div>
        </div>

      </div>
    </div>
  `;
  return div;
}

// ── Status helpers ──────────────────────────────────────────────────────────

function showStatus(msg, type) {
  const el = document.getElementById("dms-status");
  if (!msg) { el.className = "dms-status"; el.textContent = ""; return; }
  el.className = "dms-status " + (type || "info");
  el.textContent = msg;
}

function setAnalyseBtnLoading(loading) {
  const btn = document.getElementById("dms-analyse-btn");
  btn.textContent = loading ? "⏳ Analysing…" : "⚡ Analyse Conversation";
  btn.disabled = loading;
}

// ── Render functions ────────────────────────────────────────────────────────

function renderConvPreview(conv) {
  const platform = getCurrentPlatform();
  document.getElementById("dms-platform").textContent = platform ? platform.emoji + " " + platform.name : "—";
  document.getElementById("dms-name").textContent = conv.name || "Unknown Prospect";
  document.getElementById("dms-sub").textContent = conv.lines.length + " messages captured";
  document.getElementById("dms-msg-count").textContent = conv.lines.length + " messages";

  const el = document.getElementById("dms-conv");
  if (!conv.lines.length) {
    const debugText = conv.debug ? `<div class="dms-hint" style="text-align:left;font-family:monospace;font-size:10px;color:#484f58;white-space:pre-wrap">${conv.debug}</div>` : "";
    el.innerHTML = '<div class="dms-hint">No messages found — scroll through the conversation then click Analyse again.</div>' + debugText;
    return;
  }
  el.innerHTML = conv.lines.slice(-6).map(line => {
    const isYou = line.startsWith("You:");
    return `<div class="dms-msg ${isYou ? "you" : "them"}">${line}</div>`;
  }).join("");
}

function renderReplies(replies) {
  const el = document.getElementById("dms-replies");
  if (!replies?.length) {
    el.innerHTML = '<div class="dms-hint">No suggestions returned. Try again.</div>';
    return;
  }
  el.innerHTML = replies.map(r => `
    <div class="dms-reply">
      <div class="dms-reply-top">
        <span class="dms-tag">${r.type || "Reply"}</span>
        <button class="dms-copy" data-text="${encodeURIComponent(r.content || "")}">Copy</button>
      </div>
      <div class="dms-reply-text">${r.content || ""}</div>
      <div class="dms-reply-note">💡 ${r.note || r.coaching_note || ""}</div>
    </div>
  `).join("");

  el.querySelectorAll(".dms-copy").forEach(btn => {
    btn.onclick = e => {
      e.stopPropagation();
      navigator.clipboard.writeText(decodeURIComponent(btn.dataset.text));
      const orig = btn.textContent;
      btn.textContent = "✓ Copied";
      btn.style.background = "#3fb950";
      btn.style.color = "white";
      setTimeout(() => { btn.textContent = orig; btn.style.background = ""; btn.style.color = ""; }, 2000);
    };
  });

  el.querySelectorAll(".dms-reply").forEach(card => {
    card.onclick = () => card.querySelector(".dms-copy")?.click();
  });
}

function renderBANT(bant) {
  document.getElementById("dms-bant-section").style.display = "block";
  const items = [
    ["N", "Need", bant.need],
    ["T", "Timeline", bant.timeline],
    ["A", "Authority", bant.authority],
    ["B", "Budget", bant.budget],
  ];
  document.getElementById("dms-bant-grid").innerHTML = items.map(([l, label, v]) => `
    <div class="dms-bant-cell ${v === 2 ? "full" : v === 1 ? "partial" : "empty"}">
      <div class="dms-bant-val">${v}/2</div>
      <div class="dms-bant-lbl">${label}</div>
    </div>
  `).join("");

  const verdictColors = { "Hard Close": "#3fb950", "Close": "#3fb950", "Nurture": "#d29922", "Disqualify": "#f85149" };
  const c = verdictColors[bant.verdict] || "#8b949e";
  document.getElementById("dms-bant-verdict").innerHTML = `
    <span class="dms-bant-total" style="color:${c}">${bant.total}/8</span>
    <span class="dms-bant-badge" style="color:${c};background:${c}18;border:1px solid ${c}44">${bant.verdict}</span>
    ${bant.note ? `<div class="dms-bant-note">${bant.note}</div>` : ""}
  `;
}

function renderIntel(intel) {
  document.getElementById("dms-intel-section").style.display = "block";
  const readinessColor = intel.callReadiness >= 70 ? "#3fb950" : intel.callReadiness >= 40 ? "#d29922" : "#8b949e";
  const rows = [
    ["Stage", `<span class="dms-tag">${intel.stage || "—"}</span>`],
    ["Intent", `${intel.intentLevel || "—"} (${intel.intentPct || 0}%)`],
    ["Motivation", intel.motivation || "—"],
    ["Concern", `<span style="color:#d29922">${intel.concern || "—"}</span>`],
    intel.incomeGoal ? ["Income Goal", intel.incomeGoal] : null,
    ["Call Readiness", `<span style="color:${readinessColor};font-weight:600">${intel.callReadiness || 0}%</span>`],
    ["Lead Score", `<span style="color:#58a6ff;font-weight:600">${intel.leadScore || 0}/10</span>`],
  ].filter(Boolean);

  document.getElementById("dms-intel").innerHTML = rows.map(([label, val]) => `
    <div class="dms-intel-row">
      <span class="dms-intel-lbl">${label}</span>
      <span class="dms-intel-val">${val}</span>
    </div>
  `).join("");
}

// ── Analyse ─────────────────────────────────────────────────────────────────

async function analyse() {
  const conv = scrape();
  lastConv = conv;
  renderConvPreview(conv);

  if (!conv.lines.length) {
    showStatus("No messages found — make sure a DM conversation is open and scroll through it first.", "error");
    return;
  }

  showStatus("");
  setAnalyseBtnLoading(true);
  document.getElementById("dms-save-btn").style.display = "none";
  document.getElementById("dms-save-msg").textContent = "";

  let repliesOk = false;

  try {
    // Step 1: Get reply suggestions first
    let replies;
    try {
      replies = await getReplySuggestions(conv.lines, conv.name, conv.platformName);
      renderReplies(replies);
      repliesOk = true;
      showStatus("");
    } catch (e) {
      console.error("[DM Setter OS] Replies error:", e);
      showStatus("AI error: " + e.message, "error");
    }

    // Step 2: BANT score (separate request, slight delay to avoid rate limits)
    if (repliesOk) {
      await new Promise(r => setTimeout(r, 500));
      try {
        const bant = await getBANTScore(conv.lines);
        renderBANT(bant);
      } catch (e) {
        console.warn("[DM Setter OS] BANT skipped:", e.message);
      }

      // Step 3: Prospect intel
      await new Promise(r => setTimeout(r, 500));
      try {
        const intel = await getProspectIntel(conv.lines, conv.name);
        renderIntel(intel);
        if (lastConv) {
          lastConv._intel = intel;
          // If we still dont have a name, try again after the page has fully loaded
          if (!lastConv.name) {
            const platform = getCurrentPlatform();
            const retryName = getProspectName(platform?.id || "unknown");
            if (retryName) lastConv.name = retryName;
          }
        }
      } catch (e) {
        console.warn("[DM Setter OS] Intel skipped:", e.message);
      }

      document.getElementById("dms-save-btn").style.display = "block";
    }

  } catch (e) {
    console.error("[DM Setter OS] Analyse failed:", e);
    showStatus("Error: " + e.message, "error");
  }

  setAnalyseBtnLoading(false);
}

// ── Save to app ─────────────────────────────────────────────────────────────

async function saveToApp() {
  if (!lastConv?.msgs?.length) return;

  const btn = document.getElementById("dms-save-btn");
  const msgEl = document.getElementById("dms-save-msg");
  btn.disabled = true;
  btn.textContent = "Saving…";
  msgEl.textContent = "";
  msgEl.style.color = "";

  // If no name was captured, ask the user
  if (!lastConv.name) {
    const entered = prompt("What\'s this prospect\'s name?", "");
    if (entered?.trim()) lastConv.name = entered.trim();
  }

  const intel = lastConv._intel;
  const payload = {
    prospect: {
      name: lastConv.name || "Unknown",
      handle: "",
      stage: intel?.stage || "New Lead",
      leadScore: intel?.leadScore || 0,
      callReadiness: intel?.callReadiness || 0,
      intentLevel: intel?.intentLevel || "Curious",
      intentConfidence: intel?.intentPct || 0,
      motivation: intel?.motivation || "",
      concerns: intel?.concern || "",
      incomeGoal: intel?.incomeGoal || "",
      source: lastConv.platformName + " (Extension)",
      platform: lastConv.platformId,
    },
    messages: lastConv.msgs,
  };

  try {
    // Send through background worker — avoids HTTPS→HTTP CORS block
    const result = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: "SAVE_CONVERSATION", payload }, res => {
        if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
        else resolve(res);
      });
    });

    if (!result?.ok) throw new Error(result?.error || "Unknown error");

    btn.textContent = "✓ Saved to App!";
    btn.style.background = "#3fb950";
    msgEl.textContent = "Done — check Inbox → Extension tab in the app.";
    msgEl.style.color = "#3fb950";

  } catch (e) {
    btn.textContent = "💾 Save Conversation to App";
    btn.disabled = false;
    btn.style.background = "";
    msgEl.textContent = "Save failed: " + e.message;
    msgEl.style.color = "#f85149";
  }
}

// ── Auto-scan ────────────────────────────────────────────────────────────────

function startScan() {
  if (scanTimer) return;
  scanTimer = setInterval(() => {
    if (!isOpen) return;
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

// ── Panel open/close ─────────────────────────────────────────────────────────

function openPanel() {
  if (!panelEl) {
    panelEl = buildPanel();
    document.body.appendChild(panelEl);
    document.getElementById("dms-close").onclick = closePanel;
    document.getElementById("dms-refresh").onclick = () => { const c = scrape(); lastConv = c; renderConvPreview(c); };
    document.getElementById("dms-analyse-btn").onclick = analyse;
    document.getElementById("dms-save-btn").onclick = saveToApp;

    // Paste toggle
    document.getElementById("dms-paste-toggle").onclick = () => {
      const area = document.getElementById("dms-paste-area");
      const btn = document.getElementById("dms-paste-toggle");
      const hidden = area.style.display === "none";
      area.style.display = hidden ? "block" : "none";
      btn.textContent = hidden ? "Hide" : "Show";
    };

    // Parse and load pasted conversation
    document.getElementById("dms-paste-analyse").onclick = () => {
      const name = document.getElementById("dms-paste-name").value.trim();
      const text = document.getElementById("dms-paste-text").value.trim();
      if (!text) return;

      const platform = getCurrentPlatform();
      const lines = text.split("\n").filter(l => l.trim());
      const msgs = [];
      const seen = new Set();

      lines.forEach((line, i) => {
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0 && colonIdx < 30) {
          const speaker = line.slice(0, colonIdx).trim().toLowerCase();
          const msgContent = line.slice(colonIdx + 1).trim();
          if (!msgContent || seen.has(msgContent)) return;
          const isYou = ["you","me","setter","i"].includes(speaker);
          seen.add(msgContent);
          msgs.push({ sender: isYou ? "setter" : "prospect", content: msgContent });
        } else {
          const msgContent = line.trim();
          if (!msgContent || seen.has(msgContent)) return;
          seen.add(msgContent);
          msgs.push({ sender: i % 2 === 0 ? "prospect" : "setter", content: msgContent });
        }
      });

      if (!msgs.length) { showStatus("Could not parse messages. Use: Name: message per line.", "error"); return; }

      const convLines = msgs.map(m => (m.sender === "setter" ? "You" : (name || "Prospect")) + ": " + m.content);
      lastConv = { platformId: platform?.id || "unknown", platformName: platform?.name || "Unknown", name: name || null, msgs, lines: convLines, _intel: null };

      renderConvPreview(lastConv);
      showStatus("Loaded " + msgs.length + " messages — click Analyse to get AI suggestions.", "info");
      document.getElementById("dms-paste-area").style.display = "none";
      document.getElementById("dms-paste-toggle").textContent = "Show";
      document.getElementById("dms-paste-text").value = "";
    };
  }

  isOpen = true;
  panelEl.classList.add("open");
  chrome.storage.local.set({ overlay_enabled: true });

  // Initial scrape
  const conv = scrape();
  lastConv = conv;
  renderConvPreview(conv);
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

// ── Message listener ─────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener(msg => {
  if (msg.type === "TOGGLE_OVERLAY") togglePanel(msg.visible);
  if (msg.type === "ANALYSE_NOW") {
    if (!isOpen) openPanel();
    setTimeout(analyse, 800);
  }
});

// Auto-restore if was open
chrome.storage.local.get("overlay_enabled", s => {
  if (s.overlay_enabled) openPanel();
});
