// scraper.js — scoped to open conversation only

// ── Platform detection ────────────────────────────────────────────────────

function getCurrentPlatform() {
  const h = location.hostname;
  if (h.includes("instagram.com")) return { id: "instagram", name: "Instagram", emoji: "📸" };
  if (h.includes("tiktok.com"))    return { id: "tiktok",    name: "TikTok",    emoji: "🎵" };
  if (h.includes("twitter.com") || h.includes("x.com")) return { id: "twitter", name: "Twitter/X", emoji: "𝕏" };
  if (h.includes("facebook.com") || h.includes("messenger.com")) return { id: "facebook", name: "Facebook", emoji: "👤" };
  if (h.includes("linkedin.com")) return { id: "linkedin", name: "LinkedIn", emoji: "💼" };
  return null;
}

// ── Junk filter ──────────────────────────────────────────────────────────

function isJunk(t) {
  if (!t || t.length < 2 || t.length > 600) return true;
  if (/^\d{1,2}:\d{2}/.test(t)) return true;
  if (/^(Today|Yesterday|Mon|Tue|Wed|Thu|Fri|Sat|Sun|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i.test(t)) return true;
  if (/^(Sent|Delivered|Seen|Read|Active|Liked|Reacted|Follow|Following|Followers|Views|Likes|Like)$/i.test(t)) return true;
  if (/^(Send message|Video call|Audio call|React|Reply|Unsend|More|Share|Save|Copy|Forward|Delete|Photo|Video|GIF|Sticker)$/i.test(t)) return true;
  if (/^(For You|Following|Friends|Inbox|Activity|Upload|Discover|LIVE|Live)$/i.test(t)) return true;
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

function detectSenderTikTok(itemEl) {
  const horiz = itemEl.querySelector('div[class*="MessageHorizontalContainer"]');
  if (horiz) {
    const fd = window.getComputedStyle(horiz).flexDirection;
    if (fd === "row-reverse") return "setter";
    if (fd === "row") return "prospect";
  }
let cur = itemEl;
  for (let i = 0; i < 8; i++) {
    if (!cur || cur === document.body) break;
    const fd = window.getComputedStyle(cur).flexDirection;
    if (fd === "row-reverse") return "setter";
    if (fd === "row") return "prospect";
    cur = cur.parentElement;
  }
  return null;
}

function getChatContainer(platformId) {
  const candidates = {
    instagram: [
      '[role="navigation"][aria-label="Thread list"] + div',
      '[role="main"] [role="list"]',
      '[role="main"] [role="grid"]',
      '[role="main"] ul',
      '[role="main"]',
      ],
    tiktok: [
    '[data-e2e="dm-new-message-list"]',
      '[data-e2e="chat-detail"]',
      '[data-e2e="chat-message-container"]',
      '[data-e2e="message-list"]',
      '[data-e2e="chat-content"]',
      '[class*="ChatDetail"]',
      '[class*="chat-detail"]',
      '[class*="MessageList"]',
      '[class*="messageList"]',
      '[class*="DivMessageListContainer"]',
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
if (platformId === "instagram" || platformId === "facebook") {
  return document.querySelector('[role="main"]') || null;
}
  return null;
}

function getProspectName(platformId) {
if (platformId === "instagram") {
  const igHeader = document.querySelector('[data-pagelet="IGDInboxHeaderOffMsys"]');
  if (igHeader) {
    const SKIP = /^(active|audio call|video call|conversation information|call)/i;
    const nameSpan = [...igHeader.querySelectorAll('span')].find(s => {
      const t = s.textContent?.trim();
      return t && t.length > 1 && t.length < 80 && !SKIP.test(t);
    });
    if (nameSpan?.textContent?.trim()) return nameSpan.textContent.trim();
  }
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
}

if (platformId === "tiktok") {
  const selectors = [
    '[data-e2e="dm-new-chat-nickname"]',
    '[data-e2e="chat-uniqueid"]',
    '[data-e2e="chat-user-name"]',
    '[data-e2e="chat-detail-header"] [class*="name"]',
    '[data-e2e="chat-detail-header"] [class*="Name"]',
    '[data-e2e="chat-detail-header"] span',
    '[data-e2e="chat-detail-header"] [aria-label]',
    'header [class*="UserName"]',
    'header [class*="username"]',
    ];
  for (const sel of selectors) {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      const text = (el.getAttribute && el.getAttribute('aria-label')) || el.textContent?.trim();
      if (text && text.length > 0 && text.length < 60 && !["TikTok","Messages","DM"].includes(text)) return text.trim();
    }
  }
  const title = document.title.replace(/\s*[\|•·]\s*.*/g, "").replace(/^Chat with\s*/i, "").trim();
  if (title && title !== "TikTok" && title !== "Messages" && title.length < 60) return title;
}

if (platformId === "twitter") {
  const selectors = [
    '[data-testid="conversation-info-header"] span[dir="ltr"]',
    '[data-testid="UserName"] span',
    '[aria-label*="conversation"] h2',
  ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    const text = el?.textContent?.trim();
    if (text && text.length > 0 && text.length < 60 && !['Twitter','X','Messages'].includes(text)) return text;
  }
  const title = document.title.replace(/\s*[\|/]\s*.*/g, "").trim();
  if (title && title !== "Twitter" && title !== "X" && title !== "Messages" && title.length < 60) return title;
}

if (platformId === "facebook") {
  // 1. Page title is most reliable — FB/Messenger sets tab title to contact name when in a convo
  const rawTitle = document.title.replace(/\s*[|·•\-–—]\s*.*/g, '').trim();
  const SKIP_FB = /^(messenger|facebook|messages)$/i;
  if (rawTitle && rawTitle.length > 1 && rawTitle.length < 60 && !SKIP_FB.test(rawTitle)) return rawTitle;
  // 2. DOM fallbacks
  const fbSelectors = [
    'h2[dir="auto"]',
    'h4[dir="auto"]',
    '[aria-label*="conversation"] h2',
    '[aria-label*="conversation"] h4',
    '[role="main"] span[dir="auto"]',
  ];
  for (const sel of fbSelectors) {
    const els = document.querySelectorAll(sel);
    for (const el of els) {
      const text = el?.textContent?.trim();
      if (text && text.length > 1 && text.length < 60 && !SKIP_FB.test(text)) return text;
    }
  }
}

if (platformId === "linkedin") {
  const selectors = [
    '.msg-thread__link-to-profile',
    '.msg-conversation-card__title-row h2',
    '.msg-overlay-bubble-header__title',
    'h2.msg-entity-lockup__entity-title',
    ];
  for (const sel of selectors) {
    const el = document.querySelector(sel);
    const text = el?.textContent?.trim();
    if (text && text.length > 0 && text.length < 60 && text !== "LinkedIn") return text;
  }
  const title = document.title.replace(/\s*[\|•·]\s*.*/g, "").replace(/^Messaging\s*\|?\s*/i, "").trim();
  if (title && title !== "LinkedIn" && title !== "Messaging" && title.length < 60) return title;
}

return null;
}

function extractMessages(container, platformId) {
  const msgs = [];
  const seen = new Set();
if (!container) return msgs;
function add(text, sender) {
  const t = (text || "").trim();
  if (isJunk(t) || seen.has(t) || !sender) return;
  seen.add(t);
  msgs.push({ sender, content: t });
}
if (platformId === "instagram") {
  container.querySelectorAll('[dir="auto"]').forEach(el => {
    if (el.querySelectorAll('[dir="auto"]').length > 0) return;
    if (el.closest('header, nav, [role="navigation"], [role="banner"]')) return;
    if (el.tagName === 'H1' || el.tagName === 'H2') return;
    const text = el.textContent?.trim();
    const sender = detectSender(el);
    add(text, sender);
  });
}
else if (platformId === "tiktok") {
  container.querySelectorAll('[data-e2e="dm-new-chat-item"]').forEach(item => {
    const textEl = item.querySelector('[data-e2e="dm-new-message-text"]');
    if (!textEl) return;
    add(textEl.textContent, detectSenderTikTok(item) || "prospect");
  });
  if (msgs.length === 0) {
    container.querySelectorAll('[data-e2e="chat-message"]').forEach(el => {
      const textEl = el.querySelector('p') || el.querySelector('span');
      add((textEl || el).textContent, detectSenderTikTok(el) || detectSender(el));
    });
  }
  if (msgs.length === 0) {
    const classSelectors = ['[class*="DmMessage"]', '[class*="MessageItem"]', '[class*="messageItem"]', '[class*="chatMessage"]', '[class*="ChatMessage"]'];
    for (const sel of classSelectors) {
      container.querySelectorAll(sel).forEach(el => {
        const textEl = el.querySelector('p') || el.querySelector('span');
        add((textEl || el).textContent, detectSenderTikTok(el) || detectSender(el));
      });
      if (msgs.length > 0) break;
    }
  }
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
      if (parent.closest('button, a, nav, header')) continue;
      const sender = detectSenderTikTok(parent) || detectSender(parent);
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
else if (platformId === "linkedin") {
  const events = container.querySelectorAll('.msg-s-event-listitem, li.msg-s-message-list__event');
  events.forEach(el => {
    const bodyEl = el.querySelector('.msg-s-event-listitem__body, p.msg-s-event-listitem__body');
    const text = bodyEl?.textContent?.trim();
    const isProspect = el.classList.contains('msg-s-event-listitem--other') || el.querySelector('.msg-s-message-group--other') !== null;
    const sender = isProspect ? 'prospect' : 'setter';
    add(text, sender);
  });
  if (msgs.length === 0) {
    container.querySelectorAll('.msg-s-event-listitem__body').forEach(el => {
      add(el.textContent?.trim(), detectSender(el) || "prospect");
    });
  }
}
return msgs;
}

function getDebugInfo(platformId, container) {
  const lines = [
    "Platform: " + platformId,
    "URL: " + location.pathname,
    "Title: " + document.title,
    "Container: " + (!container ? "none found (try scrolling into the conversation, or use Paste fallback)" : container.tagName + "." + container.className?.toString().slice(0, 40)),
    ];
  if (container) {
    const checks = ['[data-e2e="dm-new-chat-item"]', '[data-e2e="dm-new-message-text"]', '[data-e2e="chat-message"]', '[role="row"]', '[role="listitem"]', '[dir="auto"]', '[data-testid="messageEntry"]'];
    checks.forEach(sel => {
      const n = container.querySelectorAll(sel).length;
      if (n > 0) lines.push("Found " + n + "x " + sel);
    });
  }
  return lines.join("\n");
}

function getProspectHandle(platformId) {
  if (platformId === "instagram") {
    const pane = document.querySelector('[role="navigation"][aria-label="Thread list"] + div') || document.querySelector('[role="main"]');
    const link = pane?.querySelector('a[href*="instagram.com/"]');
    if (link) {
      const m = link.href.match(/instagram\.com\/([^/?#]+)/);
      if (m && !["direct","p","explore","reel"].includes(m[1])) return m[1];
    }
    return null;
  }
  if (platformId === "tiktok") {
    const el = document.querySelector('[data-e2e="chat-uniqueid"]');
    const t = el?.textContent?.trim();
    return t ? t.replace(/^@/, "") : null;
  }
  if (platformId === "twitter") {
    const link = document.querySelector('[data-testid="conversation-info-header"] a');
    if (link) {
      const m = link.href.match(/(?:twitter|x)\.com\/([^/?#]+)/);
      if (m && !["messages","i","home"].includes(m[1])) return m[1];
    }
    return null;
  }
  if (platformId === "linkedin") {
    const link = document.querySelector('.msg-thread__link-to-profile, .msg-entity-lockup a[href*="/in/"]');
    if (link?.href) {
      const m = link.href.match(/linkedin\.com\/in\/([^/?#]+)/);
      return m ? m[1] : null;
    }
    return null;
  }
  if (platformId === "facebook") {
    const link = document.querySelector('[aria-label*="conversation"] a[href*="facebook.com/"]');
    if (link?.href) {
      const m = link.href.match(/facebook\.com\/([^/?#]+)/);
      if (m && !["messages","profile.php"].includes(m[1])) return m[1];
    }
    return null;
  }
  return null;
}

function scrape() {
  const platform = getCurrentPlatform();
  const platformId = platform?.id || "unknown";
  const name = getProspectName(platformId);
  const handle = getProspectHandle(platformId);
  const container = getChatContainer(platformId);
  const msgs = extractMessages(container, platformId);
  const lines = msgs.map(m => (m.sender === "setter" ? "You" : (name || "Prospect")) + ": " + m.content);
  const debug = msgs.length === 0 ? getDebugInfo(platformId, container) : null;
  return { platformId, platformName: platform?.name || "Unknown", name, handle, msgs, lines, debug };
}
