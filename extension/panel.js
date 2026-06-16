// panel.js — DM Setter OS companion panel.
// RESPONSIBILITY: interface layer ONLY. Extract conversation -> send to DM Setter OS ->
// render results. NO local AI, scoring, CRM, or business logic. If DM Setter OS is
// unreachable or the user is signed out, the panel shows a safe error state.

let panelEl = null;
let isOpen = false;
let lastConv = null;
let lastAnalysis = null;
let lastContext = null;
let signedIn = false;
let connOk = false;
let threadKey = "";
let threadObserver = null;
let observerTimer = null;

const STAGES = [
  "New Lead", "Rapport", "Discovery", "Qualifying",
  "Objection Handling", "Call Booking", "Booked", "Lost",
];

// ── Build panel HTML (4 panels) ─────────────────────────────────────────────

function buildPanel() {
  const div = document.createElement("div");
  div.id = "dms-root";
  div.innerHTML = `
    <div class="dms-panel">

      <div class="dms-head">
        <span class="dms-logo">⚡ DM Setter OS</span>
        <span class="dms-platform-tag" id="dms-platform">—</span>
        <div class="dms-head-btns">
          <button class="dms-btn-sm" id="dms-refresh" title="Re-scan & refresh">↻</button>
          <button class="dms-btn-sm" id="dms-close" title="Close">✕</button>
        </div>
      </div>

      <div class="dms-conn" id="dms-conn">
        <span class="dms-dot" id="dms-dot"></span>
        <span id="dms-conn-text">Checking connection…</span>
      </div>

      <!-- Panel 1: Prospect Overview -->
      <div class="dms-prospect">
        <div class="dms-prospect-name" id="dms-name">—</div>
        <div class="dms-prospect-sub" id="dms-sub">Open a DM conversation to get started</div>
        <div class="dms-overview" id="dms-overview" style="display:none">
          <div class="dms-ov-item"><div class="dms-ov-lbl">Stage</div><div class="dms-ov-val" id="dms-ov-stage">—</div></div>
          <div class="dms-ov-item"><div class="dms-ov-lbl">Conv. Score</div><div class="dms-ov-val" id="dms-ov-score">—</div></div>
        </div>
      </div>

      <div class="dms-body">

        <div id="dms-status" class="dms-status"></div>

        <div class="dms-stack">
          <button class="dms-btn-primary" id="dms-analyse-btn">⚡ Analyse Conversation</button>
        </div>

        <!-- Metrics -->
        <div class="dms-section" id="dms-metrics-section" style="display:none">
          <div class="dms-metrics" id="dms-metrics"></div>
          <div class="dms-meta" id="dms-meta"></div>
        </div>

        <!-- Panel 2: AI Insights -->
        <div class="dms-section" id="dms-insights-section" style="display:none">
          <div class="dms-section-head">AI Insights</div>
          <div id="dms-objections"></div>
          <div id="dms-action" class="dms-action" style="display:none"></div>
          <div id="dms-approach" class="dms-approach" style="display:none"></div>
        </div>

        <!-- Panel 3: Replies -->
        <div class="dms-section" id="dms-replies-section" style="display:none">
          <div class="dms-section-head">
            AI Reply Suggestions
            <button class="dms-btn-sm" id="dms-regen" title="Regenerate">↻ Regenerate</button>
          </div>
          <div id="dms-replies"></div>
        </div>

        <!-- Panel 4: CRM Actions -->
        <div class="dms-section" id="dms-crm-section">
          <div class="dms-section-head">CRM Actions</div>
          <div class="dms-crm-row">
            <button class="dms-btn-primary" id="dms-save-btn">💾 Save to CRM</button>
          </div>
          <select class="dms-select" id="dms-stage-select">
            ${STAGES.map((s) => `<option value="${s}">${s}</option>`).join("")}
          </select>
          <div id="dms-save-msg" class="dms-save-msg"></div>
        </div>

        <!-- Captured messages -->
        <div class="dms-section">
          <div class="dms-section-head">
            Captured Messages
            <span id="dms-msg-count">0 messages</span>
          </div>
          <div id="dms-conv" class="dms-conv">
            <div class="dms-hint">Open a DM and scroll through it, then click Analyse.</div>
          </div>
        </div>

        <!-- Manual paste fallback -->
        <div class="dms-section">
          <div class="dms-section-head">
            📋 Paste Conversation
            <button id="dms-paste-toggle" class="dms-btn-sm">Show</button>
          </div>
          <div id="dms-paste-area" style="display:none">
            <p class="dms-hint" style="text-align:left">Format: <b>Name: message</b> per line, or alternate lines.</p>
            <input id="dms-paste-name" type="text" placeholder="Prospect name" class="dms-input" />
            <textarea id="dms-paste-text" rows="5" placeholder="Sarah: Hey I saw your post&#10;You: Hey Sarah! Thanks for reaching out..." class="dms-input"></textarea>
            <button id="dms-paste-load" class="dms-btn-ghost" style="width:100%">Load Pasted Conversation</button>
          </div>
        </div>

      </div>
    </div>
  `;
  return div;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function showStatus(msg, type) {
  const el = $("dms-status");
  if (!el) return;
  el.className = "dms-status" + (msg ? " " + (type || "info") : "");
  el.textContent = msg || "";
}

function setConnection(state, text) {
  const dot = $("dms-dot");
  const t = $("dms-conn-text");
  if (!dot || !t) return;
  dot.className = "dms-dot " + state;
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

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function tempColor(t) {
  return t === "hot" ? "var(--dms-destructive)" : t === "warm" ? "var(--dms-warning)" : "var(--dms-info)";
}
function scoreColor(n) {
  return n >= 70 ? "var(--dms-success)" : n >= 40 ? "var(--dms-warning)" : "var(--dms-fg-muted)";
}

// Disable AI/CRM actions when DM Setter OS is unreachable (safe error state).
function setActionsEnabled(enabled) {
  ["dms-analyse-btn", "dms-regen", "dms-save-btn", "dms-stage-select"].forEach((id) => {
    const el = $(id);
    if (el) el.disabled = !enabled;
  });
}

// ── Connection / context hydration ──────────────────────────────────────────

async function refreshConnection() {
  try {
    const res = await sendBg({ type: "VERIFY_SESSION" });
    signedIn = !!res?.signedIn;
    connOk = true;
    if (signedIn) {
      const who = res?.profile?.display_name || res?.user?.email || "your account";
      setConnection("ok", `Connected · ${who}`);
      setActionsEnabled(true);
    } else {
      setConnection("warn", "Not signed in — open the extension popup to log in");
      setActionsEnabled(false);
    }
  } catch {
    signedIn = false;
    connOk = false;
    setConnection("err", "DM Setter OS unreachable — retry");
    setActionsEnabled(false);
  }
}

// Pull stored intelligence for this prospect the moment a thread opens.
async function hydrateContext(conv) {
  if (!signedIn || !connOk) return;
  if (!conv?.name && !conv?.handle) return;
  try {
    const res = await sendBg({
      type: "GET_CONTEXT",
      payload: { platform: conv.platformName, name: conv.name || "", handle: conv.handle || "" },
    });
    if (!res?.ok) return;
    lastContext = res.context;
    renderContext(res.context);
  } catch (e) {
    console.warn("[DM Setter OS] context hydrate failed:", e);
  }
}

function renderContext(ctx) {
  if (!ctx) return;
  const ov = $("dms-overview");
  if (ctx.found && ctx.prospect) {
    ov.style.display = "grid";
    $("dms-ov-stage").textContent = ctx.prospect.stage || "New Lead";
    $("dms-ov-score").textContent = ctx.prospect.conversation_score != null ? ctx.prospect.conversation_score + "/100" : "—";
    if (ctx.prospect.stage) $("dms-stage-select").value = ctx.prospect.stage;
  }

  // Show prior history + recommended approach in the insights panel.
  const sec = $("dms-insights-section");
  if (ctx.history_summary || ctx.recommended_approach) {
    sec.style.display = "block";
    if (ctx.recommended_approach) {
      const ap = $("dms-approach");
      ap.style.display = "block";
      ap.innerHTML = `<b>Recommended approach:</b> ${escapeHtml(ctx.recommended_approach)}`;
    }
  }
}

// ── Render: conversation preview ────────────────────────────────────────────

function renderConvPreview(conv) {
  const platform = (typeof getCurrentPlatform === "function" && getCurrentPlatform()) || null;
  $("dms-platform").textContent = platform ? platform.emoji + " " + platform.name : "—";
  $("dms-name").textContent = conv.name || "Unknown Prospect";
  $("dms-sub").textContent = conv.lines.length + " messages captured";
  $("dms-msg-count").textContent = conv.lines.length + " messages";

  const el = $("dms-conv");
  if (!conv.lines.length) {
    const debugText = conv.debug ? `<div class="dms-hint" style="text-align:left;font-family:monospace;font-size:10px;white-space:pre-wrap">${conv.debug}</div>` : "";
    el.innerHTML = '<div class="dms-hint">No messages found — scroll through the conversation then re-scan.</div>' + debugText;
    return;
  }
  el.innerHTML = conv.lines.slice(-6).map((line) => {
    const isYou = line.startsWith("You:");
    return `<div class="dms-msg ${isYou ? "you" : "them"}">${escapeHtml(line)}</div>`;
  }).join("");
}

// ── Render: analysis ────────────────────────────────────────────────────────

function renderAnalysis(a) {
  lastAnalysis = a;

  // Metrics
  $("dms-metrics-section").style.display = "block";
  const metrics = [
    ["Conv. Score", a.conversation_score, scoreColor(a.conversation_score), "/100"],
    ["Booking", a.booking_probability, scoreColor(a.booking_probability), "%"],
  ];
  $("dms-metrics").innerHTML = metrics.map(([label, v, c, suffix]) => `
    <div class="dms-metric">
      <div class="dms-metric-val" style="color:${c}">${v}<span class="dms-metric-suffix">${suffix}</span></div>
      <div class="dms-metric-lbl">${label}</div>
    </div>
  `).join("");

  const tc = tempColor(a.temperature);
  $("dms-meta").innerHTML = `
    <span class="dms-badge" style="color:${tc};background:hsl(0 0% 50% / .12)">${(a.temperature || "").toUpperCase()}</span>
    <span class="dms-badge" style="color:var(--dms-info);background:hsl(210 100% 60% / .12)">${escapeHtml(a.stage || "—")}</span>
    ${a.summary ? `<div class="dms-summary">${escapeHtml(a.summary)}</div>` : ""}
  `;

  // Panel 2 — Insights (objections + next action; keep recommended approach from context)
  $("dms-insights-section").style.display = "block";
  $("dms-objections").innerHTML = (a.objections && a.objections.length)
    ? a.objections.map((o) => `<div class="dms-objection">⚠️ ${escapeHtml(o)}</div>`).join("")
    : "";

  const actionEl = $("dms-action");
  if (a.next_action) {
    actionEl.style.display = "block";
    actionEl.innerHTML = `<b>Next action:</b> ${escapeHtml(a.next_action)}`;
  } else {
    actionEl.style.display = "none";
  }

  if (a.stage) $("dms-stage-select").value = a.stage;

  renderReplies(a.replies);
}

function renderReplies(replies) {
  const sec = $("dms-replies-section");
  const el = $("dms-replies");
  if (!replies || !replies.length) { sec.style.display = "none"; return; }
  sec.style.display = "block";
  el.innerHTML = replies.map((r, i) => `
    <div class="dms-reply">
      <div class="dms-reply-top">
        <span class="dms-tag">${escapeHtml(r.label || "Reply")}</span>
        <div class="dms-reply-btns">
          <button class="dms-btn-sm dms-insert" data-i="${i}">Insert</button>
          <button class="dms-btn-sm dms-copy" data-i="${i}">Copy</button>
        </div>
      </div>
      <div class="dms-reply-text">${escapeHtml(r.content || "")}</div>
      ${r.note ? `<div class="dms-reply-note">💡 ${escapeHtml(r.note)}</div>` : ""}
    </div>
  `).join("");

  el.querySelectorAll(".dms-copy").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const text = replies[+btn.dataset.i]?.content || "";
      navigator.clipboard.writeText(text);
      flash(btn, "✓ Copied");
    };
  });
  el.querySelectorAll(".dms-insert").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const text = replies[+btn.dataset.i]?.content || "";
      const ok = insertIntoComposer(text);
      if (ok) flash(btn, "✓ Inserted");
      else { navigator.clipboard.writeText(text); flash(btn, "Copied"); }
    };
  });
}

