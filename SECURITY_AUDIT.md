# Security Audit — dm-setter-os

**Scope:** React/Vite frontend, Supabase Edge Functions + Postgres backend, Chrome MV3 extension.
**Method:** Direct review of source, git history, and migrations (not automated scanning). Every finding below was independently verified by reading the actual code/SQL/git log — not just taken at face value from a first pass.
**Status:** All fixes described below have been implemented in this working tree.

---

## Summary

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | Undisclosed third-party AI data sharing | High | Fixed — README updated |
| 2 | Wildcard CORS on all Edge Functions | High | Fixed — origin allowlist |
| 3 | No rate limiting on Edge Functions | Medium | Fixed — DB-backed limiter |
| 4 | No sender validation on extension messaging | Medium | Fixed — `sender.id` guard |
| 5 | Prompt-injection surface (no delimiters) | Medium | Fixed — delimiters + truncation |
| 6 | No aggregate payload size cap (extension) | Medium | Fixed — 50KB cap |
| 7 | `.env` tracked in git, not gitignored | Low | Fixed — untracked, gitignored |
| 8 | RLS policy review | Informational | Verified correct, no fix needed |
| 9 | Edge Function JWT auth review | Informational | Verified correct, no fix needed |
| 10 | Dependency vulnerabilities (`npm audit`) | High/Critical → Low | Fixed — 18 of 20 resolved |
| 11 | Local dev helper scripts (`api.cjs`, `proxy.cjs/js`) | Informational | No action needed |
| 12 | Missing HTTP security headers on the deployed web app | Medium | Fixed — `vercel.json` headers |

---

## High Severity

### 1. Undisclosed third-party AI data sharing
**Where:** `analyze-stage`, `daily-briefing`, `extension-analyze`, `score-conversation`, `suggest-replies`, `training-chat` (all in `supabase/functions/`) send conversation/prospect text to OpenRouter (→ OpenAI models). `README.md` never disclosed this.
**Fix applied:** Added a "Privacy & Data Handling" section to `README.md` covering what's stored in Supabase, that conversation content is sent to OpenRouter for AI analysis, that AI suggestions are never auto-sent, and retention/cascade-delete behavior.

### 2. Wildcard CORS on every Edge Function
**Where:** All 8 functions under `supabase/functions/*/index.ts` previously set `Access-Control-Allow-Origin: "*"`.
**Risk:** Low-to-moderate in practice — auth uses a Bearer token (not cookies), so there's no ambient-credential CSRF; a malicious origin still can't read the victim's token to forge an authenticated request. Still a hardening gap worth closing.
**Fix applied:** New `supabase/functions/_shared/cors.ts` exports `buildCorsHeaders(origin)`, which allows only `https://dm-wingman-pro.vercel.app`, `chrome-extension://*` origins, and localhost dev origins (falls back to the app origin otherwise, so disallowed origins get a response the browser will block). Wired into all 8 functions in place of the static `*` header, computed per-request from `req.headers.get("origin")`.

### 10. Dependency vulnerabilities
**Where:** `package.json` / `package-lock.json`. `node_modules` was not installed; `npm audit` after `npm install` reported **20 vulnerabilities (1 low, 6 moderate, 12 high, 1 critical)**, including a critical Vitest UI arbitrary-file-read advisory and a high-severity React Router XSS-via-open-redirect advisory (a real runtime dependency, not just tooling).
**Fix applied:** Ran `npm audit fix` (non-breaking). **18 of 20 vulnerabilities resolved**, including the critical Vitest issue and the React Router issue.
**Remaining (flagged, not force-fixed):** 1 advisory (`esbuild` ≤0.24.2, moderate — dev-server-only request-forwarding issue, GHSA-67mh-4wv8-2f99) requires bumping `vite` to v8, a breaking major-version change from the current v5. Not applied automatically — recommend testing a Vite 8 upgrade in a separate PR since it can affect the build config and plugin compatibility. This only affects `npm run dev`, not the production build.
**Verification:** `npm run lint` (no new errors — confirmed against a stashed baseline, both before and after were 88 errors/11 warnings), `npm run test` (1/1 passing), `npm run build` (succeeds) all still pass after the dependency updates.

---

## Medium Severity

