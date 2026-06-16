# Chrome Extension — Full Rebuild (Thin Interface Layer)

## Goal
Rebuild the extension so it is a pure interface: it extracts conversations, calls DM Setter OS, and renders results. All intelligence stays server-side. UI matches the DM Setter OS design system exactly, with a safe error state whenever the OS is unreachable.

## What stays vs changes
- **Keep:** `background.js` session/token model, `scraper.js` extraction selectors, `popup.js` sign-in flow, `manifest.json` permissions and host list (already covers IG, FB/Messenger, LinkedIn, TikTok, X).
- **Rebuild:** the panel UI + flow (`panel.js`, `panel.css`) to a strict 4-panel layout matched to the app design system, plus a connection/error state machine.
- **Add:** a backend prospect-context endpoint so the extension can pull history/objections/approach on chat open.

## Architecture (single connected system)
```text
Social platform DOM
  -> scraper.js (extract only: name, handle, messages, sender)
  -> panel.js  (UI render only)
  -> background.js (auth + REST/edge bridge)
  -> DM Setter OS edge functions (ALL intelligence)
        - extension-analyze   (score, stage, objections, next action, replies)
        - extension-context    (NEW: prior history summary + approach)
  -> structured JSON back to panel.js -> render
```
If any OS call fails or the user is signed out, the panel enters a **safe error state**: no cached intelligence is shown as fresh, a clear status banner appears, and action buttons disable.

## Backend changes
1. **New edge function `extension-context`** (`supabase/functions/extension-context/index.ts`)
   - Auth-gated (reuse `_shared/auth.ts`). Input: `{ platform, name, handle }`.
   - Looks up an existing prospect for this `user_id` (match by handle, then name). Returns:
     `{ found, prospect: { name, stage, conversation_score, booking_probability, lead_temperature, suggested_action }, history_summary, objections, prospect_memory[], recommended_approach }`.
   - Pulls recent `messages`, `prospect_memory`, and `concerns`; summarises via Lovable AI (`google/gemini-3-flash-preview`) using `loadContext` for offer/ICP grounding. Returns empty/`found:false` cleanly for brand-new prospects.
2. **`extension-analyze`** — unchanged contract; reused as the analysis engine.
3. **`background.js`** — add `GET_CONTEXT` message type that calls `extension-context`; keep existing `ANALYZE_CONVERSATION`, `SAVE_CONVERSATION`, `VERIFY_SESSION`, `GET_RECENT`.

## Extension UI rebuild (matches DM Setter OS)
Rewrite `panel.css` to use the app tokens (no GitHub palette):
- Font `Inter` (headings/body) + `JetBrains Mono` for metric numbers.
- Dark surface `hsl(222 30% 7%)` bg, cards `hsl(222 25% 10%)`, border `hsl(222 18% 16%)`, primary cyan `hsl(186 100% 50%)`, success/warning/destructive matching `--success/--warning/--destructive`, radius `0.625rem`, same button styles (primary/ghost/sm) and card components as the app.

Rewrite `panel.js` into the required 4-panel layout:
- **Connection bar** — live status dot: Connected / Not signed in / OS unreachable (safe error).
- **Panel 1 — Prospect Overview:** name, platform, stage, score.
- **Panel 2 — AI Insights:** objections, intent/temperature + summary, recommended next action.
- **Panel 3 — Replies:** 3–5 suggestions with copy, regenerate (new OS call), and insert-into-message-box (writes into the platform composer where a target exists; copy fallback otherwise).
- **Panel 4 — CRM Actions:** save / sync, update stage (stage list sent to `extension-analyze`/save). Keep manual-paste fallback as a collapsed utility.

## Real-time behaviour (event-driven, no polling loops)
- On panel open and on detected **thread change** (URL/path change + header name change via a lightweight `MutationObserver` debounced ~800ms), the extension:
  1. extracts the conversation,
  2. calls `GET_CONTEXT` to hydrate Panels 1–2 instantly with stored history,
  3. leaves full Analyse/Replies as an explicit action (and a "re-analyse" on thread change) to control AI credit usage.
- Replace the current 2.5s `setInterval` preview scan with the observer-driven model to satisfy the "no continuous polling" rule.

## Safe error state rules
- Every OS call wrapped; on `401` -> "Sign in via popup"; on network/`5xx` -> "DM Setter OS unreachable — retry"; on `402`/`429` -> credit/rate messages. Action buttons disable while disconnected; no stale intelligence rendered as current.

## Packaging
- Repackage to `public/dm-setter-os-extension.zip` via `nix run nixpkgs#zip`. Bump `manifest.json` to `4.0.0`. Update `src/pages/ExtensionPage.tsx` feature copy to reflect the 4-panel layout + context hydration.

## Files
- New: `supabase/functions/extension-context/index.ts`
- Edit: `extension/panel.js`, `extension/panel.css`, `extension/background.js`, `extension/manifest.json`, `extension/popup.js` (insert-into-composer plumbing if needed), `public/dm-setter-os-extension.zip`, `src/pages/ExtensionPage.tsx`

## Out of scope
- No new AI/scoring logic inside the extension. No CRM logic in the extension. No changes to web-app intelligence beyond the new context endpoint.
