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