### 3. No rate limiting on Edge Functions
**Where:** All 8 functions only passed through OpenRouter's own 429 responses — no per-user app-level throttling existed.
**Risk:** A signed-in user (or a leaked token) could spam AI-backed endpoints, running up OpenRouter costs with no app-side cap.
**Fix applied:**
- New migration `supabase/migrations/20260627150000_898c9b4e-9e6e-4c20-82b9-e760d422bca6.sql` creates `rate_limit_events` (`user_id`, `fn_name`, `created_at`). RLS is enabled with **zero** client-facing policies — by design, this means only the service-role key (used inside Edge Functions) can read/write it; any anon or authenticated client request is denied by default.
- New `supabase/functions/_shared/rateLimit.ts`: `checkRateLimit(userId, fnName, limit=20, windowSeconds=60)` counts recent rows and inserts one per call, with best-effort cleanup of stale rows.
- Wired into all 8 functions immediately after the auth check, returning HTTP 429 via `rateLimited()` if exceeded. `send-message` uses a slightly higher cap (30/min) since it's not an AI call.

### 4. No sender validation on extension message passing
**Where:** `extension/background.js:348` and `extension/panel.js:791` (`chrome.runtime.onMessage.addListener`) accepted any message without checking who sent it.
**Risk reassessment:** Initially flagged as critical, but verified `manifest.json` has no `externally_connectable` entry, so arbitrary web pages cannot reach these listeners today — only this extension's own content scripts/pages can message it via the standard `chrome.runtime.sendMessage` channel. Real exploitability is low today, but the gap was still worth closing as defense-in-depth (protects against future refactors, e.g. if `externally_connectable` is ever added, or against a compromised content-script execution context).
**Fix applied:** Added `if (sender.id !== chrome.runtime.id) return;` guards at the top of both listeners.

### 5. Prompt-injection surface
**Where:** `analyze-stage`, `score-conversation`, `suggest-replies`, `extension-analyze`, `daily-briefing` interpolated raw DM/prospect text directly into AI prompts with no delimiter separating "data" from "instructions."
**Mitigating factor (verified directly):** `src/components/inbox/AIReplyPanel.tsx:29` shows the UI explicitly states "Never auto-sent" — every AI suggestion requires a manual click before `send-message` is invoked. A manipulated AI suggestion cannot autonomously message a prospect; a human always reviews it first. This caps the impact at "could mislead the human operator," not "could trigger an unauthorized action."
**Fix applied:** Wrapped all interpolated DM/prospect/performance content in explicit `--- BEGIN UNTRUSTED CONVERSATION CONTENT ---` / `--- END ... ---` markers, with an instruction in the system prompt to treat content inside those markers strictly as data, never as instructions. Also added consistent truncation (last ~60 messages, ~1000 chars each) to the functions that didn't already have it (`analyze-stage`, `score-conversation`, `suggest-replies`, `daily-briefing`'s concern strings) — `extension-analyze` already truncated correctly.
**Not changed:** `training-chat` was intentionally left alone — its interpolated content (`scenario`, `offer`, `icp`) is the user's own business profile, not third-party DM content, and the actual roleplay conversation is passed as natively role-separated chat messages (not string-interpolated into one prompt blob), so the injection vector doesn't apply there the same way.

### 6. No aggregate payload size cap (extension)
**Where:** `extension/panel.js` built the `ANALYZE_CONVERSATION` payload with per-message truncation (600 chars, in `scraper.js`) but no cap on the total payload size before sending to the backend.
**Fix applied:** Added a check before `sendBg("ANALYZE_CONVERSATION", ...)` — if the stringified payload exceeds 50KB, it retries with only the last 60 messages, and if still too large, shows an error instead of sending.
**Bonus:** Also added a 4000-character server-side cap on outbound message content in `send-message/index.ts` (input length validation that was previously absent on that endpoint).

### 12. Missing HTTP security headers on the deployed web app
**Where:** A live header scan of `https://dm-wingman-pro.vercel.app/app` found no `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy`, and flagged `Access-Control-Allow-Origin: *` on the page response as too broad (graded D).
**Risk:** Missing `X-Frame-Options`/CSP `frame-ancestors` leaves the app clickjacking-able; missing `X-Content-Type-Options` allows MIME-sniffing; no CSP means any injected script (e.g. via a future XSS bug) runs with no containment; `Access-Control-Allow-Origin: *` on page responses lets any origin read the page cross-origin.
**Fix applied:** `vercel.json` now defines a `headers` block applied to all routes (`/(.*)`) alongside the existing SPA `rewrites`:
- `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- `Content-Security-Policy` restricted to `default-src 'self'`, with `connect-src` scoped to `'self'` + Supabase (REST + Realtime over `wss`). Verified safe against the actual app: `index.html` loads only a same-origin module script with no inline `<script>` tags, and no third-party scripts (PostHog/Clarity env vars exist in `.env.example` but aren't wired into `src/` yet) — so the CSP won't break anything currently shipped. If PostHog/Clarity/Google Sign-In are wired up later, their domains will need to be added to `connect-src`/`script-src`.
- `Access-Control-Allow-Origin` explicitly set to `https://dm-wingman-pro.vercel.app` instead of the platform-default `*`, since the app's own pages never need to be read cross-origin by another site.

