# DM Setter OS

AI-powered co-pilot for DM setters. Analyze conversations, qualify prospects, detect call readiness, and get smart reply suggestions — all from your pipeline, training, and analytics dashboards.

**Live app**: https://dm-wingman-pro.vercel.app

## Getting started locally

The only requirement is having Node.js & npm installed — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
# Step 1: Clone the repository.
git clone https://github.com/readalex178-ux/dm-setter-os.git

# Step 2: Navigate to the project directory.
cd dm-setter-os

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase

## Deployment

This project deploys automatically to Vercel on every push to `main`.

## Chrome extension

The browser companion extension lives in [`extension/`](./extension) and is shipped as a downloadable zip from the in-app Extension page (built from that source — see `public/dm-setter-os-extension.zip`). It adds an AI insights panel directly inside Instagram, TikTok, X/Twitter, Facebook, Messenger, LinkedIn, and WhatsApp DMs, synced to your DM Setter OS account via Google sign-in.

## Privacy & Data Handling

- **What's stored**: your prospect list and metadata (name, handle, platform, stage, income/motivation/concern notes you enter), the DM conversation text you save, AI-extracted prospect memory (goals, pains, objections), KPI/training history, and OAuth tokens for any platform accounts you connect (Instagram/Facebook/WhatsApp). All of it lives in Supabase, scoped to your account via row-level security — no other user can read your data.
- **Third-party AI processing**: when you use AI features (stage analysis, reply suggestions, conversation scoring, the daily briefing, training roleplay, or the extension's analysis panel), the relevant conversation/prospect text is sent to [OpenRouter](https://openrouter.ai), which routes the request to an underlying model (by default `openai/gpt-4o-mini`). That's the only third party conversation content is shared with.
- **AI suggestions are never auto-sent.** Every AI-generated reply requires you to manually pick it before it's sent to a prospect via `send-message` — the app does not autonomously message anyone on your behalf.
- **Retention & deletion**: data is kept until you delete it. Deleting a prospect cascades to delete their messages, memory, and timeline events. There is currently no automatic time-based retention limit — clean up old prospects manually if you want them gone sooner.
