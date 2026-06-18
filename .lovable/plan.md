# Rebuild the DM Setter OS Chrome Extension (v4)

The `extension/` source is already at **v4.0.0** (see `extension/manifest.json`), but the distributed package and the in-app version labels are stale. The actual extension files were never re-zipped, so users still download an old build.

## What's wrong now
- `public/dm-setter-os-extension.zip` is an outdated package — it does not reflect the current `extension/` source.
- `src/pages/ExtensionPage.tsx` still shows `v2.0.0` and says "No API keys needed".

## Changes

### 1. Verify and repackage the extension
- Confirm the `extension/` folder is complete and consistent: `manifest.json`, `background.js`, `platform.js`, `scraper.js`, `panel.js`, `panel.css`, `popup.html`, `popup.css`, `popup.js`, and icons (`icon.png`, `icon128.png`).
- Fix one consistency bug: `manifest.json` only declares `platform.js`, `scraper.js`, `panel.js` as content scripts, while `scraper.js` already defines its own `getCurrentPlatform()`. `platform.js` is redundant/duplicative — confirm load order does not cause a redeclaration error, and align the two so only one source of truth for platform detection remains.
- Regenerate the ZIP from the current source:
  ```text
  rm -f public/dm-setter-os-extension.zip
  cd extension && nix run nixpkgs#zip -- -r ../public/dm-setter-os-extension.zip .
  ```

### 2. Update the Extension page labels (`src/pages/ExtensionPage.tsx`)
- Change the version line from `v2.0.0` to `v4.0.0`.
- Keep messaging accurate to the v4 "lightweight companion" architecture (extract → analyse via Cloud → sync), which the feature cards already describe.

## Out of scope
- No changes to extension business logic, edge functions, or backend — v4 architecture stays as-is. This is purely a repackage + label sync so the download matches the current source.

## Acceptance
- Downloaded ZIP loads cleanly in `chrome://extensions` as **DM Setter OS v4.0.0**.
- No duplicate-declaration console errors from content scripts.
- Extension page shows v4.0.0.