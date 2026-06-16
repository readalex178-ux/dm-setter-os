// scraper.js — scoped to open conversation only

// ── Platform detection ─────────────────────────────────────────────────────

function getCurrentPlatform() {
  const h = location.hostname;
  if (h.includes("instagram.com")) return { id: "instagram", name: "Instagram", emoji: "📸" };
  if (h.includes("tiktok.com"))    return { id: "tiktok",    name: "TikTok",    emoji: "🎵" };
  if (h.includes("twitter.com") || h.includes("x.com")) return { id: "twitter", name: "Twitter/X", emoji: "𝕏" };
  if (h.includes("facebook.com") || h.includes("messenger.com")) return { id: "facebook", name: "Facebook", emoji: "👤" };
  if (h.includes("linkedin.com")) return { id: "linkedin", name: "LinkedIn", emoji: "💼" };
  return null;
}

// ── Junk filter ─────────────────────────────────────────────────────────────

function isJunk(t) {
  if (!t || t.length < 2 || t.length > 600) return true;
  if (/^\d{1,2}:\d{2}/.test(t)) return true;
  if (/^(Today|Yesterday|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(t)) return true;
  if (/^(Sent|Delivered|Seen|Read|Active|Liked|Reacted|Follow|Following|Followers|Views|Likes|Like)$/i.test(t)) return true;
  if (/^(Send message|Video call|Audio call|React|Reply|Unsend|More|Share|Save|Copy|Forward|Delete|Photo|Video|GIF|Sticker)$/i.test(t)) return true;
  if (t.includes("React to") || t.includes("Reply to") || t.includes("Tap to")) return true;
  return false;
}

// ── Sender detection via computed layout ────────────────────────────────────

function detectSender(el) {
  let cur = el;
  for (let i = 0; i < 12; i++) {
    if (!cur || cur === document.body) break;
    const s = window.getComputedStyle(cur);
    if (s.justifyContent === "flex-end") return "setter";
    if (s.justifyContent === "flex-start") return "prospect";
    if (s.alignSelf === "flex-end") return "setter";
    if (s.alignSelf === "flex-start") return "prospect";
    cur = cur.parentElement;
  }
  return null;
}

// ── Find the chat container (NOT the whole page) ────────────────────────────

function getChatContainer(platformId) {
  const candidates = {
    instagram: [
      '[role="main"] [role="list"]',
      '[role="main"] [role="grid"]',
      '[role="main"] ul',
      '[role="main"]',
    ],
    tiktok: [
      '[data-e2e="chat-detail"]',
      '[data-e2e="chat-message-container"]',
      '[class*="ChatDetail"]',
      '[class*="chat-detail"]',
      '[class*="MessageList"]',
      '[class*="messageList"]',
    ],
    twitter: [
      '[data-testid="DMActivity"]',
      '[data-testid="DmActivityViewport"]',
      '[aria-label*="conversation"]',
    ],
    facebook: [
      '[role="main"] [class*="message"]',
      '[aria-label*="Messages"][role="main"]',
      '[data-testid*="message"]',
    ],
    linkedin: [
      '.msg-s-message-list-container',
      '.msg-s-message-list',
      '.scaffold-layout__detail .msg-thread',
      '.msg-conversation-card__content',
    ],
  };

  const selectors = candidates[platformId] || [];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el) return el;
  }
  // Last resort — role=main scoped
  return document.querySelector('[role="main"]') || document.body;
}

// ── Name extraction ─────────────────────────────────────────────────────────

function getProspectName(platformId) {
  // Instagram: name is in the thread header as a link
  if (platformId === "instagram") {
    const selectors = [
      'div[role="main"] header a span',
      'div[role="main"] header h2',
      'div[role="main"] header span[dir="auto"]',
    ];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const text = el.textContent?.trim();
        if (text && text.length > 0 && text.length < 60 && text !== "Instagram") return text;
      }
    }
    // Page title — Instagram puts name in title when DM is open
    const title = document.title.replace(/\s*[\|•·]\s*.*/g, "").trim();
    if (title && title !== "Instagram" && title !== "Direct" && title.length < 60) return title;
  }

  // TikTok: name in chat header
  if (platformId === "tiktok") {
    const selectors = [
      '[data-e2e="chat-user-name"]',
      '[data-e2e="chat-detail-header"] [class*="name"]',
      '[data-e2e="chat-detail-header"] [class*="Name"]',
      '[data-e2e="chat-detail-header"] span',
    ];
    for (const sel of selectors) {
      const els = document.querySelectorAll(sel);
      for (const el of els) {
        const text = el.textContent?.trim();
        if (text && text.length > 0 && text.length < 60 && !["TikTok","Messages","DM"].includes(text)) return text;
      }
    }
    // TikTok title: "Chat with Username | TikTok" or just "TikTok"
    const title = document.title.replace(/\s*[\|•·]\s*.*/g, "").replace(/^Chat with\s*/i, "").trim();
    if (title && title !== "TikTok" && title !== "Messages" && title.length < 60) return title;
  }

  // Twitter/X
  if (platformId === "twitter") {
    const el = document.querySelector('[data-testid="conversation-info-header"] span, [data-testid="UserName"] span');
    if (el?.textContent?.trim()) return el.textContent.trim();
    const title = document.title.replace(/\s*[\|/]\s*.*/g, "").trim();
    if (title && title !== "Twitter" && title !== "X" && title.length < 60) return title;
  }

  // Facebook
  if (platformId === "facebook") {
    const el = document.querySelector('h4[dir="auto"], [aria-label*="conversation"] h4');
    if (el?.textContent?.trim()) return el.textContent.trim();
  }

  return null;
}

