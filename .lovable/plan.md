# DM Wingman Pro — Audit & Refactor Plan

## Audit Report (current real state)

The platform is more complete than it looks. Most pages are already wired to real Supabase data (`useSetterData`, `useKnowledge`, `useReadiness`). Only `InboxPage` and `TrainingPage` still import demo seeds (used as fallback/scenario lists). All 12 edge functions are real and route AI through the Lovable gateway. The problems are structural and product-depth, not missing features.

### Critical issues
- `InboxPage.tsx` is **839 lines** — unmaintainable, the single biggest debt.
- **No code-splitting**: every page is statically imported in `App.tsx`, so the whole app ships in one bundle.
- **No error boundaries**: one render error white-screens the entire app.
- **`new QueryClient()` with zero config** — no `staleTime`, retries, or refetch policy; causes duplicate requests and refetch storms.
- **DB indexing gaps**: no index on `prospects.user_id`, `prospects.stage`, `prospects.last_contact_at`, `messages.user_id`, `daily_kpis(user_id,date)`. Every list query is a full scan per user.

### High priority
- Inbox modularization; lazy routes + Suspense; error boundaries; React Query defaults; DB indexes.
- AI coach layer: conversation scoring, stage detection w/ confidence + manual override, conversation review mode, prospect memory.

### Medium priority
- Sidebar grouping (CRM / AI / Performance / System).
- Empty states already exist via `EmptyState` — extend to remaining pages.
- Dashboard "focus first" reorg.
- `.env.example` + startup env validation.

### Low priority (defer)
- White-label, agency, team leaderboards, billing — explicitly out of scope per brief.

### Security findings
- RLS is correctly `auth.uid() = user_id` on all tables; `connected_accounts` tokens are service-role-only (good).
- `.env` is committed with publishable/anon keys only (safe), but no `.env.example` or missing-var validation.
- Will run the security scanner and enable leaked-password protection (already enabled in a prior phase — verify).

### Performance findings
- Missing indexes (above). Default QueryClient. No lazy loading. Inbox re-renders whole tree on each keystroke.

### UX findings
- Flat 15-item sidebar; no logical grouping. Dashboard mixes setup, briefing, KPIs without a clear "what now". Some pages lack empty states.

### AI recommendations
- Move from reply-only to a scoring + coaching assistant grounded in the existing knowledge base (`loadContext`).

### Commercial readiness
- Schema is already multi-tenant (`user_id` everywhere) — SaaS-ready foundation. Defer roles/teams/billing until core is polished, but keep all new tables `user_id`-scoped so multi-user is a later additive step.

---

## Implementation Plan (priority order)

### Phase 1 — Architecture
1. **Inbox refactor** — split `InboxPage.tsx` into `src/components/inbox/`:
   `InboxLayout`, `ConversationList`, `ConversationView`, `ConversationHeader`, `AIReplyPanel`, `ProspectSidebar`, `ConversationInsights`, plus reuse existing `StageAnalysisDialog`. Move data/effects into a `useInbox` hook. No behavior change.
2. **Lazy routes** — convert page imports in `App.tsx` to `React.lazy` + a `<Suspense>` fallback spinner around `<Outlet/>`.
3. **Error boundaries** — add a reusable `ErrorBoundary` component wrapping Dashboard, Inbox, AI panels, Knowledge Base, Analytics with a friendly retry fallback.

### Phase 2 — Security & DB
4. **Migration: indexes** on `prospects(user_id)`, `prospects(stage)`, `prospects(last_contact_at)`, `messages(user_id)`, `messages(prospect_id, sent_at)`, `daily_kpis(user_id, date)`.
5. **`.env.example`** + a small `src/lib/env.ts` that validates required `VITE_` vars at startup and logs a clear warning if missing.
6. Run security scanner; fix any findings tied to new tables; confirm leaked-password protection on.

### Phase 3 — React Query
7. Configure `QueryClient` defaults: `staleTime` 60s, `gcTime` 5m, `retry` 1, `refetchOnWindowFocus` false, with sensible per-query overrides for realtime-backed inbox data.

### Phase 4 — UX
8. **Sidebar grouping** into CRM / AI / Performance / System using `SidebarGroup` sections.
9. **Dashboard reorg** to lead with an action panel: Follow-ups due, Hot leads, Active conversations, Booked, Conversion — answering "what should I focus on now?" Keep readiness/briefing below.
10. Add empty states to any page still missing them.

### Phase 5 — AI coach layer
11. **Migration**: add scoring fields to `prospects` (`conversation_score int`, `booking_probability int`, `lead_temperature text`, `stage_confidence int`, `stage_suggested text`) and a **`prospect_memory`** table (`prospect_id`, `user_id`, `category` [goal/pain/budget/family/availability/objection/interest], `detail`, `source`, timestamps) with RLS + grants.
12. **Edge function `score-conversation`** — returns Conversation Score, Booking Probability, Lead Temperature, Stage + confidence, Suggested Action; grounded via `loadContext`. Surface in `ConversationInsights`.
13. **Stage detection** — extend `analyze-stage` output into the inbox header with confidence and a manual-override dropdown that writes `stage`.
14. **Conversation Review Mode** — "AI DM Coach" panel/dialog that analyzes the full thread: strengths, weaknesses, missed qualification, missed objections, suggested improvements, alternative responses. Reuse for the Coaching page.
15. **Prospect memory** — `score-conversation` extracts memory items into `prospect_memory`; inject stored memory into `loadContext` so future replies are personalized; display on `ProspectSidebar`.

### Phase 6 — Product analytics (optional, needs keys)
16. Integrate PostHog + Microsoft Clarity behind env keys; track feature usage and navigation. Will request keys before wiring.

### Phase 7 — Commercial readiness (doc only)
17. Written assessment of monetizable features and a multi-user/roles/billing roadmap — no code, per the defer list.

## Technical notes
- All new tables/columns stay `user_id`-scoped with RLS `auth.uid() = user_id` and explicit GRANTs.
- Refactors preserve current behavior; each phase is independently shippable.
- Edge functions reuse `_shared/auth.ts` + `_shared/context.ts` (knowledge grounding) and forced tool-calls for structured JSON, matching existing patterns.
