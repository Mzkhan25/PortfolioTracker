# PortfolioTracker — Agent Context

> **Documentation Maintenance Rule:** After completing any task — feature, fix, or refactor — update this file and `docs/AGENT_CONTEXT.md` to reflect the new state. Stale documentation is worse than none: future agents will act on it.

## What Is This
A personal investment portfolio dashboard that connects to eToro's official API. View-only (no trade execution). Single-user mode — one person's portfolio.

## Tech Stack
- **Client:** React Native + Expo (SDK 52), Expo Router 4, React Query (TanStack v5), Zustand v5
- **Server:** Node.js + Express 5 + TypeScript, Drizzle ORM, PostgreSQL
- **Structure:** Single repo, npm workspaces (`client/`, `server/`, `shared/`)
- **Hosting:** Railway (server + Postgres)
- **Production:** https://portfolio-trackerserver-production.up.railway.app

## Project Structure
```
client/           — Expo React Native app (mobile + web)
  app/(auth)/     — Login screen (password gate)
  app/(tabs)/     — 4 tabs: Dashboard (index), Positions, History, Market
  app/position/   — Position detail modal screen ([instrumentId].tsx)
  components/     — Reusable UI (see component list below)
  hooks/          — React Query hooks (usePortfolio, useMarketData, useTags, useTradeHistory, useAuth)
  services/api.ts — Axios client with JWT auth + auto-refresh interceptor
server/           — Express API
  src/routes/     — auth, portfolio, history, market, tags
  src/services/   — etoro.ts (API wrapper), cache.ts, enrichment.ts
  src/middleware/  — auth.ts (JWT verification)
  src/db/         — Drizzle schema (4 tables), migration runner
  drizzle/        — SQL migrations
shared/           — TypeScript types shared between client and server
  types/          — auth, portfolio (incl. GroupedPosition), market, tags, api
docs/
  AGENT_CONTEXT.md — Comprehensive agent reference (screens, components, APIs, data flow)
```

## Component Inventory (`client/components/`)
- `PortfolioChart.tsx` — gifted-charts LineChart wrapper; used for both portfolio history (dashboard) and candle charts (market, position detail). Props: `data`, `isLoading`, `height`, `color`, `showYAxis`. Auto-colors green/red based on first vs last value.
- `PortfolioSummaryBar.tsx` — Fixed footer on Positions tab: Cash + Invested + P/L = Total. Props: `availableCash`, `totalInvested`, `profitLoss`, `totalValue`.
- `TagChip.tsx` — Colored pill chip. Props: `name`, `color`, `selected`, `onPress`, `small`. Used in filter bars and inline on position rows.
- `TagModal.tsx` — Modal for assigning/removing tags from a position. Supports single-tag mode (position detail) and multi-tag mode (positions list).
- `TagManager.tsx` — Modal for CRUD operations on tags (create/rename/delete). Accessible via pricetag icon in Positions filter bar.
- `PnLBadge.tsx` — Color-coded P&L amount badge.
- `Skeleton.tsx` — Loading skeletons: `Skeleton`, `SkeletonChart`, `SkeletonPositionRow`, `SkeletonTradeRow`, `SkeletonPriceHeader`.
- `ErrorState.tsx` — Error + retry UI. Props: `message`, `onRetry`.
- `ErrorBoundary.tsx` — React error boundary wrapper.

> `PriceChart.tsx` was deleted — replaced by `PortfolioChart.tsx`.

## Key Architecture Decisions
- **Single-user mode:** eToro API keys stored in server env vars (`ETORO_API_KEY`, `ETORO_USER_KEY`), not per-user in DB. Login is a simple password gate (`APP_PASSWORD` env var).
- **eToro API auth:** Uses `x-api-key` (public key) + `x-user-key` (private key) + `x-request-id` (UUID per request). Base URL: `https://public-api.etoro.com/api/v1`
- **Caching:** Three-tier — 24h instrument cache (stock names), 60s node-cache (request data), DB portfolio snapshots (offline fallback). See `docs/AGENT_CONTEXT.md` for full cache TTL table.
- **Instrument enrichment:** Shared `enrichPositions()` / `enrichTrades()` in `server/src/services/enrichment.ts`. Instruments fetched once/day via 24h cache.
- **Currency display:** Monetary values (invested, P&L, cash, portfolio value) shown in EUR (`€`). Stock prices (`openRate`, `currentRate`, `averageOpenRate`) shown in USD (`$`). EUR conversion happens server-side using eToro's EUR/USD rate (instrument ID 1). Do not mix currencies in the same formatted value.
- **Grouped positions:** `/portfolio/positions/grouped` aggregates positions by `instrumentId` — weighted avg open rate, summed P&L/units, merged tags. Dashboard and Positions tab use grouped view.
- **Daily change:** Computed by comparing current portfolio value against the most recent previous-day DB snapshot. Shows on dashboard header. Requires at least one previous snapshot — shows `0` on first run.
- **Stock logos:** `imageUrl` field on Position/GroupedPosition, enriched from eToro instrument data (`images[0].uri`). Falls back to initials placeholder if missing.
- **Position detail screen:** Modal at `/position/[instrumentId]` — compact header (logo, ticker, price in USD, P/L% + amount in EUR), chart with period selector (1D/1W/1M/3M/1Y), individual positions table. Each row taps to open TagModal (single-tag mode).
- **Portfolio history chart:** `GET /portfolio/history?days=N` returns one snapshot per day from DB. LineChart on dashboard shows trend. Period selector: 1W/1M/3M/6M/1Y mapped to 7/30/90/180/365 days.
- **Per-position tagging:** Tags are assigned per individual eToro position ID (not per instrument). Positions list: long-press group → TagModal assigns to ALL positions in group. Position detail: tap row → TagModal assigns to that single position (single-tag mode: replacing replaces existing).
- **Tag-based analytics:** Dashboard has tag selector bar (filters header metrics via `?tag=tagId`) and allocation chart toggle ("By Stock" / "By Tag"). `GET /portfolio/overview/by-tag` returns per-tag P&L/allocation. History chart and top movers stay global. Untagged positions shown as "Untagged" slice.
- **JWT:** 7-day expiry for single-user convenience. Client auto-refreshes on 401 (skips refresh for /auth/refresh and /auth/login to prevent infinite loops).

