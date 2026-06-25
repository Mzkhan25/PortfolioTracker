# GitHub Pages Deployment — Design Spec

**Date:** 2026-06-25  
**Status:** Approved  
**Scope:** Deploy Expo web client to GitHub Pages. Server stays on Railway.

---

## Goal

Host the frontend at `https://mzkhan25.github.io/PortfolioTracker` via GitHub Pages. The Railway API server is unchanged. Every push to `main` automatically redeploys the client.

---

## Architecture

```
push to main
   → GitHub Actions (.github/workflows/deploy-client.yml)
      → checkout + setup Node
      → npm ci (root workspace — installs all packages)
      → cd client && npx expo export --platform web
      → cp dist/index.html dist/404.html  (SPA deep-link fix)
      → JamesIves/github-pages-deploy-action → gh-pages branch
         → GitHub Pages serves https://mzkhan25.github.io/PortfolioTracker
```

The Railway Express server continues to receive API requests. No server code changes.

---

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `.github/workflows/deploy-client.yml` | Create | GitHub Actions deploy workflow |
| `client/app.json` | Edit | Add `experiments.baseUrl: "/PortfolioTracker"` |

---

## Key Technical Decisions

### 1. Base URL (`experiments.baseUrl`)

GitHub Pages serves this repo at `/PortfolioTracker/` (not root), because the repo is named `PortfolioTracker`, not `mzkhan25.github.io`. Without `baseUrl`, all asset paths and Expo Router links use `/` as root and 404.

Set in `client/app.json`:
```json
"experiments": {
  "baseUrl": "/PortfolioTracker"
}
```

Expo only reads this during `expo export`. Local dev (`expo start`) ignores it — no impact on development workflow.

### 2. SPA 404 Fix (`404.html`)

`output: "single"` produces a single `index.html`. GitHub Pages returns a real HTTP 404 for any URL it has no file for — including deep links like `/PortfolioTracker/position/123`. Since the SPA handles routing client-side, GitHub Pages just needs to serve `index.html` for unknown paths.

GitHub Pages serves `404.html` for unmatched paths. The fix is to copy `index.html` → `404.html` after export. The SPA boots, React Router takes over, and the correct screen renders.

### 3. API URL

`client/services/api.ts` already uses `https://portfolio-trackerserver-production.up.railway.app` when `!__DEV__`. The production build sets `__DEV__ = false`. No changes needed.

### 4. CORS (manual step after first deploy)

Railway's `CORS_ORIGIN` environment variable must include `https://mzkhan25.github.io`. This is a one-time manual step in the Railway dashboard. The workflow cannot do this.

---

## GitHub Actions Workflow

```yaml
name: Deploy Client to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Export Expo web build
        run: npx expo export --platform web
        working-directory: client

      - name: Copy index.html to 404.html (SPA deep-link fix)
        run: cp client/dist/index.html client/dist/404.html

      - name: Deploy to GitHub Pages
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: client/dist
          branch: gh-pages
          clean: true
```

---

## Manual Steps (one-time, after first deploy)

1. **Enable GitHub Pages:** Go to repo Settings → Pages → Source: `gh-pages` branch, folder: `/ (root)`.
2. **Add CORS origin on Railway:** Add `https://mzkhan25.github.io` to the `CORS_ORIGIN` env var (comma-separated).

---

## Out of Scope

- Custom domain
- Environment-specific API URLs (API URL is hardcoded in `api.ts`)
- Server changes of any kind
- Mobile build/deployment
