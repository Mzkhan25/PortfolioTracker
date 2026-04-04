# PortfolioTracker — Agent Context

## What Is This
A personal investment portfolio dashboard that connects to eToro's official API. View-only (no trade execution). Single-user mode — one person's portfolio.

## Tech Stack
- **Client:** React Native + Expo (SDK 52), Expo Router, React Query, Zustand
- **Server:** Node.js + Express 5 + TypeScript, Drizzle ORM, PostgreSQL
- **Structure:** Single repo, npm workspaces (`client/`, `server/`, `shared/`)
- **Hosting:** Railway (server + Postgres)
- **Production:** https://portfolio-trackerserver-production.up.railway.app

## Project Structure
```
client/           — Expo React Native app (mobile + web)
  app/(auth)/     — Login screen (password gate)
  app/(tabs)/     — 4 tabs: Dashboard, Positions, History, Market
  components/     — Reusable UI (PositionRow, GroupedPositionRow, TagChip, TagModal, TagManager, etc.)
  hooks/          — React Query hooks (useAuth, usePortfolio, useTags, etc.)
  services/api.ts — Axios client with JWT auth + auto-refresh interceptor
server/           — Express API
  src/routes/     — auth, portfolio, history, market, tags
  src/services/   — etoro.ts (API wrapper), cache.ts, enrichment.ts
  src/middleware/  — auth.ts (JWT verification)
  src/db/         — Drizzle schema (4 tables), migration runner
  drizzle/        — SQL migrations
shared/           — TypeScript types shared between client and server
  types/          — auth, portfolio (incl. GroupedPosition), market, tags, api
```

## Key Architecture Decisions
- **Single-user mode:** eToro API keys stored in server env vars (`ETORO_API_KEY`, `ETORO_USER_KEY`), not per-user in DB. Login is a simple password gate (`APP_PASSWORD` env var).
- **eToro API auth:** Uses `x-api-key` (public key) + `x-user-key` (private key) + `x-request-id` (UUID per request). Base URL: `https://public-api.etoro.com/api/v1`
- **Caching:** Three-tier — 24h instrument cache (stock names), 60s node-cache (request data), DB portfolio snapshots (offline fallback)
- **Instrument enrichment:** Shared `enrichPositions()` / `enrichTrades()` in `server/src/services/enrichment.ts`. Instruments fetched once/day via 24h cache.
- **EUR conversion:** All monetary values (invested, P&L, cash) converted USD→EUR server-side using eToro's own EUR/USD rate (instrument ID 1). Stock prices (openRate, currentRate) stay in USD.
- **Grouped positions:** `/portfolio/positions/grouped` aggregates positions by `instrumentId` — weighted avg open rate, summed P&L/units, merged tags. Dashboard and Positions tab use grouped view.
- **Tags:** User-defined tags on positions via `position_tags` join table. Portfolio overview supports `?tag=tagId` filter.
- **JWT:** 7-day expiry for single-user convenience. Client auto-refreshes on 401 (skips refresh for /auth/refresh and /auth/login to prevent infinite loops).

## Database (PostgreSQL on Railway)
4 active tables: `users`, `portfolio_snapshots`, `tags`, `position_tags`
- `sessions` table exists in DB but is unused (removed from schema after single-user refactor)
- Schema: `server/src/db/schema.ts`
- Migrations: `server/drizzle/`
- Run migration: `cd server && npm run db:migrate`

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
- **Instruments:** Response wrapper key is `instrumentDisplayDatas` (not `instruments`). Fields: `instrumentID` (number), `instrumentDisplayName`, `symbolFull`, `instrumentTypeID`, `exchangeID`, `images[].uri`
- **Rates:** Response wrapper key is `rates`. Fields: `instrumentID` (number), `bid`, `ask`, `lastExecution` (not `lastPrice`), `date`
- **PnL positions:** P&L is nested: `unrealizedPnL.pnL` and `unrealizedPnL.closeRate` (current market rate). Top-level has `positionID`, `instrumentID`, `amount`, `openRate`, `units`, `openDateTime`, `leverage`, `isBuy`
- **Portfolio meta:** `accountCurrencyId: 1`, `credit` (available cash), `unrealizedPnL` (aggregate)

## Known Issues / Next Steps
- `.env` was committed to git history — credentials should be rotated and history scrubbed
- `dotenv` loads from repo root (`../../.env` relative to server/src) — lazy DB connection via Proxy pattern
- `sessions` table exists in production DB but is unused — can be dropped via migration if desired
- Design spec: `docs/superpowers/specs/2026-04-01-portfolio-tracker-design.md`
- Trade history (`getTradeHistory`) and candles (`getCandles`) field mappings not yet verified against real API responses
- `getCandles()` response is double-nested: `{ candles: [{ instrumentId, candles: [...data...] }] }` with `fromDate` field
- Trade history uses lowercase fields (`positionId`, `instrumentId`, `netProfit`) — already correct
- Singleton `getEtoroService()` avoids re-validating env vars per request
- `tryCacheResponse()` helper in cache.ts replaces repeated cache-check pattern across routes
- `enrichTags()` in enrichment.ts extracts duplicated tag-loading logic
- React Query hooks use `staleTime` (60s portfolio/tags, 30s rates, 120s trades) matching server cache TTLs

## Future Features (not in v1)
- WebSocket real-time streaming
- Multi-broker support
- Push notifications