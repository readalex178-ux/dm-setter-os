// panel.js — DM Setter OS in-page panel
// RESPONSIBILITY: Interface layer ONLY.
//   1. Extract conversation from the page (via scraper.js)
//   2. Send to DM Setter OS (via background.js)
//   3. Render results — NEVER generate or decide anything locally
//
// If DM Setter OS is unreachable → safe error state. No fallback AI.

let panelEl = null;
let isOpen = false;
let lastConv = null;
let lastAnalysis = null;
let lastContext = null;
let lastSavedProspectId = null;
let signedIn = false;
let connOk = false;
let threadKey = "";
let threadObserver = null;
let observerTimer = null;

const STAGES = [
  "New Lead", "Discovery", "Qualification", "Interested",
  "Objection Handling", "Ready for Call", "Call Booked",
  "Not Qualified", "Cold Lead",
];

// ── Build panel HTML ─────────────────────────────────────────────────────────

function buildPanel() {
  const div = document.createElement("div");
  div.id = "dms-root";

  div.innerHTML = `
    <div class="dms-panel">

      <!-- Header -->
      <div class="dms-head">
        <div class="dms-logo">
          <div class="dms-logo-icon">⚡</div>
          <span><span class="dms-logo-cyan">DM Setter</span> OS</span>
        </div>
        <span class="dms-platform-tag" id="dms-platform">—</span>
        <div class="dms-head-btns">
          <button class="dms-btn-icon" id="dms-refresh" title="Re-scan conversation">↻</button>
          <button class="dms-btn-icon" id="dms-close" title="Close panel">✕</button>
        </div>
      </div>

      <!-- Connection status -->
      <div class="dms-conn" id="dms-conn">
        <span class="dms-dot idle" id="dms-dot"></span>
        <span id="dms-conn-text">Connecting to DM Setter OS…</span>
      </div>

      <!-- Panel 1: Prospect Overview -->
      <div class="dms-prospect">
        <div class="dms-prospect-name" id="dms-name">—</div>
        <div class="dms-prospect-sub" id="dms-sub">Open a DM conversation to get started</div>
        <div class="dms-overview" id="dms-overview">
          <div class="dms-ov-card">
            <div class="dms-ov-lbl">Stage</div>
            <div class="dms-ov-val" id="dms-ov-stage">—</div>
          </div>
          <div class="dms-ov-card">
            <div class="dms-ov-lbl">Score</div>
            <div class="dms-ov-val" id="dms-ov-score">—</div>
          </div>
        </div>
      </div>

      <!-- Scroll body -->
      <div class="dms-body">

        <!-- Status message -->
        <div id="dms-status" class="dms-status"></div>

        <!-- Analyse button -->
        <div class="dms-stack">
          <button class="dms-btn-primary" id="dms-analyse-btn">⚡ Analyse Conversation</button>
        </div>

        <!-- Panel 2: AI Insights (FROM DM SETTER OS) -->
        <div class="dms-section" id="dms-insights-section" style="display:none">
          <div class="dms-section-head">
            AI Insights
          </div>
          <div class="dms-metrics" id="dms-metrics"></div>
          <div class="dms-badges" id="dms-badges"></div>
          <div id="dms-summary"></div>
          <div id="dms-objections"></div>
          <div id="dms-next-action"></div>
          <div id="dms-approach"></div>
        </div>

        <!-- Panel 3: Reply Suggestions (FROM DM SETTER OS) -->
        <div class="dms-section" id="dms-replies-section" style="display:none">
          <div class="dms-section-head">
            Reply Suggestions
            <button class="dms-btn-sm" id="dms-regen">↻ Regenerate</button>
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
          <div class="dms-save-msg" id="dms-save-msg"></div>
        </div>

        <!-- Captured messages -->
        <div class="dms-section">
          <div class="dms-section-head">
            Captured Messages
            <span id="dms-msg-count" style="font-weight:400;text-transform:none;letter-spacing:0">0 messages</span>
          </div>
          <div id="dms-conv" class="dms-conv">
            <div class="dms-hint">Open a DM and scroll through it, then click Analyse.</div>
          </div>
        </div>

        <!-- Manual paste fallback -->
        <div class="dms-section">
          <div class="dms-section-head">
            Paste Conversation
            <button id="dms-paste-toggle" class="dms-btn-sm">Show</button>
          </div>
          <div id="dms-paste-area" style="display:none;margin-top:8px">
            <p class="dms-hint" style="text-align:left;margin-bottom:8px">Format: <strong>Name: message</strong> per line</p>
            <input id="dms-paste-name" type="text" placeholder="Prospect name" class="dms-input" />
            <textarea id="dms-paste-text" rows="5"
              placeholder="Sarah: Hey I saw your post&#10;You: Hey Sarah! Thanks for reaching out..."
              class="dms-input"></textarea>
            <button id="dms-paste-load" class="dms-btn-ghost">Load Pasted Conversation</button>
          </div>
        </div>

      </div>
    </div>
  `;
  return div;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function $(id) { return document.getElementById(id); }

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

function showStatus(msg, type) {
  const el = $("dms-status");
  if (!el) return;
  if (!msg) { el.className = "dms-status"; el.textContent = ""; return; }
  el.className = "dms-status " + (type || "info");
  el.textContent = msg;
}

function setConn(state, text) {
  const dot = $("dms-dot");
  const t = $("dms-conn-text");
  if (!dot || !t) return;
  dot.className = "dms-dot " + state;
  t.textContent = text;
}

function sendBg(msg) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (res) => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
      else resolve(res);
    });
  });
}

