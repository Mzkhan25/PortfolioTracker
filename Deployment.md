# Deployment Status

Last updated: 2026-07-01

## Infrastructure

| Service | URL | Status |
|---|---|---|
| Server (Express) | https://portfoliotracker-production-0a4b.up.railway.app | ✅ Live |
| Client (Expo Web) | https://pleasant-fulfillment-production-c4e1.up.railway.app | ⚠️ Deploying / errors |
| Database (PostgreSQL) | Railway internal | ✅ Live, migrations done |

Both services are on Railway, connected to the GitHub repo (`Mzkhan25/PortfolioTracker`), auto-deploying on push to `main`.

---

## Server Deployment

- **Dockerfile:** `/Dockerfile` (repo root)
- **railway.toml:** sets restart policy only (no `dockerfilePath` — that caused issues, see below)
- **Health check:** `/health` returns `{"status":"ok"}` — confirmed working
- **Environment variables set on Railway:** `DATABASE_URL` (auto-injected from linked Postgres), `JWT_SECRET`, `JWT_EXPIRES_IN`, `APP_PASSWORD`, `ETORO_API_KEY`, `ETORO_USER_KEY`, `ETORO_API_BASE_URL`, `CORS_ORIGIN`, `NODE_ENV`

> ⚠️ `JWT_EXPIRES_IN` was `15m` in the local `.env` — recommended to set it to `7d` on Railway for the single-user app.

---

## Client Deployment

- **Dockerfile:** `client/Dockerfile`
- **Railway service build settings:** Builder = Dockerfile, Dockerfile Path = `/client/Dockerfile`
- **Serves:** Expo web static export via `serve -s /app/dist -l ${PORT:-3000}`

---

## Fixes Applied During This Session

### 1. `expo-linear-gradient` in wrong `package.json`
- Was in root `package.json`, which gets copied into the server Docker image
- Moved to `client/package.json` where it belongs

### 2. Production API URL
- `client/services/api.ts` had the old URL `portfolio-trackerserver-production.up.railway.app`
- Updated to `https://portfoliotracker-production-0a4b.up.railway.app`

### 3. `railway.toml` was overriding per-service Dockerfile path
- Had `dockerfilePath = "Dockerfile"` which forced BOTH services to use the root server Dockerfile
- Removed `dockerfilePath` so Railway dashboard settings take effect per-service
- Also removed `healthcheckPath` (only valid for server, breaks client static serve)

### 4. Expo web `baseUrl` misconfigured
- `client/app.json` had `experiments.baseUrl = "/PortfolioTracker"` (for GitHub Pages)
- Changed to `""` so assets load from root on Railway

### 5. `expo-secure-store` web crash — import shim
- `expo-secure-store` is native-only; importing it on web caused a runtime crash
- Created `client/utils/secureStore.ts` (re-exports expo-secure-store for native)
- Created `client/utils/secureStore.web.ts` (uses `localStorage` for web)
- Updated `client/services/api.ts` to import from the shim instead, removing all `Platform.OS === 'web'` branches

### 6. `expo-secure-store` web crash — `registerWebModule` bug (⚠️ last fix, unverified)
- Even after shimming our import, Expo's auto-linker still calls `registerWebModule()` on every installed Expo module at startup
- `expo-secure-store` 14.0.1's web stub (`ExpoSecureStore.web.js`) exports `{}` instead of a class — `registerWebModule` throws `"Module implementation must be a class"`
- Fix: created `client/metro.config.js` with a custom `resolveRequest` that intercepts `ExpoSecureStore.web.js` on the `web` platform and redirects to `client/utils/ExpoSecureStoreWebStub.js`
- Stub exports a proper no-op class extending `NativeModule` from `expo-modules-core`
- **This fix was pushed but not yet confirmed working in production**

---

## Current Client Error

```
Error: Module implementation must be a class
    registerWebModule entry-*.js:622
```

Occurs at app startup in the browser. The metro config fix (item 6 above) should resolve it — but needs a redeploy and verification.

If the error persists after the metro config fix, the next module to check is `expo-linear-gradient`. It's installed in `client/package.json` but **not imported anywhere in the codebase** — it may be getting auto-linked and also failing `registerWebModule`. If so, either:
- Remove it from `client/package.json` entirely (if unused), or
- Add another entry to the metro config resolver for `ExpoLinearGradient.web.js`

To find all modules being auto-registered, look for `ExpoModulesProvider` in the Metro bundle or run:
```bash
cat node_modules/expo-modules-core/build/web/ExpoModulesProvider.web.js
```

---

## Files Changed This Session

| File | Change |
|---|---|
| `package.json` | Removed `expo-linear-gradient` (moved to client) |
| `client/package.json` | Added `expo-linear-gradient` |
| `railway.toml` | Removed `dockerfilePath` and `healthcheckPath` |
| `client/Dockerfile` | Created — builds Expo web and serves with `serve` |
| `client/app.json` | Changed `experiments.baseUrl` from `/PortfolioTracker` to `""` |
| `client/services/api.ts` | Updated production URL; replaced SecureStore/Platform imports with shim |
| `client/utils/secureStore.ts` | Created — native re-export of expo-secure-store |
| `client/utils/secureStore.web.ts` | Created — localStorage implementation for web |
| `client/utils/ExpoSecureStoreWebStub.js` | Created — no-op NativeModule class for metro shim |
| `client/metro.config.js` | Created — redirects ExpoSecureStore.web.js to stub on web platform |