// ── Message extraction scoped to container ──────────────────────────────────

function extractMessages(container, platformId) {
  const msgs = [];
  const seen = new Set();

  function add(text, sender) {
    const t = (text || "").trim();
    if (isJunk(t) || seen.has(t) || !sender) return;
    seen.add(t);
    msgs.push({ sender, content: t });
  }

  if (platformId === "instagram") {
    // Instagram messages are in spans/divs with dir="auto" inside the conversation
    container.querySelectorAll('[dir="auto"]').forEach(el => {
      // Skip if it contains nested dir="auto" (it's a container not a leaf)
      if (el.querySelectorAll('[dir="auto"]').length > 0) return;
      // Skip nav/header elements
      if (el.closest('header, nav, [role="navigation"], [role="banner"]')) return;
      const text = el.textContent?.trim();
      const sender = detectSender(el);
      add(text, sender);
    });
  }

  else if (platformId === "tiktok") {
    // Try data-e2e first (most specific)
    container.querySelectorAll('[data-e2e="chat-message"]').forEach(el => {
      const textEl = el.querySelector('p') || el.querySelector('span');
      add((textEl || el).textContent, detectSender(el));
    });

    // Class-based fallback within container only
    if (msgs.length === 0) {
      const classSelectors = ['[class*="DmMessage"]', '[class*="MessageItem"]', '[class*="messageItem"]', '[class*="chatMessage"]'];
      for (const sel of classSelectors) {
        container.querySelectorAll(sel).forEach(el => {
          const textEl = el.querySelector('p') || el.querySelector('span');
          add((textEl || el).textContent, detectSender(el));
        });
        if (msgs.length > 0) break;
      }
    }

    // Scoped text walker — ONLY within the chat container, not the whole page
    if (msgs.length === 0) {
      const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const text = node.textContent?.trim();
        if (!text || text.length < 2 || text.length > 400) continue;
        const parent = node.parentElement;
        if (!parent || parent.children.length > 0) continue;
        const tag = parent.tagName?.toLowerCase();
        if (["script", "style", "noscript"].includes(tag)) continue;
        // Skip if parent is a button or link (nav elements)
        if (parent.closest('button, a, nav, header')) continue;
        const sender = detectSender(parent);
        add(text, sender);
      }
    }
  }

  else if (platformId === "twitter") {
    container.querySelectorAll('[data-testid="messageEntry"]').forEach(el => {
      const textEl = el.querySelector('[data-testid="tweetText"]') || el.querySelector('span:not(:has(*))');
      const text = textEl?.textContent?.trim();
      const isOwn = !!el.closest('[data-testid="outgoingMessage"]');
      add(text, isOwn ? "setter" : "prospect");
    });
  }

  else if (platformId === "facebook") {
    container.querySelectorAll('[dir="auto"]').forEach(el => {
      if (el.querySelectorAll('[dir="auto"]').length > 0) return;
      const text = el.textContent?.trim();
      const sender = detectSender(el);
      add(text, sender);
    });
  }

  return msgs;
}

// ── Debug info when nothing found ───────────────────────────────────────────

function getDebugInfo(platformId, container) {
  const lines = [
    "Platform: " + platformId,
    "URL: " + location.pathname,
    "Title: " + document.title,
    "Container: " + (container === document.body ? "body (fallback)" : container.tagName + "." + container.className?.toString().slice(0, 40)),
  ];
  const checks = ['[data-e2e="chat-message"]', '[role="row"]', '[role="listitem"]', '[dir="auto"]', '[data-testid="messageEntry"]'];
  checks.forEach(sel => {
    const n = container.querySelectorAll(sel).length;
    if (n > 0) lines.push("Found " + n + "x " + sel);
  });
  return lines.join("\n");
}

// ── Main scrape function ────────────────────────────────────────────────────

function scrape() {
  const platform = getCurrentPlatform();
  const platformId = platform?.id || "unknown";
  const name = getProspectName(platformId);
  const container = getChatContainer(platformId);
  const msgs = extractMessages(container, platformId);
  const lines = msgs.map(m => (m.sender === "setter" ? "You" : (name || "Prospect")) + ": " + m.content);
  const debug = msgs.length === 0 ? getDebugInfo(platformId, container) : null;
  return { platformId, platformName: platform?.name || "Unknown", name, msgs, lines, debug };
}