function setActionsEnabled(enabled) {
  ["dms-analyse-btn", "dms-regen", "dms-save-btn", "dms-stage-select"].forEach((id) => {
    const el = $(id);
    if (el) el.disabled = !enabled;
  });
}

function scoreColor(n) {
  return n >= 70 ? "var(--dms-success)" : n >= 40 ? "var(--dms-warning)" : "var(--dms-error)";
}

function tempColor(t) {
  if (t === "hot") return "var(--dms-error)";
  if (t === "warm") return "var(--dms-warning)";
  return "var(--dms-info)";
}

// ── Connection / session ─────────────────────────────────────────────────────

async function refreshConnection() {
  try {
    const res = await sendBg({ type: "VERIFY_SESSION" });
    signedIn = !!res?.signedIn;
    connOk = true;
    if (signedIn) {
      const who = res?.profile?.display_name || res?.user?.email || "your account";
      setConn("ok", `Connected · ${who}`);
      setActionsEnabled(true);
    } else {
      setConn("warn", "Not signed in — open the extension popup to log in");
      setActionsEnabled(false);
    }
  } catch {
    signedIn = false;
    connOk = false;
    setConn("err", "DM Setter OS unreachable — check connection");
    setActionsEnabled(false);
  }
}

// ── Context hydration (on thread open) ──────────────────────────────────────

async function hydrateContext(conv) {
  if (!signedIn || !connOk || (!conv?.name && !conv?.handle)) return;
  try {
    const res = await sendBg({
      type: "GET_CONTEXT",
      payload: {
        platform: conv.platformName || conv.platformId || "unknown",
        name: conv.name || "",
        handle: conv.handle || "",
      },
    });
    if (!res?.ok) return;
    lastContext = res.context;
    renderContext(res.context);
  } catch (e) {
    console.warn("[DM Setter OS] Context hydrate failed:", e);
  }
}

function renderContext(ctx) {
  if (!ctx?.found || !ctx.prospect) return;

  const ov = $("dms-overview");
  ov.classList.add("visible");
  $("dms-ov-stage").textContent = ctx.prospect.stage || "New Lead";
  const score = ctx.prospect.conversation_score;
  $("dms-ov-score").textContent = score != null ? score + "/100" : "—";
  if (ctx.prospect.stage) {
    const sel = $("dms-stage-select");
    if (sel) sel.value = ctx.prospect.stage;
  }

  if (ctx.recommended_approach) {
    $("dms-insights-section").style.display = "block";
    $("dms-approach").innerHTML = `<div class="dms-approach"><strong>Recommended approach:</strong> ${escHtml(ctx.recommended_approach)}</div>`;
  }
}

// ── Render conversation preview ──────────────────────────────────────────────