function flash(btn, label) {
  const orig = btn.textContent;
  btn.textContent = label;
  btn.classList.add("done");
  setTimeout(() => { btn.textContent = orig; btn.classList.remove("done"); }, 1800);
}

// Best-effort: drop the reply into the platform's message composer.
function insertIntoComposer(text) {
  const selectors = [
    'div[role="textbox"][contenteditable="true"]',
    'textarea[placeholder*="Message" i]',
    'div[contenteditable="true"][aria-label*="Message" i]',
    '.msg-form__contenteditable[contenteditable="true"]',
    'textarea',
  ];
  let box = null;
  for (const sel of selectors) {
    const els = Array.from(document.querySelectorAll(sel)).filter((e) => e.offsetParent !== null);
    if (els.length) { box = els[els.length - 1]; break; }
  }
  if (!box) return false;
  try {
    box.focus();
    if (box.tagName === "TEXTAREA") {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      setter.call(box, text);
      box.dispatchEvent(new Event("input", { bubbles: true }));
    } else {
      // contenteditable
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, text);
      box.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return true;
  } catch {
    return false;
  }
}

// ── Analyse (delegates to DM Setter OS) ─────────────────────────────────────

async function analyse() {
  if (!lastConv?._manual) lastConv = scrape();
  renderConvPreview(lastConv);

  if (!lastConv.lines.length) {
    showStatus("No messages found — open a DM conversation and scroll through it first.", "error");
    return;
  }
  if (!connOk) { showStatus("DM Setter OS is unreachable. Check your connection and retry.", "error"); return; }
  if (!signedIn) { showStatus("Sign in via the extension popup to analyse conversations.", "error"); return; }

  showStatus("");
  const btn = $("dms-analyse-btn");
  btn.disabled = true;
  btn.textContent = "⏳ Analysing…";
  $("dms-save-msg").textContent = "";

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
    btn.disabled = false;
    btn.textContent = "⚡ Analyse Conversation";
  }
}

