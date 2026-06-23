# PortfolioTracker — Agent Quick Reference

> **Maintenance Rule:** Update this file (and `CLAUDE.md`) after every task that changes behaviour, adds a screen, modifies an API, or removes a component. A new agent picking up the next task must be able to read this file instead of re-reading the entire codebase. Stale docs compound errors across sessions.

This document is the single-file reference for agents. Read it before touching any code. `CLAUDE.md` has the architectural rationale; this file has the operational detail.

---

## Current Implementation State (as of 2026-06-23)

Feature-complete v1. All screens, the tag system, history chart, and tag analytics are live.

---

## Screens & Behaviour

### `app/(tabs)/index.tsx` — Dashboard
- Pull-to-refresh on `usePortfolioOverview` + `useGroupedPositions` + `usePortfolioHistory` + `useTagBreakdown`
- **Tag filter bar** (horizontal scroll): shown only when `tags.length > 0`. "All" chip + one chip per tag. Selecting a tag passes `tagId` to `usePortfolioOverview` — filters the header metrics only. Allocation and top-movers react client-side.
- **Main card:** total value (EUR), daily change (EUR + %), chart, cash / invested summary
- **Period selector** (1W/1M/3M/6M/1Y): maps to days (7/30/90/180/365). Controls how many days of history are fetched.
- **PortfolioChart:** fed `historyChartData` derived from `usePortfolioHistory`. Labels thinned to ~5 x-axis labels. Color auto-detects positive/negative.
- **Allocation section:** shown when data is non-empty. Toggle "By Stock" / "By Tag". By-stock: top 8 `GroupedPosition` by value. By-tag: from `useTagBreakdown`, untagged shown as "Untagged" slate-500 slice.
- **Top Gainers / Top Losers:** global (unfiltered by tag). Top 3 each, filtered by `unrealizedPnlPercent > 0` / `< 0`, sorted descending/ascending.
- **Loading state:** full skeleton card with `SkeletonChart`.

### `app/(tabs)/positions.tsx` — Positions
- FlatList of `GroupedPosition[]` from `useGroupedPositions`.
- **Filter bar (top):** pricetag icon → `TagManager` modal; "All" chip + tag chips to filter list client-side.
- **Sort bar:** Value (default) | P&L % | Name. Count of stocks and positions shown right-aligned.
- **Table columns:** Asset (logo + ticker + leverage badge + tags) | Price (USD `$`) | Units | Avg. Open (USD `$`) | P/L (EUR `€`)
- **Row tap:** navigates to `/position/[instrumentId]` via `router.push`.
- **Row long-press:** opens `TagModal` for the group — assigns/removes tag to ALL positions in the group.
- **PortfolioSummaryBar:** fixed footer showing Cash + Invested + P/L = Total (all EUR).
- **Empty states:** no positions icon when list empty; no-tag icon when filter returns zero.

### `app/(tabs)/history.tsx` — History
- `useTradeHistory(page, 20, minDate)` — paginated 20/page.
- **Summary bar:** realized P&L for the period (sum of `netProfit` on current page). Trade count.
- **Date range filter:** 1M / 3M (default) / 6M / 1Y / ALL. Changing resets to page 1.
- **Sort:** Date (default, descending by closeDate) | P&L (descending by netProfit). Client-side only.
- **Trade row:** ticker + Buy/Sell badge | net profit (EUR). Below: open → close date, open → close rate. Detail row: invested, units, fees (fees hidden if 0).
- **Pagination:** Prev / Next shown only when `totalPages > 1`.

### `app/(tabs)/market.tsx` — Market
- Instruments sourced from `usePositions()` (flat list, deduped by `instrumentId`).
- **Instrument picker:** horizontal scroll of ticker chips. First instrument auto-selected.
- **Price header:** instrument name, current price (labeled `€` but sourced from `lastPrice` on rate — may be USD, known issue), daily change %.
- **PortfolioChart:** fed candle `close` values from `useCandles(activeInstrument, period)`.
- **Period selector:** 1D / 1W / 1M (default) / 3M / 1Y (CandlePeriod type).
- **Rate details:** Bid / Ask / Spread (all `€` prefix).
- **Empty state:** shown when no positions exist in the portfolio.

