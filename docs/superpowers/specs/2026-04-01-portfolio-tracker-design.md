# PortfolioTracker v1 — Design Spec

## Context

A personal investment portfolio management app that connects to eToro's official API to display portfolio data in a unified mobile + web experience. The primary motivation is to have a clean, custom dashboard for viewing eToro portfolio performance, positions, and trade history — something eToro's native interface doesn't offer with sufficient flexibility.

v1 is **view-only** (no trade execution) and includes a position tagging system for custom analytics grouping — allowing users to tag positions and view aggregated P&L by tag.

## Scope

### In Scope (v1)
- eToro-only authentication (no separate app accounts)
- Portfolio overview dashboard (total value, equity, cash, unrealized P&L)
- Individual open positions with per-asset P&L and allocation %
- Trade history (closed trades with realized P&L)
- Market data and price charts for portfolio instruments
- Session persistence (users stay logged in)
- Cross-platform: iOS, Android, Web from a single codebase
- Position tagging: user-defined tags on positions, filter portfolio by tags, see grouped P&L per tag

### Out of Scope (v1)
- Trade execution (buy/sell orders)
- Multi-broker support
- Push notifications / alerts
- Social features (eToro copy trading data)
- WebSocket real-time streaming (future enhancement)

## Architecture

### System Overview

```
User Devices (iOS / Android / Web)
        │
        │  HTTPS (REST API)
        ▼
Express Server (Railway)
├── Auth Middleware (JWT + Sessions)
├── Portfolio Routes (/portfolio, /positions, /history)
├── Market Data Routes (/market, /instruments, /candles)
├── eToro API Service (wrapper + cache layer)
│       │
│       │  HTTPS
│       ▼
│   eToro API (api-portal.etoro.com)
│
└── PostgreSQL (Railway Add-on)
    ├── users
    ├── sessions (encrypted eToro tokens)
    └── portfolio_snapshots (cached data)
```

**Key principle:** The client never communicates with eToro directly. All eToro API calls are proxied through the Express server, which stores eToro tokens server-side and handles caching.

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React Native + Expo (SDK 52+) | Single codebase for iOS, Android, Web |
| Routing | Expo Router | File-based routing, works on all platforms |
| Data fetching | React Query (TanStack Query) | Caching, refetching, optimistic updates |
| State management | Zustand | Lightweight, minimal boilerplate |
| Charts | react-native-chart-kit | Cross-platform chart rendering |
| Backend | Node.js + Express 5 + TypeScript | Same language as frontend, large ecosystem |
| ORM | Drizzle ORM | Type-safe, zero runtime overhead, raw SQL compilation |
| Database | PostgreSQL | Relational, JSONB support, Railway add-on |
| Validation | Zod | Runtime type checking for API requests |
| HTTP client | Axios | eToro API calls from server |
| Auth | jsonwebtoken + AES-256-GCM | JWT for app auth, encrypted eToro token storage |
| Caching | node-cache + DB snapshots | In-memory hot cache + persistent portfolio snapshots |
| Hosting | Railway (free tier) | Easy GitHub deploys, Postgres add-on, $5/mo credit |

### Project Structure

```
PortfolioTracker/
├── client/                    ← Expo React Native app
│   ├── app/                   ← Expo Router (file-based routing)
│   │   ├── (auth)/
│   │   │   └── login.tsx
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx      ← Dashboard / Overview
│   │   │   ├── positions.tsx  ← Open positions list
│   │   │   ├── history.tsx    ← Trade history
│   │   │   └── market.tsx     ← Charts & market data
│   │   └── _layout.tsx        ← Root layout
│   ├── components/
│   │   ├── PortfolioCard.tsx
│   │   ├── PositionRow.tsx
│   │   ├── PnLBadge.tsx
│   │   └── PriceChart.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── usePortfolio.ts
│   │   └── useMarketData.ts
│   ├── services/
│   │   └── api.ts             ← API client (talks to Express server)
│   ├── app.json
│   ├── package.json
│   └── tsconfig.json
│
├── server/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts        ← Login, logout, refresh
│   │   │   ├── portfolio.ts   ← Portfolio & positions
│   │   │   ├── history.ts     ← Trade history
│   │   │   ├── market.ts      ← Instruments & candles
│   │   │   └── tags.ts        ← Tag CRUD + position tagging
│   │   ├── services/
│   │   │   ├── etoro.ts       ← eToro API wrapper
│   │   │   └── cache.ts       ← Caching logic
│   │   ├── middleware/
│   │   │   └── auth.ts        ← JWT verification
│   │   ├── db/
│   │   │   ├── schema.ts      ← Drizzle schema definitions
│   │   │   └── migrate.ts     ← Migration runner
│   │   └── index.ts           ← Express app entry point
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── shared/
│   ├── types/
│   │   ├── portfolio.ts       ← Portfolio, Position, PnL types
│   │   ├── market.ts          ← Instrument, Candle, Rate types
│   │   ├── auth.ts            ← Session, User types
│   │   ├── tags.ts            ← Tag, PositionTag types
│   │   └── api.ts             ← Request/Response wrapper types
│   ├── package.json
│   └── tsconfig.json
│
├── package.json               ← npm workspaces root
├── tsconfig.base.json         ← Shared TypeScript config
├── .gitignore
└── .env.example
```