// ── Save to CRM ─────────────────────────────────────────────────────────────

async function saveToApp() {
  if (!lastConv?.msgs?.length) { showStatus("Nothing to save — analyse a conversation first.", "error"); return; }
  if (!connOk || !signedIn) { showStatus("Sign in to DM Setter OS to sync.", "error"); return; }

  const btn = $("dms-save-btn");
  const msgEl = $("dms-save-msg");
  btn.disabled = true;
  btn.textContent = "Saving…";
  msgEl.textContent = "";

  if (!lastConv.name) {
    const entered = prompt("What's this prospect's name?", "");
    if (entered?.trim()) lastConv.name = entered.trim();
  }

  const stageOverride = $("dms-stage-select").value;
  const analysis = lastAnalysis ? { ...lastAnalysis, stage: stageOverride } : { stage: stageOverride };

  const payload = {
    prospect: {
      name: lastConv.name || "Unknown",
      handle: lastConv.handle || "",
      source: lastConv.platformName + " (Extension)",
      platform: lastConv.platformId,
      stage: stageOverride,
    },
    messages: lastConv.msgs,
    analysis,
  };

  try {
    const result = await sendBg({ type: "SAVE_CONVERSATION", payload });
    if (!result?.ok) throw new Error(result?.error || "Unknown error");
    btn.textContent = "✓ Saved to CRM";
    btn.classList.add("done");
    msgEl.textContent = "Synced to DM Setter OS — check your CRM.";
    msgEl.style.color = "var(--dms-success)";
    setTimeout(() => { btn.textContent = "💾 Save to CRM"; btn.disabled = false; btn.classList.remove("done"); }, 2500);
  } catch (e) {
    btn.textContent = "💾 Save to CRM";
    btn.disabled = false;
    btn.classList.remove("done");
    msgEl.textContent = "Save failed: " + e.message;
    msgEl.style.color = "var(--dms-destructive)";
  }
}