### `app/position/[instrumentId].tsx` — Position Detail (modal)
- Accessed from Positions tab row tap (`router.push('/position/[id]')`). Stack screen title = ticker.
- Data: `useGroupedPositions()` (finds group by `instrumentId`). Candles: `useCandles(instrumentId, period)`.
- **Header Row 1:** logo (40×40, circular) | ticker • instrument name | price in USD `$` + P/L % (green/red).
- **Header Row 2:** `{totalUnits} Units @ ${averageOpenRate}` | invested EUR | net value EUR | P/L EUR + %.
- **Chart:** `PortfolioChart` with `showYAxis={false}`, height 200. Period selector above (1D/1W/1M/3M/1Y).
- **Positions table:** header = Position / Units / Open / P/L. Each row: direction (Buy/Sell) + leverage badge + open date + tags | units | open rate (USD) | P/L (EUR). Tap row → `TagModal` (single-tag mode).
- **Single-tag mode:** tapping an already-assigned tag removes it. Tapping an unassigned tag first removes any existing tag for that position, then assigns the new one (sequential mutations with `onSuccess`).

---

## Component API Reference

### `PortfolioChart`
```ts
interface PortfolioChartProps {
  data: { value: number; label?: string; dataPointText?: string }[];
  isLoading?: boolean;
  height?: number;       // default 200
  color?: string;        // overrides auto green/red
  showYAxis?: boolean;   // default true
}
```
- Shows skeleton while `isLoading`.
- Shows empty state (bar-chart icon) when `data.length === 0`.
- Tooltip on touch shows `€` formatted value.
- Used by: Dashboard (portfolio history), Market (candles), Position Detail (candles).

### `PortfolioSummaryBar`
```ts
interface PortfolioSummaryBarProps {
  availableCash: number;
  totalInvested: number;
  profitLoss: number;
  totalValue: number;
}
```
- Fixed bottom bar. All values in EUR. P/L colored green/red.
- Used by: Positions tab only.

### `TagChip`
```ts
// color: hex string or undefined
// small: reduces padding/font size for inline use
<TagChip name={tag.name} color={tag.color} selected={bool} onPress={fn} small? />
```

### `TagModal`
- Multi-tag by default (assign/remove any tags). Single-tag mode enforced by the caller.
- Props: `visible`, `onClose`, `tags[]`, `assignedTagIds[]`, `onToggleTag(tagId, currentlyAssigned)`, `positionName`.

### `Skeleton` variants
`Skeleton` (box), `SkeletonChart`, `SkeletonPositionRow`, `SkeletonTradeRow`, `SkeletonPriceHeader`

---

## React Query Hooks

| Hook | File | staleTime | Notes |
|------|------|-----------|-------|
| `usePortfolioOverview(tagId?)` | usePortfolio.ts | 60s | Passes `?tag=tagId` when tagId set |
| `usePositions()` | usePortfolio.ts | 60s | Flat list (unenriched for market tab) |
| `useGroupedPositions()` | usePortfolio.ts | 60s | Aggregated by instrumentId |
| `usePortfolioHistory(days)` | usePortfolio.ts | 300s | One snapshot per day |
| `useTagBreakdown()` | usePortfolio.ts | 60s | Per-tag allocation for dashboard |
| `useRates(ids[])` | useMarketData.ts | 30s | Pass empty array to skip fetch |
| `useCandles(id, period)` | useMarketData.ts | 60s | Disabled when id is empty string |
| `useTags()` | useTags.ts | 60s | |
| `useTagPosition()` | useTags.ts | mutation | Invalidates positions + tags on success |
| `useUntagPosition()` | useTags.ts | mutation | Invalidates positions + tags on success |
| `useCreateTag()` | useTags.ts | mutation | |
| `useUpdateTag()` | useTags.ts | mutation | |
| `useDeleteTag()` | useTags.ts | mutation | Cascades position_tags on server |
| `useTradeHistory(page, limit, minDate)` | useTradeHistory.ts | 300s | |

---

## Server Routes

### Auth (`/api/auth`)
| Method | Path | Purpose |
|--------|------|---------|
| POST | `/login` | Password → JWT (7d). Upserts user from eToro `/me`. |
| POST | `/refresh` | Re-issue JWT (ignores expiry). |
| POST | `/logout` | Stateless; client deletes token. |
| GET | `/me` | Returns current user from JWT. |

### Portfolio (`/api/portfolio`)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/overview?tag=` | Optional tag filter. Cached 60s. Saves snapshot to DB on every call. |
| GET | `/overview/by-tag` | Per-tag P&L + allocation. Includes "Untagged" entry. |
| GET | `/positions` | Flat list, enriched (names/tickers/imageUrls/rates/tags). |
| GET | `/positions/grouped` | Grouped by instrumentId. Weighted avg open rate. |
| GET | `/positions/:id` | Single position. |
| GET | `/history?days=N` | One snapshot per day from DB. Default 30d. |