npm workspaces links the three packages (`client`, `server`, `shared`) so they can import each other by name without publishing.

## API Design

### Auth Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Authenticate with eToro credentials. Returns app JWT. Stores eToro tokens in DB session. |
| POST | `/api/auth/refresh` | Refresh expired JWT. Also refreshes eToro token if needed. |
| POST | `/api/auth/logout` | Clear session and stored tokens. |
| GET | `/api/auth/me` | Return current user profile. |

### Portfolio Routes (auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/portfolio/overview` | Total value, equity, available cash, unrealized P&L, daily change. |
| GET | `/api/portfolio/positions` | All open positions with per-asset P&L, current price, allocation %. |
| GET | `/api/portfolio/positions/:id` | Single position detail. |

### History Routes (auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/history/trades` | Paginated closed trades. Params: `page`, `limit`, `sort`. |
| GET | `/api/history/trades/:id` | Single trade detail. |

### Market Data Routes (auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/market/instruments` | Search and list instruments. |
| GET | `/api/market/rates` | Current prices for portfolio instruments. |
| GET | `/api/market/candles/:instrumentId` | OHLCV chart data. Params: `period`, `from`, `to`. |

### Tag Routes (auth required)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tags` | List all tags for the current user. |
| POST | `/api/tags` | Create a new tag. Body: `{ name, color? }`. |
| PUT | `/api/tags/:id` | Update a tag (rename, change color). |
| DELETE | `/api/tags/:id` | Delete a tag and all its position associations. |
| GET | `/api/tags/:id/positions` | List all positions with this tag, including aggregated P&L. |
| POST | `/api/tags/:id/positions` | Tag a position. Body: `{ etoroPositionId }`. |
| DELETE | `/api/tags/:id/positions/:etoroPositionId` | Remove a tag from a position. |
| GET | `/api/portfolio/overview?tag=:tagId` | Portfolio overview filtered by tag (reuses existing route with optional filter). |

## Database Schema

### `users` table

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK, auto-generated |
| etoro_user_id | VARCHAR | UNIQUE, NOT NULL |
| username | VARCHAR | NOT NULL |
| display_name | VARCHAR | |
| avatar_url | VARCHAR | |
| created_at | TIMESTAMP | DEFAULT now() |
| updated_at | TIMESTAMP | DEFAULT now() |

### `sessions` table

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK, auto-generated |
| user_id | UUID | FK → users.id, NOT NULL |
| jwt_token | TEXT | NOT NULL |
| etoro_access | TEXT | NOT NULL, encrypted (AES-256-GCM) |
| etoro_refresh | TEXT | NOT NULL, encrypted (AES-256-GCM) |
| expires_at | TIMESTAMP | NOT NULL |
| created_at | TIMESTAMP | DEFAULT now() |

### `portfolio_snapshots` table

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK, auto-generated |
| user_id | UUID | FK → users.id, NOT NULL |
| total_value | DECIMAL | NOT NULL |
| equity | DECIMAL | NOT NULL |
| available_cash | DECIMAL | NOT NULL |
| unrealized_pnl | DECIMAL | NOT NULL |
| positions_json | JSONB | NOT NULL |
| fetched_at | TIMESTAMP | NOT NULL |
| created_at | TIMESTAMP | DEFAULT now() |

### `tags` table

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK, auto-generated |
| user_id | UUID | FK → users.id, NOT NULL |
| name | VARCHAR | NOT NULL |
| color | VARCHAR | Optional, for UI display |
| created_at | TIMESTAMP | DEFAULT now() |

Unique constraint on (user_id, name) — a user cannot have duplicate tag names.

### `position_tags` table (join table)