// ── Event-driven thread detection (no polling loops) ────────────────────────

function currentThreadKey() {
  const conv = (typeof scrape === "function") ? scrape() : { name: "", lines: [] };
  return location.pathname + "|" + (conv.name || "") + "|" + conv.lines.length;
}

function onThreadChanged() {
  if (!isOpen) return;
  const conv = scrape();
  lastConv = conv;
  lastAnalysis = null;
  lastContext = null;
  // reset analysis-driven panels into a clean state
  $("dms-metrics-section").style.display = "none";
  $("dms-insights-section").style.display = "none";
  $("dms-replies-section").style.display = "none";
  $("dms-action").style.display = "none";
  $("dms-approach").style.display = "none";
  renderConvPreview(conv);
  hydrateContext(conv);
}

function startObserver() {
  if (threadObserver) return;
  threadKey = currentThreadKey();
  threadObserver = new MutationObserver(() => {
    if (observerTimer) clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
      const key = currentThreadKey();
      if (key !== threadKey) {
        threadKey = key;
        onThreadChanged();
      }
    }, 800);
  });
  threadObserver.observe(document.body, { childList: true, subtree: true });
}

function stopObserver() {
  if (threadObserver) { threadObserver.disconnect(); threadObserver = null; }
  if (observerTimer) { clearTimeout(observerTimer); observerTimer = null; }
}

