# GitHub Pages Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the Expo web client to GitHub Pages at `https://mzkhan25.github.io/PortfolioTracker`, triggered automatically on every push to `main`.

**Architecture:** A GitHub Actions workflow exports the Expo web build from `client/` and pushes the `dist/` folder to the `gh-pages` branch. GitHub Pages serves that branch. The Railway server is untouched — `api.ts` already targets the Railway URL in production builds.

**Tech Stack:** GitHub Actions, `actions/checkout@v4`, `actions/setup-node@v4`, `JamesIves/github-pages-deploy-action@v4`, Expo CLI (`npx expo export`).

## Global Constraints

- GitHub repo: `Mzkhan25/PortfolioTracker` — Pages URL is `https://mzkhan25.github.io/PortfolioTracker`
- Expo SDK 52, Expo Router 4, `output: "single"` (SPA)
- `baseUrl` must be `/PortfolioTracker` (no trailing slash) — must match the repo name exactly
- Node version: 20 (LTS)
- No server code changes. No `api.ts` changes. No shared types changes.
- `npm ci` run at repo root (npm workspaces) — do NOT run inside `client/` for install

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `client/app.json` | Modify | Add `experiments.baseUrl` so Expo sets correct asset paths and router base |
| `.github/workflows/deploy-client.yml` | Create | GitHub Actions workflow — install, export, 404 fix, deploy to gh-pages |

---

### Task 1: Add `baseUrl` to Expo config

**Files:**
- Modify: `client/app.json`

**Interfaces:**
- Produces: `experiments.baseUrl = "/PortfolioTracker"` read by `expo export --platform web` at build time

**Why this must come first:** Without `baseUrl`, all exported asset hrefs are root-relative (`/assets/…`). GitHub Pages serves the app under `/PortfolioTracker/`, so every asset 404s. This single line fixes it.

- [ ] **Step 1: Open `client/app.json` and add `experiments` block**

The file currently ends with:
```json
    "plugins": ["expo-router", "expo-secure-store"]
  }
}
```

Replace the entire file content with the version below (adds `"experiments"` as a sibling to `"plugins"` inside `"expo"`):

```json
{
  "expo": {
    "name": "PortfolioTracker",
    "slug": "portfolio-tracker",
    "version": "1.0.0",
    "scheme": "portfolio-tracker",
    "platforms": ["ios", "android", "web"],
    "icon": "./assets/icon.png",
    "splash": {
      "backgroundColor": "#0f172a"
    },
    "ios": {
      "bundleIdentifier": "com.portfoliotracker.app",
      "supportsTablet": true
    },
    "android": {
      "package": "com.portfoliotracker.app",
      "adaptiveIcon": {
        "backgroundColor": "#0f172a"
      }
    },
    "web": {
      "bundler": "metro",
      "output": "single",
      "favicon": "./assets/favicon.png"
    },
    "plugins": ["expo-router", "expo-secure-store"],
    "experiments": {
      "baseUrl": "/PortfolioTracker"
    }
  }
}
```

- [ ] **Step 2: Verify the export builds correctly with the new baseUrl**

Run from repo root:
```bash
cd client && npx expo export --platform web
```

Expected output ends with something like:
```
Exporting...
Web exports written to dist/
```

Check `client/dist/index.html` — look for asset hrefs that start with `/PortfolioTracker/`:
```bash
grep -o 'src="[^"]*"' client/dist/index.html | head -5
```
Expected: paths like `src="/PortfolioTracker/_expo/static/js/web/..."` (not `src="/_expo/..."`).

- [ ] **Step 3: Clean up the test build**

```bash
rm -rf client/dist
```

- [ ] **Step 4: Commit**

```bash
git add client/app.json
git commit -m "feat: add baseUrl for GitHub Pages subpath deployment"
```

---

### Task 2: Create GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy-client.yml`

**Interfaces:**
- Consumes: `client/app.json` with `experiments.baseUrl` (Task 1)
- Produces: `gh-pages` branch containing the exported `dist/` folder on every push to `main`

- [ ] **Step 1: Create the `.github/workflows/` directory and workflow file**

Create `.github/workflows/deploy-client.yml` with this exact content:

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
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Export Expo web build
        run: npx expo export --platform web
        working-directory: client

      - name: Copy index.html to 404.html
        run: cp client/dist/index.html client/dist/404.html

      - name: Deploy to GitHub Pages
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: client/dist
          branch: gh-pages
          clean: true
```

**Notes on each step:**
- `npm ci` runs at repo root — npm workspaces installs all packages including `client/` and `shared/`
- `working-directory: client` scopes only the export command — Expo CLI must run inside the package that has `app.json`
- `cp client/dist/index.html client/dist/404.html` — GitHub Pages serves `404.html` for unmatched paths; this lets the SPA boot and handle routing client-side
- `clean: true` — removes stale files from `gh-pages` branch on each deploy
- `permissions: contents: write` — required for the deploy action to push to `gh-pages`

- [ ] **Step 2: Commit and push to trigger the first deploy**

```bash
git add .github/workflows/deploy-client.yml
git commit -m "feat: add GitHub Actions workflow for GitHub Pages deployment"
git push origin main
```

- [ ] **Step 3: Watch the workflow run**

Go to `https://github.com/Mzkhan25/PortfolioTracker/actions`.

Expected: a workflow named "Deploy Client to GitHub Pages" appears and runs. All steps should pass (green). The run takes ~2-3 minutes.

If the workflow fails on `npm ci`, check that `package-lock.json` exists at the repo root (it should, since this is an npm workspaces monorepo).

If the workflow fails on `expo export`, the error message will appear in the "Export Expo web build" step. Common cause: missing peer dependency — check the log.

---

### Task 3: One-time manual setup + smoke test

These steps cannot be automated — they require GitHub UI and Railway dashboard access.

**Step A — Enable GitHub Pages (do once, immediately after the first workflow run completes):**

- [ ] Go to `https://github.com/Mzkhan25/PortfolioTracker/settings/pages`
- [ ] Under **Source**, select **Deploy from a branch**
- [ ] Branch: `gh-pages`, folder: `/ (root)`
- [ ] Click **Save**
- [ ] Wait ~1 minute. GitHub shows the live URL: `https://mzkhan25.github.io/PortfolioTracker`

**Step B — Add CORS origin on Railway:**

- [ ] Go to Railway dashboard → PortfolioTracker server service → Variables
- [ ] Find `CORS_ORIGIN`. Current value is something like `http://localhost:8081,http://localhost:19006`
- [ ] Add `https://mzkhan25.github.io` (comma-separated, no trailing slash)

  Example new value:
  ```
  http://localhost:8081,http://localhost:19006,https://mzkhan25.github.io
  ```
- [ ] Save. Railway redeploys the server automatically.

**Step C — Smoke test:**

- [ ] Open `https://mzkhan25.github.io/PortfolioTracker` in a browser
- [ ] You should see the login screen (password gate). Log in.
- [ ] Navigate to each tab: Dashboard, Positions, History, Market
- [ ] Navigate to a position detail screen (tap a position row)
- [ ] Refresh the page while on a deep route (e.g. `/position/123`) — should still load the SPA, not show a GitHub 404
- [ ] Open DevTools → Network — confirm API calls go to `portfolio-trackerserver-production.up.railway.app` and return 200 (not CORS errors)
