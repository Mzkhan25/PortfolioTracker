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
  components/     — Reusable UI (PositionRow, TagChip, TagModal, TagManager, etc.)
  hooks/          — React Query hooks (useAuth, usePortfolio, useTags, etc.)
  services/api.ts — Axios client with JWT auth + auto-refresh interceptor
server/           — Express API
  src/routes/     — auth, portfolio, history, market, tags
  src/services/   — etoro.ts (API wrapper), cache.ts, encryption.ts
  src/middleware/  — auth.ts (JWT verification)
  src/db/         — Drizzle schema (5 tables), migration runner
  drizzle/        — SQL migrations
shared/           — TypeScript types shared between client and server
  types/          — auth, portfolio, market, tags, api
```

## Key Architecture Decisions
- **Single-user mode:** eToro API keys stored in server env vars (`ETORO_API_KEY`, `ETORO_USER_KEY`), not per-user in DB. Login is a simple password gate (`APP_PASSWORD` env var).
- **eToro API auth:** Uses `x-api-key` (public key) + `x-user-key` (private key) + `x-request-id` (UUID per request). Base URL: `https://public-api.etoro.com/api/v1`
- **Caching:** Two-tier — node-cache in-memory (60s TTL) + DB portfolio snapshots for offline fallback
- **Tags:** User-defined tags on positions via `position_tags` join table. Portfolio overview supports `?tag=tagId` filter.
- **JWT:** 7-day expiry for single-user convenience. Client auto-refreshes on 401 (skips refresh for /auth/refresh and /auth/login to prevent infinite loops).

## Database (PostgreSQL on Railway)
5 tables: `users`, `sessions`, `portfolio_snapshots`, `tags`, `position_tags`
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

## Known Issues / Next Steps
- eToro API endpoint paths may need adjustment when tested with real API responses
- `dotenv` loads from repo root (`../../.env` relative to server/src) — lazy DB connection via Proxy pattern
- Encryption service (`server/src/services/encryption.ts`) exists but unused after single-user refactor — can be removed
- Sessions table exists but not actively used — JWT is stateless now
- Design spec: `docs/superpowers/specs/2026-04-01-portfolio-tracker-design.md`

## Future Features (not in v1)
- WebSocket real-time streaming
- Multi-broker support
- Push notifications