// ── Manual paste loader ─────────────────────────────────────────────────────

function loadPasted() {
  const name = $("dms-paste-name").value.trim();
  const text = $("dms-paste-text").value.trim();
  if (!text) return;

  const platform = (typeof getCurrentPlatform === "function" && getCurrentPlatform()) || null;
  const lines = text.split("\n").filter((l) => l.trim());
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

  const convLines = msgs.map((m) => (m.sender === "setter" ? "You" : (name || "Prospect")) + ": " + m.content);
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
  $("dms-paste-area").style.display = "none";
  $("dms-paste-toggle").textContent = "Show";
}

// ── Panel open/close ─────────────────────────────────────────────────────────

function openPanel() {
  if (!panelEl) {
    panelEl = buildPanel();
    document.body.appendChild(panelEl);
    $("dms-close").onclick = closePanel;
    $("dms-refresh").onclick = () => {
      lastConv = scrape();
      renderConvPreview(lastConv);
      refreshConnection().then(() => hydrateContext(lastConv));
    };
    $("dms-analyse-btn").onclick = analyse;
    $("dms-regen").onclick = analyse;
    $("dms-save-btn").onclick = saveToApp;
    $("dms-paste-toggle").onclick = () => {
      const area = $("dms-paste-area");
      const tbtn = $("dms-paste-toggle");
      const hidden = area.style.display === "none";
      area.style.display = hidden ? "block" : "none";
      tbtn.textContent = hidden ? "Hide" : "Show";
    };
    $("dms-paste-load").onclick = loadPasted;
  }

  isOpen = true;
  panelEl.classList.add("open");
  chrome.storage.local.set({ overlay_enabled: true });

  refreshConnection().then(() => {
    lastConv = scrape();
    renderConvPreview(lastConv);
    hydrateContext(lastConv);
  });
  startObserver();
}

function closePanel() {
  isOpen = false;
  if (panelEl) panelEl.classList.remove("open");
  chrome.storage.local.set({ overlay_enabled: false });
  stopObserver();
}

function togglePanel(show) {
  if (show) openPanel();
  else closePanel();
}

// React to session changes (sign in/out from popup) live.
chrome.storage.onChanged.addListener((changes) => {
  if (changes.session && isOpen) refreshConnection().then(() => hydrateContext(lastConv));
  if (changes.overlay_enabled) {
    const enabled = changes.overlay_enabled.newValue;
    if (enabled && !isOpen) openPanel();
    else if (!enabled && isOpen) closePanel();
  }
});

// Messages from the popup.
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "TOGGLE_OVERLAY") togglePanel(!!msg.visible);
  if (msg?.type === "TOGGLE_PANEL") togglePanel(!!msg.show);
  if (msg?.type === "ANALYSE_NOW") {
    if (!isOpen) openPanel();
    setTimeout(() => analyse(), 500);
  }
});

// Restore last state.
chrome.storage.local.get("overlay_enabled").then((s) => {
  if (s.overlay_enabled) openPanel();
});