---

## Low Severity

### 7. `.env` tracked in git, not gitignored
**Verified directly:** across all of git history, `.env` only ever contained `VITE_SUPABASE_URL`, `VITE_SUPABASE_PROJECT_ID`, and `VITE_SUPABASE_PUBLISHABLE_KEY` — never `SUPABASE_SERVICE_ROLE_KEY` or any AI provider key. Supabase's "publishable" key is explicitly designed to be public client-side (same threat model as a Stripe publishable key), and RLS is correctly enforced (see #8), so **there is no live secret exposure and no key rotation is needed.** Still, tracking `.env` in git is sloppy practice the project's own `.env.example` explicitly warns against ("never put service-role keys or private secrets here").
**Fix applied:** Added `.env` to `.gitignore` and ran `git rm --cached .env` (the local file is untouched; it just stops being tracked going forward).

---

## Verified Correct — No Fix Needed

### 8. Row Level Security (RLS)
Every table across all migrations — `profiles`, `offer_profiles`, `prospects`, `messages`, `daily_kpis`, `connected_accounts`, `timeline_events`, `icp_profiles`, `objection_entries`, `faq_entries`, `scripts`, `win_loss_logs`, `training_attempts`, `conversation_examples`, `prospect_memory` — has `ENABLE ROW LEVEL SECURITY` plus an owner-scoped policy (`auth.uid() = user_id`).

Critically, also verified that the original overly-permissive `USING (true)` policies from the first migration (`20260308202733`) were properly removed (`DROP POLICY IF EXISTS ...`) before the owner-scoped replacements were created in `20260613201933`. This matters because Postgres OR's multiple policies on the same table together — a leftover permissive policy would have silently defeated the later fix. No leftover policy was found.

### 9. Edge Function authentication
All 8 functions verify the caller's JWT before doing any work — via the shared `getAuthUser()` helper (`supabase/functions/_shared/auth.ts`) or an equivalent inline check in `training-chat`/`extension-context` — including the 4 functions with `verify_jwt = false` set in `supabase/config.toml` (that flag only disables the *platform-level* check; the manual check in code is the real gate). `send-message` and `score-conversation` additionally re-verify resource ownership (`prospect.user_id !== user.id`) since they use the service-role key, which bypasses RLS — that manual check is the actual authorization boundary for those two functions.

### 11. Local dev helper scripts
`api.cjs`, `proxy.cjs`, `proxy.js` at the repo root bind to `127.0.0.1` only, aren't part of the deployed app, and don't hardcode any secrets. No action needed.

---

## Files Changed

- `.gitignore`, `README.md`
- `extension/background.js`, `extension/panel.js`
- `supabase/functions/_shared/cors.ts` (new), `supabase/functions/_shared/rateLimit.ts` (new)
- `supabase/functions/{analyze-stage,daily-briefing,extension-analyze,extension-context,score-conversation,send-message,suggest-replies,training-chat}/index.ts`
- `supabase/migrations/20260627150000_898c9b4e-9e6e-4c20-82b9-e760d422bca6.sql` (new)
- `vercel.json`
- `package-lock.json` (via `npm audit fix`)
- `.env` untracked from git (local file unchanged)

## What Was Not Done

- **No keys were rotated.** Verified unnecessary — no service-role key or AI provider key was ever exposed.
- **Nothing was pushed.** All fixes were committed locally at the user's request; pushing to the remote is a separate step.
- **Vite major-version upgrade** (to clear the last `npm audit` advisory) was not performed — flagged for a separate, tested PR since it's a breaking change.
- **Live Supabase dashboard was not checked** — this audit reviewed the migration files that define RLS policies and assumed they've been applied to the live project (the project ID in `supabase/config.toml` matches the one embedded in `src/integrations/supabase/client.ts`, consistent with that). If you have dashboard access, it's worth a quick confirmation under Database → Policies.