### History (`/api/history`)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/trades?page=&pageSize=&minDate=` | Paginated, enriched with names. |

### Market (`/api/market`)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/rates?instrumentIds=1,2,3` | Comma-separated IDs. Returns bid/ask/lastPrice/dailyChange. |
| GET | `/candles/:instrumentId?period=` | Period: 1D/1W/1M/3M/1Y. |

### Tags (`/api/tags`)
| Method | Path | Notes |
|--------|------|-------|
| GET | `/` | All tags for user. |
| POST | `/` | `{ name, color? }` |
| PUT | `/:id` | `{ name?, color? }` |
| DELETE | `/:id` | Cascades `position_tags`. |
| POST | `/:id/positions` | `{ etoroPositionId }` |
| DELETE | `/:id/positions/:etoroPositionId` | |

---

## Cache TTLs

| Layer | TTL | Scope | Contents |
|-------|-----|-------|----------|
| `node-cache` | 60s | per user | portfolio overview, positions, grouped, tag breakdown |
| `node-cache` | 30s | per user | rates |
| `node-cache` | 300s | per user | portfolio history, trade history |
| `node-cache` | 24h | global | instrument metadata (names, tickers, imageUrls) |
| DB `portfolio_snapshots` | permanent | per user | one row per day, used for history chart + daily change |

Pass `?refresh` on any request to bypass cache and force a fresh fetch.

---

## Database Schema

```
users             id(uuid PK), etoroUserId(unique), username, displayName, avatarUrl, createdAt, updatedAt
portfolio_snapshots  id, userId(FK), totalValue, equity, availableCash, unrealizedPnl, positionsJson(JSONB), fetchedAt, createdAt
tags              id, userId(FK), name, color(hex?), createdAt — UNIQUE(userId, name)
position_tags     id, userId(FK), etoroPositionId(varchar), tagId(FK→tags), createdAt — UNIQUE(etoroPositionId, tagId)
```

> `sessions` table exists in production DB but is unused — leftover from multi-user refactor.

---

## Currency Rules

| Value type | Currency | Symbol | Where converted |
|------------|----------|--------|----------------|
| Portfolio total value | EUR | `€` | Server-side (÷ EUR/USD rate) |
| P&L (unrealized/realized) | EUR | `€` | Server-side |
| Cash / invested / equity | EUR | `€` | Server-side |
| Stock open rate | USD | `$` | Not converted — raw from eToro |
| Stock current rate | USD | `$` | Not converted — raw from eToro |
| Avg. open rate | USD | `$` | Not converted |

EUR/USD rate source: eToro instrument ID 1, field `lastExecution`.

---

## eToro API Quirks

- **Instruments wrapper:** `instrumentDisplayDatas` (not `instruments`)
- **PnL endpoint:** `/trading/info/real/pnl` — positions at `.clientPortfolio.positions`
- **PnL fields:** `p.unrealizedPnL.pnL`, `p.unrealizedPnL.closeRate`; top-level `p.positionID`, `p.instrumentID`
- **Candles:** double-nested `{ candles: [{ instrumentId, candles: [...] }] }`
- **Auth headers per request:** `x-api-key`, `x-user-key`, `x-request-id` (UUID generated per call)
- **Rate limit:** 60 GET/min, 20 POST/min per user key

---

## Known Issues / Backlog

| Issue | Priority | Notes |
|-------|----------|-------|
| History chart empty on first day | Low | Needs 2+ daily snapshots to show a line |
| Daily change shows 0 on first run | Low | Same root cause as above |
| Market tab `€` prefix on USD rate values | Medium | Rates from eToro are USD; EUR conversion not applied here |
| `sessions` table in prod DB unused | Low | Safe to drop via migration |
| `.env` credentials rotation | Medium | Not committed to git; rotate periodically |

---

## File Change Checklist (run mentally before every PR)

- [ ] Did you change a component's props interface? → Update component API reference above.
- [ ] Did you add/remove a screen? → Update Screens & Behaviour section.
- [ ] Did you add/change an API route? → Update Server Routes table.
- [ ] Did you change a staleTime or cache TTL? → Update Cache TTLs table.
- [ ] Did you add a new known issue? → Add to Known Issues table.
- [ ] Did you resolve a known issue? → Remove from Known Issues table.
- [ ] Did you change how currency is displayed? → Update Currency Rules table.

---

## Planned Features — Ready for Implementation

> These decisions were made in a brainstorming session on 2026-06-23. Do not re-discuss — pick up from here. Implement in the order listed below.