function renderConvPreview(conv) {
  const platform = (typeof getCurrentPlatform === "function") ? getCurrentPlatform() : null;
  $("dms-platform").textContent = platform ? `${platform.emoji} ${platform.name}` : "—";
  $("dms-name").textContent = conv.name || "Unknown Prospect";
  $("dms-sub").textContent = conv.lines.length
    ? `${conv.lines.length} messages captured on ${conv.platformName || platform?.name || "this platform"}`
    : "No messages captured yet";
  $("dms-msg-count").textContent = conv.lines.length + " messages";

  const el = $("dms-conv");
  if (!conv.lines.length) {
    const debug = conv.debug
      ? `<div class="dms-hint" style="text-align:left;font-family:monospace;font-size:10px;white-space:pre-wrap;margin-top:8px">${escHtml(conv.debug)}</div>`
      : "";
    el.innerHTML = '<div class="dms-hint">No messages found — scroll through the conversation then re-scan.</div>' + debug;
    return;
  }

  el.innerHTML = conv.lines.slice(-8).map((line) => {
    const isYou = line.startsWith("You:");
    return `<div class="dms-msg ${isYou ? "you" : "them"}">${escHtml(line)}</div>`;
  }).join("");
}

// ── Render analysis (FROM DM SETTER OS) ─────────────────────────────────────

function renderAnalysis(a) {
  lastAnalysis = a;

  // Show insights section
  const insightsSec = $("dms-insights-section");
  insightsSec.style.display = "block";

  // Metrics: score + booking probability
  $("dms-metrics").innerHTML = [
    ["Conv. Score", a.conversation_score, scoreColor(a.conversation_score), "/100"],
    ["Booking %", a.booking_probability, scoreColor(a.booking_probability), "%"],
  ].map(([lbl, v, c, sfx]) => `
    <div class="dms-metric">
      <div class="dms-metric-val" style="color:${c}">${v ?? "—"}<span class="dms-metric-suffix">${sfx}</span></div>
      <div class="dms-metric-lbl">${lbl}</div>
    </div>
  `).join("");

  // Badges: temperature + stage
  $("dms-badges").innerHTML = [
    a.temperature && `<span class="dms-badge" style="color:${tempColor(a.temperature)}">${a.temperature.toUpperCase()}</span>`,
    a.stage && `<span class="dms-badge" style="color:var(--dms-info)">${escHtml(a.stage)}</span>`,
  ].filter(Boolean).join("");

  // Summary
  $("dms-summary").innerHTML = a.summary
    ? `<div class="dms-summary">${escHtml(a.summary)}</div>`
    : "";

  // Objections
  $("dms-objections").innerHTML = (a.objections?.length)
    ? a.objections.map((o) => `<div class="dms-objection">⚠️ ${escHtml(o)}</div>`).join("")
    : "";

  // Next action
  $("dms-next-action").innerHTML = a.next_action
    ? `<div class="dms-next-action">🎯 <strong>Next:</strong> ${escHtml(a.next_action)}</div>`
    : "";

  // Update stage dropdown
  if (a.stage) {
    const sel = $("dms-stage-select");
    if (sel) sel.value = a.stage;
  }

  // Update overview cards
  const ov = $("dms-overview");
  ov.classList.add("visible");
  $("dms-ov-stage").textContent = a.stage || "—";
  $("dms-ov-score").textContent = a.conversation_score != null ? a.conversation_score + "/100" : "—";

  // Render replies
  renderReplies(a.replies);
}

function renderReplies(replies) {
  const sec = $("dms-replies-section");
  const el = $("dms-replies");
  if (!replies?.length) { sec.style.display = "none"; return; }
  sec.style.display = "block";

  el.innerHTML = replies.map((r, i) => `
    <div class="dms-reply">
      <div class="dms-reply-top">
        <span class="dms-reply-label">${escHtml(r.label || `Reply ${i + 1}`)}</span>
        <div class="dms-reply-btns">
          <button class="dms-btn-sm dms-insert-btn" data-i="${i}">Insert</button>
          <button class="dms-btn-sm dms-copy-btn" data-i="${i}">Copy</button>
        </div>
      </div>
      <div class="dms-reply-text">${escHtml(r.content || "")}</div>
      ${r.note ? `<div class="dms-reply-note">💡 ${escHtml(r.note)}</div>` : ""}
    </div>
  `).join("");

  el.querySelectorAll(".dms-copy-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const text = replies[+btn.dataset.i]?.content || "";
      navigator.clipboard.writeText(text);
      flash(btn, "✓ Copied");
    };
  });

  el.querySelectorAll(".dms-insert-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.stopPropagation();
      const text = replies[+btn.dataset.i]?.content || "";
      if (insertIntoComposer(text)) flash(btn, "✓ Inserted");
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
      document.execCommand("selectAll", false, null);
      document.execCommand("insertText", false, text);
      box.dispatchEvent(new Event("input", { bubbles: true }));
    }
    return true;
  } catch {
    return false;
  }
}

// ── Analyse (delegates entirely to DM Setter OS) ────────────────────────────