## Database (PostgreSQL on Railway)
4 active tables: `users`, `portfolio_snapshots`, `tags`, `position_tags`
- `sessions` table exists in production DB but is **unused** (removed from schema after single-user refactor)
- Schema: `server/src/db/schema.ts`
- Migrations: `server/drizzle/`
- Run migration: `cd server && npm run db:migrate`

## API Routes Summary (`/api`)
```
POST /auth/login             POST /auth/refresh        GET /auth/me
GET  /portfolio/overview     GET  /portfolio/overview/by-tag
GET  /portfolio/positions    GET  /portfolio/positions/grouped
GET  /portfolio/history?days=N
GET  /history/trades         (paginated: page, pageSize, minDate)
GET  /market/rates           GET  /market/candles/:instrumentId?period=
GET|POST /tags               PUT|DELETE /tags/:id
POST /tags/:id/positions     DELETE /tags/:id/positions/:etoroPositionId
```

## Environment Variables
Server reads from `.env` at repo root (local) or Railway variables (production):
- `DATABASE_URL` — Postgres connection string
- `JWT_SECRET` — JWT signing key
- `JWT_EXPIRES_IN` — Token expiry (default: 7d)
- `APP_PASSWORD` — Login password
- `ETORO_API_KEY` — eToro public API key
- `ETORO_USER_KEY` — eToro user/private key
- `ETORO_API_BASE_URL` — `https://public-api.etoro.com/api/v1`
- `CORS_ORIGIN` — Comma-separated allowed origins
- `NODE_ENV` — `development` or `production`

## Running Locally
```bash
# Terminal 1 — Server
npm run dev:server

# Terminal 2 — Client
npm run dev:client
# Press 'w' for web, 'i' for iOS, 'a' for Android
```

## Building
```bash
npm run build:shared   # Build shared types
npm run build:server   # Build server
npm run build          # Both (shared then server)
```

## Key eToro API Endpoints Used
- `GET /me` — Validate keys, get user identity
- `GET /trading/info/real/pnl` — Portfolio overview + positions
- `GET /trading/info/trade/history` — Closed trades (params: minDate, page, pageSize)
- `GET /market-data/instruments` — Instrument metadata
- `GET /market-data/instruments/rates` — Current prices
- `GET /market-data/instruments/{id}/history/candles/{dir}/{interval}/{count}` — OHLCV data
- `GET /user-info/people/{username}` — User profile
- Rate limits: 60 GET/min, 20 POST/min per user key

## eToro API Field Mapping (verified with real API)
- **Instruments:** Response wrapper key is `instrumentDisplayDatas`. Fields: `instrumentID` (number), `instrumentDisplayName`, `symbolFull`, `instrumentTypeID`, `exchangeID`, `images[].uri`
- **Rates:** Response wrapper key is `rates`. Fields: `instrumentID` (number), `bid`, `ask`, `lastExecution` (not `lastPrice`), `date`
- **PnL positions:** P&L nested: `unrealizedPnL.pnL` and `unrealizedPnL.closeRate`. Top-level: `positionID`, `instrumentID`, `amount`, `openRate`, `units`, `openDateTime`, `leverage`, `isBuy`
- **Portfolio meta:** `accountCurrencyId: 1`, `credit` (available cash), `unrealizedPnL` (aggregate)
- **Candles:** Double-nested: `{ interval, candles: [{ instrumentId, candles: [...OHLCV...] }] }`. Fields: `fromDate`, `open`, `high`, `low`, `close`, `volume`
- **Trade history:** Lowercase fields: `positionId`, `instrumentId`, `netProfit`, `investment`, `fees`

## Refactoring Notes
- Singleton `getEtoroService()` avoids re-validating env vars per request
- `tryCacheResponse()` helper in cache.ts replaces repeated cache-check pattern
- `enrichTags()` in enrichment.ts extracts duplicated tag-loading logic
- React Query stale times: 60s portfolio/tags, 30s rates, 300s history and trades
- Startup env validation in `index.ts` — fails fast on missing env vars

## Known Issues
- Portfolio history chart needs multiple days of DB snapshots to populate (first run shows empty chart)
- Daily change shows `0` until there is a snapshot from a previous day
- Market tab displays rates with `€` prefix but eToro rate values are USD — worth verifying conversion
- `sessions` table exists in production DB but unused — can be dropped via migration
- `.env` credentials should be rotated periodically

## Next Up — Planned & Designed (pick up from here)

See `docs/AGENT_CONTEXT.md` → **"Planned Features — Ready for Implementation"** for full decisions and implementation order. Summary:

1. **Tag removal UX** — ✕ button on TagChip, "Remove all" in TagModal, inline ✕ on position rows. Small, self-contained, no design dependency.
2. **Full UI redesign** — Coinbase/eToro style, web-first, left sidebar on web, light+dark mode, design tokens. All 5 screens + auth.
3. **GitHub Pages deployment** — Static Expo web build → GitHub Actions → GitHub Pages. Server stays on Railway. Add GitHub Pages URL to `CORS_ORIGIN` on Railway after deploy.

## Future Features (longer term)
- WebSocket real-time streaming
- Multi-broker support
- Push notifications
- Portfolio alerts (price thresholds)
