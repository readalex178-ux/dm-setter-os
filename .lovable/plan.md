
Goal: make the Chrome extension ZIP easy to find and reliably downloadable.

What I found
- The ZIP file does exist at `public/dm-setter-os-extension.zip`.
- The download page exists at `/app/extension`.
- The button already uses the safer `fetch(...).blob()` download pattern in `src/pages/ExtensionPage.tsx`.
- But the Extension page is not linked from the sidebar or mobile “More” menu, so from `/app` it is easy to feel like there is no file to download.
- The session snapshot shows scrolling only and no actual click/download request, which suggests the main issue may be “I can’t get to it / nothing obvious is happening,” not that the ZIP is missing.

Likely reason you can’t download it
1. Discoverability issue: there is no navigation link to the Extension page.
2. Weak error UX: if the download fails or is blocked, the page only shows a browser `alert`, so there is no clear recovery path.
3. Preview-only context: the app is not published yet, so download behavior can be less obvious depending on browser/device.

Implementation plan
1. Add “Chrome Extension” to navigation
- Add it to `src/components/AppSidebar.tsx`
- Add it to the mobile “More” menu in `src/components/BottomNav.tsx`

2. Improve the download experience on `src/pages/ExtensionPage.tsx`
- Keep the existing fetch+blob approach
- Add visible loading/success/error states instead of only `alert(...)`
- Show the exact file name users are downloading
- Add a fallback link/button such as “Open ZIP directly” for browsers that block programmatic downloads
- Add a short troubleshooting note: if the file does not start downloading, open the page in desktop Chrome/Edge/Brave and try the fallback link

3. Make the page self-explanatory
- Add a sentence near the button explaining that the ZIP is for private local install via `chrome://extensions`
- Clarify that publishing to the Chrome Web Store is not required for personal use

4. Verify the flow end-to-end
- Open `/app/extension`
- Click download and confirm the ZIP request returns successfully
- Confirm the fallback link works
- Confirm the flow is visible on both desktop and mobile layouts

Technical details
- Files to update:
  - `src/components/AppSidebar.tsx`
  - `src/components/BottomNav.tsx`
  - `src/pages/ExtensionPage.tsx`
- No backend/database changes needed
- No changes needed to the ZIP file itself unless you want a re-packaged version after updating extension contents later

Expected result
- You’ll be able to reach the Extension page from the app navigation
- The page will clearly show whether the download started, failed, or needs a fallback
- The private “download ZIP and load unpacked in Chrome” flow will be much easier to use