async function analyse() {
  if (!lastConv?._manual) lastConv = scrape();
  renderConvPreview(lastConv);

  if (!lastConv?.lines?.length) {
    showStatus("No messages found — open a DM conversation and scroll through it first.", "error");
    return;
  }
  if (!connOk) { showStatus("DM Setter OS is unreachable. Check your connection.", "error"); return; }
  if (!signedIn) { showStatus("Sign in via the extension popup to use AI analysis.", "error"); return; }

  showStatus("Analysing with DM Setter OS…", "loading");
  const btn = $("dms-analyse-btn");
  btn.disabled = true;
  btn.textContent = "⏳ Analysing…";
  $("dms-save-msg").classList.remove("visible");

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

    // Analysis is optional enrichment — it never triggers a save on its own.
    // But if this prospect was already saved to the CRM (this session or a
    // previous one), push the new analysis into that existing record instead
    // of leaving it stranded client-side until the user happens to click
    // Save again.
    if (lastSavedProspectId || lastContext?.found) {
      syncEnrichment().catch((err) =>
        console.warn("[DM Setter OS] Enrichment sync failed:", err)
      );
    }
  } catch (e) {
    console.error("[DM Setter OS] Analyse failed:", e);
    showStatus(e.message, "error");
  } finally {
    btn.disabled = false;
    btn.textContent = "⚡ Analyse Conversation";
  }
}

// ── Save to CRM ──────────────────────────────────────────────────────────────
// Saving is the basic action: anyone you're DMing is a prospect, so this
// persists whatever scraped info we have (name/handle/platform, and any
// captured messages) the moment the user clicks. It never waits on, or
// requires, AI analysis — "Analyse Conversation" is a fully separate,
// optional enrichment step that can run before, after, or never.

function buildSavePayload(stageOverride) {
  const analysis = lastAnalysis ? { ...lastAnalysis, stage: stageOverride } : { stage: stageOverride };
  return {
    prospect: {
      name: lastConv?.name || "Unknown",
      handle: lastConv?.handle || "",
      source: `${lastConv?.platformName || "Extension"} (Extension)`,
      platform: lastConv?.platformId,
      stage: stageOverride,
    },
    messages: lastConv?.msgs || [],
    analysis,
  };
}

async function saveToApp() {
  if (!lastConv) lastConv = scrape();

  if (!connOk || !signedIn) {
    showStatus("Sign in to DM Setter OS to sync your CRM.", "error");
    return;
  }

  if (!lastConv.name && !lastConv.handle) {
    const entered = prompt("What's this prospect's name or @handle?", "");
    if (entered?.trim()) lastConv.name = entered.trim();
  }
  if (!lastConv.name && !lastConv.handle) {
    showStatus("Couldn't identify this prospect — open a DM conversation first.", "error");
    return;
  }

  const btn = $("dms-save-btn");
  const msgEl = $("dms-save-msg");
  btn.disabled = true;
  btn.textContent = "Saving…";
  msgEl.classList.remove("visible");

  const stageOverride = $("dms-stage-select").value;
  const payload = buildSavePayload(stageOverride);

  try {
    const result = await sendBg({ type: "SAVE_CONVERSATION", payload });
    if (!result?.ok) throw new Error(result?.error || "Unknown error");
    lastSavedProspectId = result.id;

    btn.textContent = "✓ Saved to CRM";
    btn.classList.add("done");
    msgEl.textContent = "Synced to DM Setter OS ✓";
    msgEl.style.color = "var(--dms-success)";
    msgEl.classList.add("visible");
    setTimeout(() => {
      btn.textContent = "💾 Save to CRM";
      btn.disabled = false;
      btn.classList.remove("done");
    }, 2500);
  } catch (e) {
    btn.textContent = "💾 Save to CRM";
    btn.disabled = false;
    btn.classList.remove("done");
    msgEl.textContent = "Save failed: " + e.message;
    msgEl.style.color = "var(--dms-error)";
    msgEl.classList.add("visible");
  }
}

// Silent variant used to push a post-save analysis into an already-saved
// prospect record. No button/status UI churn — failures are just logged,
// since this is best-effort enrichment, not the primary save action.
async function syncEnrichment() {
  if (!connOk || !signedIn) return;
  if (!lastConv?.name && !lastConv?.handle) return;
  const stageOverride = $("dms-stage-select")?.value || "New Lead";
  const payload = buildSavePayload(stageOverride);
  const result = await sendBg({ type: "SAVE_CONVERSATION", payload });
  if (result?.ok) lastSavedProspectId = result.id;
}

