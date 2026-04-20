

## Fix: Chrome extension shows nothing after install

### Root cause
The downloadable ZIP at `public/dm-setter-os-extension.zip` is stale (built 9 days ago) and only contains 10 files. Chrome's manifest references `panel.js`, `panel.css`, `platform.js`, `scraper.js`, `ai.js`, and `icon.png` — none of which are in the ZIP. Result: extension loads with no content scripts, no UI, nothing happens on Instagram/TikTok/etc.

Additionally, two minor bugs in the source itself:
1. `manifest.json` lists `icon.png` for the toolbar icon, but only `icon128.png` exists in the `extension/` folder — the toolbar icon will be blank.
2. `content.js` (the older overlay) and `panel.js` are both injected and both build a UI — they conflict. `content.js` is dead code from the previous version and should not be in the manifest.

### Plan

**1. Clean up `extension/manifest.json`**
- Remove `content.js` from `content_scripts.js` (panel.js is the real UI now)
- Remove `overlay.css` from `content_scripts.css` (replaced by panel.css, already listed)
- Fix icon paths: point `action.default_icon` and top-level `icons` to `icon128.png` (the file that actually exists), or copy `icon128.png` → `icon.png`. We'll standardize on `icon128.png`.

**2. Rebuild the ZIP from the current `extension/` folder**
Run:
```bash
rm -f /dev-server/public/dm-setter-os-extension.zip
cd /dev-server/extension && nix run nixpkgs#zip -- -r /dev-server/public/dm-setter-os-extension.zip .
```
This produces a fresh ZIP containing all 14 current files (manifest, popup.*, panel.*, platform.js, scraper.js, ai.js, background.js, storage.js, supabase-config.js, icon128.png, etc.).

**3. Bump the version** in `manifest.json` to `1.0.1` so users can tell the new build apart from the broken one already loaded in their browser.

**4. Update `ExtensionPage.tsx`** with a small re-install reminder note: "If you already installed an earlier version, remove it from `chrome://extensions` first, then load the new unzipped folder."

### What the user does after the fix
1. Click **Download Extension** again on the Extension page → gets the fresh ZIP.
2. Go to `chrome://extensions`, remove the old "DM Setter OS" entry.
3. Unzip the new file and **Load unpacked** the folder.
4. Open Instagram/TikTok DMs → the side panel slides in, or click the toolbar icon → popup works.

### Files to change
- `extension/manifest.json` — drop `content.js`/`overlay.css`, fix icon paths, bump version
- `public/dm-setter-os-extension.zip` — regenerated from `extension/`
- `src/pages/ExtensionPage.tsx` — add a "remove old version first" note

No database, edge function, or app-side functional changes required.