### Implementation Order

1. **Feature 2 (Tag Removal UX)** — small, self-contained, no design dependency. Start here.
2. **Feature 1 (UI Redesign)** — the large one. Design tokens first, then sidebar nav, then screen-by-screen.
3. **Feature 3 (Deployment)** — last, after the redesign is presentable.

---

### Feature 1 — Full UI Redesign

**Style target:** Coinbase/eToro aesthetic — professional, clear data hierarchy, blues and whites, traditional finance feel. NOT a trading-app flash look.

**Platform priority:** Web-first. Mobile (tab bar) is kept but web gets the primary design treatment.

**Theme:** Light + dark mode, system-preference-aware, user-toggleable. Current pure-dark theme is replaced.

**Navigation change:** Replace the tab bar on web with a **left sidebar** (standard web pattern used by Coinbase, Revolut web, Linear). Expo Router supports per-platform navigation — sidebar on web, tab bar on mobile. This is the most impactful structural change.

**Design approach:** Introduce a **design token layer** (colours, spacing, typography scales) before touching any screen. Tokens are the source of truth for both light and dark mode. No full component library needed — tokens + inline styles or a minimal `StyleSheet` per file is fine.

**Problems this solves (all confirmed by user):**
1. Cramped layout / text too small — insufficient breathing room
2. Dark theme low contrast — sections blur together, hard to distinguish
3. Navigation confusing on web — tab bar is a mobile pattern
4. Data hard to scan — tables, numbers, charts don't present at a glance

**Screens to redesign (in order):**
1. Dashboard (`app/(tabs)/index.tsx`) — most visible, do first
2. Positions (`app/(tabs)/positions.tsx`) — table layout benefits most from web-first treatment
3. History (`app/(tabs)/history.tsx`)
4. Market (`app/(tabs)/market.tsx`)
5. Position Detail (`app/position/[instrumentId].tsx`)
6. Auth (`app/(auth)/`)

**What NOT to do:** Do not build a full component library. Do not change any server code. Do not change shared types.

---

### Feature 2 — Tag Removal UX

**Problem:** Current UX hides tag removal inside a toggle (tap assigned tag again to remove it). Users don't discover this. There is no clear "remove" affordance anywhere.

**Three-part fix:**

**Part A — TagModal (`client/components/TagModal.tsx`):**
- Add an ✕ button on each assigned tag chip inside the modal (so it's visually obvious it can be removed)
- Add a "Remove all tags" button at the bottom of the modal

**Part B — Positions list (`client/app/(tabs)/positions.tsx`):**
- Tag chips rendered inline on position rows should show a small ✕
- Tapping ✕ calls `untagPosition.mutate()` immediately, without opening the modal
- Tapping the chip name itself still opens the modal (existing behaviour preserved)

**Part C — Position detail (`client/app/position/[instrumentId].tsx`):**
- Same ✕ on tag chips shown on individual position rows

**Component change needed:**
- `client/components/TagChip.tsx` — add an optional `onRemove?: () => void` prop. When provided, render a small ✕ button inside the chip. When not provided, chip looks exactly as it does today (no breaking change).

**Files to touch:** `TagChip.tsx`, `TagModal.tsx`, `positions.tsx`, `[instrumentId].tsx`

---

### Feature 3 — Client Deployment (GitHub Pages)

**Decision:** Deploy the Expo web build to **GitHub Pages** via **GitHub Actions**. The server stays on Railway as-is.

**Rationale:** The client is a static SPA — it fetches everything from the Railway API at runtime. GitHub Pages hosts static files for free. No new platform, no extra cost.

**Steps:**
1. Add `.github/workflows/deploy-client.yml`:
   - Trigger: push to `main`
   - Steps: checkout → setup Node → install deps → `npx expo export --platform web` → deploy `dist/` to `gh-pages` branch (use `peaceiris/actions-gh-pages` or `JamesIves/github-pages-deploy-action`)
2. Set `EXPO_PUBLIC_API_URL=https://portfolio-trackerserver-production.up.railway.app` as a GitHub Actions secret (or hardcode if not sensitive — it's already public in Railway)
3. In GitHub repo Settings → Pages → set Source to `gh-pages` branch, root `/`
4. Verify the deployed URL loads and can authenticate against the Railway API (check CORS — `CORS_ORIGIN` env var on Railway must include the GitHub Pages domain)

**Railway CORS var:** Add the GitHub Pages URL (e.g. `https://<username>.github.io`) to the `CORS_ORIGIN` env var on Railway after deployment.
