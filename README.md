# Base44 Project

Use this repository to run and edit the app locally, then publish changes back through Base44.

Any change pushed to the repo will also be reflected in the Base44 Builder.

## Prerequisites

1. Clone the repository using the project's Git URL.
2. Navigate to the project directory.
3. Install dependencies: `npm install`.
4. Install the Base44 CLI: `npm install -g base44@latest`.
5. Install [Deno](https://docs.deno.com/runtime/getting_started/installation/) — the local Base44 backend runs on it.

Run `base44 --help` (or see the [CLI reference](https://docs.base44.com/developers/references/cli/commands/introduction)) for the full command surface.

## Run Locally

Three commands, from the project root:

```bash
base44 login   # one-time per machine
base44 link    # one-time per clone
base44 dev     # local backend + frontend together
```

Open the frontend URL that `base44 dev` prints (typically `http://localhost:5173`).

Notes:

- **Every fresh clone needs `base44 link`.** It writes `base44/.app.jsonc` (the app-id pointer), which is deliberately gitignored. Your app id is in the Builder URL (`app.base44.com/apps/<id>/...`); `base44 link --help` shows the non-interactive flags.
- **`base44 dev` runs the frontend for you** (via `site.serveCommand` in this repo's `base44/config.jsonc`) — never run `npm run dev` yourself: alone it serves a UI with no backend behind it (`[base44] Proxy not enabled`, every `/api` call fails), and alongside `base44 dev` the second Vite silently takes the next port and you end up looking at the wrong one.
- **The app must be published at least once for the UI to load under `base44 dev`.** The frontend boots by fetching app settings from the hosted app; before the first publish that fails and every page redirects to login. The local API works regardless.
- Entities, functions, and auth run locally — entity data is **in-memory only**, wiped when `base44 dev` restarts. Everything else (Core integrations, OAuth login) is forwarded to your deployed app. Full breakdown: [Local development overview](https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview).

## Frontend Only, Hosted Backend

To work on just the frontend against your app's live hosted backend:

```bash
base44 dev --remote
```

⚠️ In this mode writes go to your app's **production data** — plain `base44 dev` keeps everything local.

## Publish Your Changes

After pushing your changes to git, open the Base44 dashboard and publish the app:

```bash
base44 dashboard open
```

This repo syncs to Base44 through git, so publish from the dashboard rather than `base44 deploy` — a CLI deploy ships your local tree directly, bypassing the sync, and the deployed state silently diverges from the repo.

## Docs & Support

GitHub integration: [https://docs.base44.com/developers/app-code/local-development/github](https://docs.base44.com/developers/app-code/local-development/github)

Local development: [https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview](https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview)

Support: [https://app.base44.com/support](https://app.base44.com/support)
# FindMe (standalone)

## Deploy free with Cloudflare Pages

This is a static Vite site, so Cloudflare Pages serves it from its CDN without an application server that sleeps when idle.

1. Push this folder to a GitHub repository.
2. In Cloudflare, open **Workers & Pages** → **Create application** → **Pages** → **Import an existing Git repository**.
3. Select the repository and configure **Build command** as `npm run build` and **Build output directory** as `dist`.
4. Under **Settings → Environment variables**, add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for both Production and Preview. Do not add the Supabase secret key.
5. Deploy. Cloudflare gives the site a `*.pages.dev` address. Add that address to Supabase **Authentication → URL Configuration** as both Site URL and an allowed Redirect URL. Add your custom domain there as well after connecting it in Cloudflare.

`public/_redirects` provides the single-page-app fallback for direct links such as `/post/<id>`.

## Supabase production setup

1. Create a Supabase project, then run [supabase/all-in-one-setup.sql](supabase/all-in-one-setup.sql) in its SQL Editor. After that, run [supabase/chat-security-setup.sql](supabase/chat-security-setup.sql) to make conversations, messages, notifications, and chat attachments private. Existing projects only need the chat security script.
2. Copy `.env.example` to `.env.local` and fill `VITE_SUPABASE_URL` plus `VITE_SUPABASE_PUBLISHABLE_KEY` from the project Connect dialog. Never use the service-role key in the browser.
3. In Supabase Auth, enable Email provider. The registration screen expects an email OTP; configure email confirmation / OTP delivery in Auth settings. For Google sign-in, enable Google and add your local and production callback URLs.

The app stores users through Supabase Auth, records in Postgres, and uploaded files in Supabase Storage. Post images are public; chat attachments use a separate private bucket with participant-only access. Never put the Supabase secret key in Vite environment variables.

This project now runs as a normal Vite + React app and does not require Base44, Deno, a Base44 login, or a remote backend.

```bash
npm install
npm run dev
```

Open the URL printed by Vite (normally `http://localhost:5173`). The local frontend connects to the Supabase project configured in `.env.local`; local posts, messages, and notifications are real database records.

Build a production bundle with `npm run build`.

---
