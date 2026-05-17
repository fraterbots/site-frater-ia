# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Frater IA landing page — an AI automation consultancy site. The stack is intentionally minimal: a single `index.html` with all styles and scripts inlined, backed by two Vercel Serverless Functions.

## Development

There is no build step. To preview the site locally, serve `index.html` with any static file server:

```powershell
npx serve .
# or
python -m http.server 8080
```

To install backend dependencies (needed for local API testing):

```powershell
npm install
```

## Deployment

Deployed on Vercel. Push to `main` triggers a production deploy automatically. The `vercel.json` configuration:
- Sets Node.js 20 for serverless functions
- Sets 30s max duration on all `api/*.js` functions
- Adds CORS headers (`Access-Control-Allow-*`) on all `/api/*` routes

## Architecture

### Frontend (`index.html`)
One large self-contained file — all CSS (`<style>`), HTML, and JavaScript are inlined. No framework, no bundler. The page uses CSS custom properties defined in `:root` for the entire color/typography system:

- `--ink` / `--paper` — primary dark/light palette (navy `#14133a` / warm off-white `#f4f2ea`)
- `--accent` / `--accent-2` — green and purple OKLCH accents
- `--display`, `--body`, `--mono` — font families (Space Grotesk, Inter, JetBrains Mono)

The chatbot and contact form both call the `api/` endpoints via `fetch`.

### Serverless API (`api/`)

**`api/contact.js`** — handles lead form submissions (POST):
1. Validates `nome` + `email` (required fields)
2. Formats and normalizes all fields
3. Saves lead to Supabase table `contacts`
4. Sends notification email via Resend to `contato@frateria.site`
5. Email failures are logged but do not block the response (lead is already saved)

**`api/chat.js`** — chatbot proxy (POST):
1. Forwards the user message to an n8n webhook (`N8N_WEBHOOK_URL`)
2. Reads `reply`/`message`/`output`/`text` from the n8n response in that priority order
3. Returns a fallback WhatsApp prompt if n8n is unreachable (15s timeout)

### Dev utility (`tweaks-panel.jsx`)
A React-based floating UI panel used for live design-time tweaking during prototyping. Not included in production — it's a standalone JSX file that expects React available globally. Exports components (`TweaksPanel`, `TweakSlider`, `TweakColor`, etc.) onto `window`.

## Environment Variables

Defined in `.env.local` (gitignored). See `.env.example` for all keys:

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (bypasses RLS) |
| `RESEND_API_KEY` | Resend API key for transactional email |
| `N8N_WEBHOOK_URL` | n8n webhook URL for the chatbot |

## Key Constraints

- The frontend has no bundler — avoid introducing npm imports into `index.html`. All frontend logic must run in-browser as vanilla JS.
- `api/contact.js` uses `require()` (CommonJS) — keep serverless functions in CommonJS, not ESM.
- The Supabase client in `api/contact.js` uses the **service role key** (bypasses Row Level Security). Never expose this key client-side.
