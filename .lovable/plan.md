# DM Setter OS — Audit & Improvement Plan

## Executive Summary
The app's foundation is genuinely strong: auth, RLS, secured edge functions, the Offer Profile system, the AI suggest/analyze/training functions, and the Chrome extension sync are all real and working. The problem is that **most of the user-facing pages are demo shells** — they render hardcoded fake data from `src/data/` and never touch the database. A real setter signing in on Day 1 sees fabricated prospects, fake KPIs, fake coaching reviews, and a fake profile. The backend is ready; the front end is not wired to it.

This plan turns the demo into a real operating system, in priority order.

---

## Application Audit Summary (actual state)

### Real / working
- **Auth + RLS** — `/auth`, `ProtectedRoute`, owner-scoped policies, secured edge functions (JWT + ownership checks).
- **My Offer** (`OfferPage.tsx`) — real CRUD against `offer_profiles`; injected into all AI functions via `_shared/offer.ts`.
- **Inbox** (`InboxPage.tsx`) — reads real `prospects`/`messages` but **falls back to demo data**, so real users still see fakes until rows exist.
- **Training** (`TrainingPage.tsx`) — real AI roleplay, but scenarios are hardcoded (`demoTrainingScenarios`).
- **Edge functions + extension** — real Meta/HubSpot OAuth/sync, `extension-ai`, cloud sync.

### Demo shells (no DB — fabricated data)
- **Dashboard** — `dashboardStats`, `demoProspects`, `demoKPIs` (line 7-8). Quick-add does nothing real.
- **KPI Tracker** — `demoKPIs` only; "Log" form doesn't persist (`daily_kpis` table is empty/unused).
- **Analytics** — 100% hardcoded chart arrays (lines 9-36).
- **Pipeline** — `demoProspects`; no DB, no real stage moves/drag.
- **Prospects** — `demoProspects` + `demoTimeline`.
- **Scripts Library** — `demoScripts`; favorites are local-only, no DB, no create/edit.
- **Coaching** — hardcoded review objects; no link to real training/conversations.
- **Settings** — hardcoded "Alex Morgan / alex@dmsetter.co"; nothing saves.

### Critical weaknesses
1. **Data integrity** — 8 of 13 pages show fake data to authenticated users. This is the #1 issue; everything downstream (KPIs, analytics, coaching) is fiction.
2. **No write-back loop** — sending/booking/qualifying doesn't update KPIs or analytics, so metrics can never be real.
3. **No knowledge base** — the offer system exists, but no ICP Bible, Objection Bible, FAQ, Scripts-in-DB, or Wins/Losses store. These are core setter assets.
4. **Onboarding gap** — no guided Day-1 setup (offer → ICP → KPI goals → connect platform), so a new setter doesn't know where to start.

---

## Improvement Plan (phased — approve all or pick a phase)

### Phase 1 — Make the data real (Critical)
Wire the demo pages to the database and add a clean empty state everywhere.
- **Dashboard**: compute stats from real `prospects`/`messages`/`daily_kpis`; real quick-add inserts a prospect; empty state with onboarding CTA when DB is empty.
- **Pipeline**: load real `prospects`, group by `stage`, allow stage changes that persist (write to `prospects.stage` + `timeline_events`).
- **Prospects**: real list + real `timeline_events`; editable notes/fields.
- **Inbox**: default to real data, remove the demo fallback (keep a real empty state).
- **Settings**: load/save `profiles` (name, prefs); remove hardcoded identity.
- Move all `src/data/*` demo content behind a single "Load sample data" dev toggle so it's never shown to real users by accident.

### Phase 2 — Real KPI + Analytics loop (High impact)
- Make **KPI Tracker** persist to `daily_kpis` (manual log + auto-increment from real sends/bookings via edge functions).
- Add a `kpi_goals` concept (daily/weekly targets) the setter sets once.
- Rewrite **Analytics** to query real data: stage funnel, objection breakdown (from `analyze-stage`), weekly conversations vs. booked, show rate.
- Add benchmark bands (Poor / Average / Good / Elite) and "corrective action" hints when a metric drops.

### Phase 3 — Knowledge Base system (High impact)
New tables (with GRANTs + owner RLS) and pages, all injected into AI prompts like the Offer is:
- **ICP Bible** — demographics, goals, pains, buying triggers, language patterns.
- **Objection Bible** — objection → framework → example response (price/time/trust/partner/thinking/bad-experience/not-interested).
- **FAQ Database** — common questions + approved answers.
- **Scripts Library** → move to DB (CRUD, categories, favorites, AI-personalize using offer+ICP).
- **Wins & Losses** — logged outcomes with lessons; feeds coaching.
Extend `_shared/offer.ts` → a `loadContext()` that bundles offer + ICP + objections + FAQ into every AI call so suggestions are fully grounded.

### Phase 4 — Coaching + Training upgrades (Medium impact)
- **Coaching**: replace hardcoded reviews with real training-session grades + real conversation reviews stored in DB; trend over time.
- **Training**: store scenarios in DB, generate scenarios from the setter's actual ICP/objections, save attempt history + scores.

### Phase 5 — Onboarding + Day-1 readiness (Medium impact)
- Guided first-run checklist: set Offer → ICP → KPI goals → connect a platform/extension → first AI suggestion.
- **Day-1 Readiness Score** widget on Dashboard (pass/fail across offer, ICP, objections, CRM, tracking, scripts).

### Phase 6 — Nice-to-have / roadmap
- LinkedIn support in the extension (manifest currently covers IG/TikTok/X/FB/Messenger only — no LinkedIn).
- Follow-up/no-show/reschedule reminders and re-engagement queue.
- Team/agency view (multi-setter rollups) — future, requires roles table.
- Leaked-password (HIBP) protection on signup.

---

## Prioritised Backlog (top items)
| Pri | Item | Setter impact | Effort |
|-----|------|---------------|--------|
| P0 | Wire Dashboard/Pipeline/Prospects/Inbox/Settings to DB + empty states | Stops fiction; app becomes usable | M |
| P0 | Persist + auto-increment KPIs; real Analytics | Real performance visibility | M |
| P1 | Knowledge Base (ICP/Objection/FAQ/Scripts/Wins-Losses) + AI injection | Day-1 grounding, better replies | L |
| P1 | Real Coaching from real sessions | Real improvement loop | M |
| P2 | Onboarding checklist + Day-1 Readiness Score | Fast ramp, no confusion | M |
| P3 | LinkedIn extension, reminders, team view, HIBP | Scale + safety | L |

## Day-1 Readiness Score (today): ~3/10
Strong backend, but a setter can't track real work, see real metrics, or rely on knowledge assets yet.

---

## Recommended start
Begin with **Phase 1 + Phase 2** in one pass (real data + real KPI/analytics loop) — this is the highest ROI and unblocks everything else. Then Phase 3 (knowledge base) to maximize AI quality. Tell me if you'd rather start with the knowledge base (Phase 3) instead.
