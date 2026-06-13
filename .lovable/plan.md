# DM Setter OS — Improvements + "Offer Profile" Feature

This plan fixes the structural gaps found in the audit and adds the new feature: an **Offer Profile** you fill in once (what you're actually selling), which the AI then uses in every reply suggestion, stage analysis, and training session.

---

## 🔴 Root problems found (why things feel broken)

1. **No login exists, but the database requires it.** Every table has Row-Level Security limited to authenticated users. With no login, the app reads as an anonymous user, gets blocked, and silently shows hardcoded **demo data**. This is why you "can't see real names and messages."
2. **App and extension use two different backends.** The app uses Lovable Cloud; the extension saves to `http://localhost:8080` (a local-only database that only exists while running `npm run dev`). So captured conversations never reach the app.
3. **The extension already has working Cloud-sync code that is never called** — its save path ignores it and posts to localhost instead.
4. **The database is empty** (0 prospects/messages), so demo mode is all you ever see.
5. **AI in the extension requires you to paste a Groq API key**, instead of using the free Lovable AI the app already uses.

---

## ✅ What I'll build

### Part A — Authentication (makes real data visible)
- Add a `/auth` page: email/password + Google sign-in, with sign-up and sign-out.
- Add a session guard so `/app/*` requires login; redirect to `/auth` when logged out.
- Add a `profiles` table (auto-created on signup) for display name/avatar.
- Add `user_id` ownership to `prospects`, `messages`, `daily_kpis`, `connected_accounts`, `timeline_events`, and tighten RLS so each setter sees only their own data.
- Result: once you log in and data exists, the inbox shows real prospects instead of demo data.

### Part B — New feature: Offer Profile (the "what am I selling" brain)
- New table `offer_profiles` (one per user) with fields:
  - Offer name, what it is / how it works, who it's for (ideal client)
  - Price / payment options, the core promise / outcome
  - Key value props (list), proof/results, guarantee
  - Common objections + your preferred responses (list)
  - Tone/voice preference (e.g. casual, direct, premium)
  - Call-to-action goal (e.g. "book a 15-min call")
- New **Offer** page (under settings/nav) to create and edit this profile, with a live "this is what the AI will use" preview.
- Wire the offer into every AI call: the `suggest-replies`, `analyze-stage`, and `training-chat` edge functions will load the logged-in user's offer profile and inject it into the system prompt, so suggestions, scoring, and roleplay all reference your real offer, price, and objection handling.
- Falls back gracefully to generic coaching if no offer profile is set yet.
- Honors your core rule: AI still only **suggests** — you approve/send every message.

### Part C — Connect the extension to the same Cloud backend
- Rewire the extension's save flow to use its existing Supabase code (authenticated upserts to `prospects`/`messages`), removing the `localhost:8080` dependency.
- Have the extension sign in to the same Cloud project so its writes pass RLS and appear in the app.
- Switch extension AI calls to the `suggest-replies` / `analyze-stage` edge functions (free Lovable AI) instead of a pasted Groq key.
- Rebuild and re-zip the extension so the download matches the source.

### Part D — Cleanup / polish (the "missing or shouldn't be there" items)
- Remove (or clearly isolate as dev-only) the local SQLite + Anthropic/LM-Studio backend baked into `vite.config.ts` — it's a parallel backend that causes confusion.
- Simplify `InboxPage` so it has one clear data source (Cloud) with demo only as an explicit empty-state.
- Add proper empty states ("No prospects yet — install the extension or connect Meta") instead of silently showing demo data.
- Remove dead/duplicate files (`proxy.cjs`, `proxy.js`, `api.cjs`, `start-app.bat`) if unused after the localhost backend is removed.

---

## Suggested build order
1. **Part A (auth)** first — nothing real works without it.
2. **Part B (Offer Profile)** — the feature you asked for; high value, self-contained.
3. **Part C (extension wiring)** — so captured DMs flow into the app.
4. **Part D (cleanup)** — remove the confusing local-only backend.

---

## Technical notes
- Auth defaults: email/password + Google (I'll configure the Google provider in the same step to avoid first-login errors).
- New tables: `profiles`, `offer_profiles`; ownership columns + owner-scoped RLS on existing tables; GRANTs included in each migration.
- Edge functions `suggest-replies`, `analyze-stage`, `training-chat` updated to fetch the caller's `offer_profiles` row and inject it into the prompt.
- All AI stays server-side via Lovable AI; no user API keys required.

---

**One quick question before I start:** for the Offer Profile, do you want a **single offer** (simplest) or the ability to save **multiple offers** and pick which one is active per prospect? I recommend starting with a single offer and adding multiple later. Say "go" and I'll build it in the order above.