| Column | Type | Constraints |
|--------|------|------------|
| id | UUID | PK, auto-generated |
| user_id | UUID | FK → users.id, NOT NULL |
| etoro_position_id | VARCHAR | NOT NULL (eToro's position identifier) |
| tag_id | UUID | FK → tags.id, NOT NULL |
| created_at | TIMESTAMP | DEFAULT now() |

Unique constraint on (etoro_position_id, tag_id) — a position can only have the same tag once.

**Design notes:**
- eToro tokens are encrypted at rest using AES-256-GCM with a server-side key stored in environment variables.
- `positions_json` in `portfolio_snapshots` stores the full positions array as JSONB for fast portfolio loading. The `position_tags` table references positions by their eToro position ID rather than normalizing positions into a separate table — this avoids syncing complexity while still enabling tagging.
- Tags are per-user. The `position_tags` join table links eToro position IDs to tags, enabling queries like "show me the total P&L for all positions tagged 'Tech'."

## Authentication Flow

### Login
1. Client sends eToro credentials to `POST /api/auth/login`. The exact credential format depends on eToro's API authentication method (OAuth flow or API key — to be confirmed during implementation by consulting eToro API docs at api-portal.etoro.com).
2. Server authenticates with eToro API, receives eToro access + refresh tokens
3. Server upserts user in `users` table (by `etoro_user_id`)
4. Server encrypts eToro tokens and stores them in a new `sessions` row
5. Server signs a JWT containing `{ userId, sessionId }` with 15-minute expiry
6. Server returns the JWT to the client
7. Client stores JWT in AsyncStorage (mobile) / secure cookie (web)

### Authenticated Requests
1. Client sends request with `Authorization: Bearer <jwt>` header
2. Auth middleware verifies JWT signature and expiry
3. Middleware loads the session from DB, decrypts eToro tokens
4. Route handler checks in-memory cache → DB snapshot cache → calls eToro API
5. Fresh data is cached (in-memory + DB snapshot) and returned to client

### Token Refresh
1. Client receives 401 from an expired JWT
2. Client calls `POST /api/auth/refresh` with the expired JWT
3. Server validates the JWT signature (ignoring expiry), loads the session
4. If eToro token is also expired, server refreshes it with eToro API
5. Server issues a new JWT, updates the session, returns new JWT
6. Client retries the original request with the new JWT

## Security

- **eToro tokens never reach the client** — only the app's JWT is exposed
- **AES-256-GCM encryption** for eToro tokens at rest in PostgreSQL
- **15-minute JWT expiry** with refresh token rotation
- **HTTPS enforced** in production (Railway handles TLS)
- **Rate limiting** on auth endpoints (express-rate-limit)
- **CORS whitelist** — only the Expo web app domain
- **Zod validation** on all incoming request bodies and query params
- **Helmet.js** for secure HTTP headers

## Caching Strategy

Two-tier cache to minimize eToro API calls:

1. **In-memory cache (node-cache):** 60-second TTL for hot data (portfolio overview, current rates). Serves repeated requests instantly.
2. **DB snapshots (portfolio_snapshots):** Periodic snapshots stored in Postgres. Serves as fallback when eToro API is slow/down and provides data for offline-capable mobile experience.

Cache invalidation: time-based (TTL expiry). Pull-to-refresh on the client bypasses cache and fetches fresh data from eToro.

## Client Screens

### Tab 1: Dashboard (index.tsx)
- Portfolio total value (large, prominent)
- Daily P&L change (amount + percentage, color-coded green/red)
- Equity and available cash
- Asset allocation pie/donut chart
- Top 3 gainers/losers quick list

### Tab 2: Positions (positions.tsx)
- Scrollable list of all open positions
- Each row: instrument name, current price, P&L (amount + %), allocation %, tag chips
- Sort by: P&L, value, name
- Filter by: tag (dropdown/chip selector at top)
- Tap for position detail (modal or navigation)
- Long-press or tag icon to add/remove tags on a position

### Tab 3: History (history.tsx)
- Paginated list of closed trades
- Each row: instrument, entry/exit price, dates, realized P&L
- Filter by: date range
- Sort by: date, P&L

### Tag Management
- Accessible from a settings/manage icon on the Positions tab or a dedicated section
- Create, rename, delete tags with optional color assignment
- View aggregated P&L per tag (total value, unrealized P&L for all positions in a tag)
- Tag analytics: which tag groups are performing best/worst

### Tab 4: Market (market.tsx)
- Price chart (line/candlestick) for selected instrument
- Instrument picker (from portfolio holdings)
- Time range selector (1D, 1W, 1M, 3M, 1Y)
- Current rate and daily change

## Verification Plan

1. **Server unit tests:** Test eToro service wrapper with mocked API responses, test auth middleware, test cache logic
2. **API integration tests:** Test each route end-to-end with a test database
3. **Client component tests:** React Native Testing Library for key components
4. **Manual E2E testing:** Login with real eToro account, verify all 4 tabs show correct data, test session persistence (close and reopen app), test token refresh flow
5. **Cross-platform check:** Verify on iOS (Expo Go), Android (Expo Go), and Web browser

## Future Considerations (not in v1)

- **WebSocket streaming:** Real-time price updates using eToro's WebSocket API.
- **Multi-broker support:** Abstract the eToro service behind a broker interface, add new implementations for other platforms.
- **Push notifications:** Price alerts and significant P&L changes.
