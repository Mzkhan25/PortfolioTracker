# Deployment Status

Last updated: 2026-07-02

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

## `Module implementation must be a class` — RESOLVED (2026-07-02)

The previous session's theory (blamed `expo-secure-store`, added a metro resolver shim) was **wrong** — verified by reproducing the crash locally in headless Chromium against the actual production build (`npx expo export --platform web` + `serve` + Playwright). The SecureStore shim is harmless but was never the cause.

**Actual root cause:** dependency version drift, in two parts.

1. **`@expo/vector-icons` was on `^14.0.0`**, which let npm install `14.1.0` instead of the SDK-52-expected `~14.0.4`. `14.1.0` pulls in `expo-font@55.0.4` (built for a much newer Expo SDK), which calls `registerWebModule()` with an API shape (plain object + explicit name string) that our installed `expo-modules-core@2.2.3` (SDK 52) doesn't support — its `registerWebModule` only checks `moduleImplementation.name`, sees an anonymous function, and throws. This is what actually produced the `entry.js:622` crash — the failing module was `ExpoFontLoader`, not SecureStore.
   - Fix: pinned `@expo/vector-icons` to `~14.0.4` and added `expo-font@~13.0.4` as an explicit direct dependency of `client/package.json` (it wasn't declared at all — vector-icons expects the host app to provide it — so npm had nowhere reachable to hoist a shared copy).

2. Fixing #1 surfaced a second, previously-masked crash: `No safe area value available. Make sure you are rendering <SafeAreaProvider>`. The app never wrapped its root in `<SafeAreaProvider>`. This was tolerated under `react-native-safe-area-context@4.x` (silent zero-inset fallback), but `expo-router`'s transitive `@react-navigation/*` dependencies float on `^7.x` and now require `safe-area-context@5.x`, which hard-throws without a Provider. Since `client/package.json` also pinned `react-native-safe-area-context` down to `4.12.0` (per `expo install --fix`'s SDK-52 recommendation), two incompatible copies of the package coexisted in the tree — a Provider from one version's Context can't satisfy a Consumer from the other.
   - Fix: bumped `react-native-safe-area-context` to `^5.0.0` (matching what `@react-navigation` already pulls transitively, so there's exactly one deduped copy) and added `<SafeAreaProvider>` around the root layout in `client/app/_layout.tsx`.

**Verified:** rebuilt the production bundle, served it locally, and drove it with headless Chromium (Playwright) — no more `registerWebModule`/safe-area crashes, login screen renders correctly. Remaining console noise in local testing (CORS errors) is expected — `localhost` isn't in Railway's `CORS_ORIGIN` allowlist; this won't occur when served from the actual Railway domain.

**Debugging note:** don't trust an unverified fix noted in this file at face value — reproduce first. `npx expo export --platform web` + `npx serve -s dist` + a headless browser (Playwright) is the fastest way to catch web-only runtime crashes that `tsc`/tests won't surface, since they only manifest when Expo's web module-registration code actually executes in a browser.

---

## Files Changed This Session (2026-07-02)

| File | Change |
|---|---|
| `client/package.json` | `@expo/vector-icons` pinned to `~14.0.4`; added `expo-font@~13.0.4`; `react-native-safe-area-context` changed to `^5.0.0`; `react-native` bumped to `0.76.9` |
| `client/app.json` | Added `expo-font` to `plugins` (auto-added by `expo install`) |
| `client/app/_layout.tsx` | Wrapped root layout in `<SafeAreaProvider>` |
| `package-lock.json` | Regenerated after dependency fixes |

---

## Files Changed Previous Session (2026-07-01)

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

> Note: `package.json`'s root `dependencies` still listed `expo-linear-gradient` as of 2026-07-02 despite this entry claiming it was removed — it was not actually the cause of the crash (the module isn't imported anywhere and never appears in the web bundle), so it was left as-is rather than risk an unrelated change. Worth cleaning up separately since it's dead weight in the server's Docker image.
