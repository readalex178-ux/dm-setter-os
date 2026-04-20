// platform.js — detect which platform we're on

const PLATFORMS = {
  "www.instagram.com": { id: "instagram", name: "Instagram", emoji: "📸", dmPath: /\/direct\// },
  "www.tiktok.com":    { id: "tiktok",    name: "TikTok",    emoji: "🎵", dmPath: /\/messages/ },
  "tiktok.com":        { id: "tiktok",    name: "TikTok",    emoji: "🎵", dmPath: /\/messages/ },
  "twitter.com":       { id: "twitter",   name: "Twitter/X", emoji: "𝕏",  dmPath: /\/messages/ },
  "x.com":             { id: "twitter",   name: "Twitter/X", emoji: "𝕏",  dmPath: /\/messages/ },
  "www.facebook.com":  { id: "facebook",  name: "Facebook",  emoji: "👤", dmPath: /\/messages/ },
  "www.messenger.com": { id: "facebook",  name: "Messenger", emoji: "💬", dmPath: /.*/ },
};

function getCurrentPlatform() {
  return PLATFORMS[location.hostname] || null;
}

function isOnDMPage() {
  const p = getCurrentPlatform();
  if (!p) return false;
  return p.dmPath.test(location.pathname);
}