// ── Event-driven thread detection (no polling) ───────────────────────────────

function currentThreadKey() {
  const conv = (typeof scrape === "function") ? scrape() : { name: "", lines: [] };
  return `${location.pathname}|${conv.name || ""}|${conv.lines.length}`;
}

function onThreadChanged() {
  if (!isOpen) return;
  lastConv = scrape();
  lastAnalysis = null;
  lastContext = null;
  lastSavedProspectId = null;

  // Reset analysis panels
  $("dms-insights-section").style.display = "none";
  $("dms-replies-section").style.display = "none";
  $("dms-metrics").innerHTML = "";
  $("dms-badges").innerHTML = "";
  $("dms-summary").innerHTML = "";
  $("dms-objections").innerHTML = "";
  $("dms-next-action").innerHTML = "";
  $("dms-approach").innerHTML = "";
  $("dms-overview").classList.remove("visible");
  showStatus("");

  renderConvPreview(lastConv);
  hydrateContext(lastConv);
}

function startObserver() {
  if (threadObserver) return;
  threadKey = currentThreadKey();
  threadObserver = new MutationObserver(() => {
    if (observerTimer) clearTimeout(observerTimer);
    observerTimer = setTimeout(() => {
      const key = currentThreadKey();
      if (key !== threadKey) { threadKey = key; onThreadChanged(); }
    }, 800);
  });
  threadObserver.observe(document.body, { childList: true, subtree: true });
}

function stopObserver() {
  if (threadObserver) { threadObserver.disconnect(); threadObserver = null; }
  if (observerTimer) { clearTimeout(observerTimer); observerTimer = null; }
}

// ── Manual paste ─────────────────────────────────────────────────────────────

function loadPasted() {
  const name = $("dms-paste-name").value.trim();
  const text = $("dms-paste-text").value.trim();
  if (!text) return;

  const platform = (typeof getCurrentPlatform === "function") ? getCurrentPlatform() : null;
  const lines = text.split("\n").filter((l) => l.trim());
  const msgs = [];
  const seen = new Set();

  lines.forEach((line, i) => {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0 && colonIdx < 30) {
      const speaker = line.slice(0, colonIdx).trim().toLowerCase();
      const content = line.slice(colonIdx + 1).trim();
      if (!content || seen.has(content)) return;
      seen.add(content);
      msgs.push({ sender: ["you", "me", "setter", "i"].includes(speaker) ? "setter" : "prospect", content });
    } else {
      const content = line.trim();
      if (!content || seen.has(content)) return;
      seen.add(content);
      msgs.push({ sender: i % 2 === 0 ? "prospect" : "setter", content });
    }
  });

  if (!msgs.length) {
    showStatus("Could not parse messages. Use: Name: message per line.", "error");
    return;
  }

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
  showStatus(`Loaded ${msgs.length} messages — click Analyse.`, "info");
  $("dms-paste-area").style.display = "none";
  $("dms-paste-toggle").textContent = "Show";
}

// ── Panel open/close ─────────────────────────────────────────────────────────

function openPanel() {
  if (!panelEl) {
    panelEl = buildPanel();
    document.body.appendChild(panelEl);

    // Wire events
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
      const btn = $("dms-paste-toggle");
      const show = area.style.display === "none";
      area.style.display = show ? "block" : "none";
      btn.textContent = show ? "Hide" : "Show";
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

// ── Listeners ────────────────────────────────────────────────────────────────

// Sync session/overlay state changes (e.g. sign in from popup while panel is open)
chrome.storage.onChanged.addListener((changes) => {
  if (changes.session && isOpen) {
    refreshConnection().then(() => hydrateContext(lastConv));
  }
  if (changes.overlay_enabled !== undefined) {
    const enabled = changes.overlay_enabled.newValue;
    if (enabled && !isOpen) openPanel();
    else if (!enabled && isOpen) closePanel();
  }
});

// Messages from popup
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === "TOGGLE_OVERLAY") togglePanel(!!msg.visible);
  if (msg?.type === "TOGGLE_PANEL") togglePanel(!!msg.show);
  if (msg?.type === "ANALYSE_NOW") {
    if (!isOpen) openPanel();
    setTimeout(() => analyse(), 600);
  }
});

// Restore on page load
chrome.storage.local.get("overlay_enabled").then((s) => {
  if (s.overlay_enabled) openPanel();
});
