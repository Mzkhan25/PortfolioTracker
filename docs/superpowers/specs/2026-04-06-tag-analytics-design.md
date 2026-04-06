# Tag-Based Portfolio Analytics

## Overview

Extend the Dashboard tab with tag-based filtering and allocation views. Users can see portfolio metrics filtered by tag and toggle the allocation chart between "By Tag" and "By Instrument" views.

## Decisions

- **Where:** Extension of existing Dashboard, not a new tab/screen
- **Tag selector:** Horizontal chip bar on Dashboard (same pattern as Positions tab filter)
- **Allocation toggle:** "By Tag" vs "By Instrument" toggle above pie chart
- **Tag filter scope:** Affects header metrics (value, P&L) and allocation chart only
- **Unaffected by filter:** Portfolio history chart (30d), Top Gainers/Losers, Equity/Cash cards
- **Untagged positions:** Shown as "Untagged" slice (gray) in tag allocation view — portfolio always sums to 100%
- **Multi-tag positions:** A position tagged with both "Growth" and "Tech" contributes to both tag totals (allocation can exceed 100% in edge cases — acceptable for a personal dashboard)

## API

### New Endpoint: `GET /portfolio/overview/by-tag`

Returns per-tag portfolio aggregations.

**Response:**

```typescript
interface TagPortfolioBreakdown {
  items: TagPortfolioEntry[];
}

interface TagPortfolioEntry {
  tagId: string | null;        // null = untagged
  tagName: string;             // "Untagged" for null
  tagColor: string | null;     // null for untagged
  totalValue: number;          // sum of (amount + unrealizedPnl)
  totalInvested: number;       // sum of amount
  unrealizedPnl: number;
  unrealizedPnlPercent: number; // (pnl / invested) * 100
  allocationPercent: number;   // value / total portfolio value * 100
  positionCount: number;
}
```

**Server logic:**
1. Fetch all positions from eToro (reuse existing `getPortfolio()`)
2. Enrich with tags (reuse `enrichTags()`)
3. Group positions by tag — each position goes into every tag it has; untagged positions go into an "Untagged" bucket
4. For each tag bucket: sum amounts, P&L, compute percentages
5. Sort by `totalValue` descending

### Existing Endpoint: `GET /portfolio/overview?tag=tagId`

Already works — filters positions to a specific tag, recalculates overview. No changes needed.

## Shared Types

Add to `shared/types/portfolio.ts`:

```typescript
export interface TagPortfolioEntry {
  tagId: string | null;
  tagName: string;
  tagColor: string | null;
  totalValue: number;
  totalInvested: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  allocationPercent: number;
  positionCount: number;
}

export interface TagPortfolioBreakdown {
  items: TagPortfolioEntry[];
}
```

## Client Changes

### Dashboard (`client/app/(tabs)/index.tsx`)

**New state:**
- `selectedTagId: string | null` — which tag is filtering the dashboard (null = all)
- `allocationView: "tag" | "instrument"` — which pie chart view is active

**New UI elements:**
1. **Tag selector bar** — below header, horizontal scroll with `TagChip` components. "All" chip + one per user tag.
2. **Allocation toggle** — two buttons above pie chart: "By Tag" / "By Instrument"

**Behavior:**
- Selecting a tag sets `selectedTagId` → `usePortfolioOverview(tagId)` refetches with filter → header metrics update
- "By Tag" pie chart always shows the global tag breakdown (all tags), regardless of `selectedTagId` — this gives context on overall allocation
- "By Instrument" pie chart shows instruments filtered to `selectedTagId` when a tag is active, or all instruments when "All" is selected
- Selecting "All" clears the tag filter

### Hooks (`client/hooks/usePortfolio.ts`)

- `usePortfolioOverview(tagId?: string)` — add optional parameter, appends `?tag=tagId` when set
- `useTagBreakdown()` — new hook, fetches `GET /portfolio/overview/by-tag`, returns `TagPortfolioBreakdown`

### Server Route (`server/src/routes/portfolio.ts`)

Add handler for `GET /portfolio/overview/by-tag`:
- Reuse `getPortfolio()` + `enrichTags()`
- Group by tag, compute aggregations
- Return `TagPortfolioBreakdown`

## Files Changed

| File | Change |
|------|--------|
| `shared/types/portfolio.ts` | Add `TagPortfolioEntry`, `TagPortfolioBreakdown` |
| `server/src/routes/portfolio.ts` | Add `/overview/by-tag` route handler |
| `client/hooks/usePortfolio.ts` | Add `tagId` param to `usePortfolioOverview`, add `useTagBreakdown` hook |
| `client/app/(tabs)/index.tsx` | Add tag selector, allocation toggle, conditional data sources |

## Files NOT Changed

- DB schema (no migrations)
- Tag management (TagModal, TagManager, tags routes)
- Other tabs (Positions, History, Market)
- PriceChart, Skeleton, ErrorState components
- Position detail screen

## Edge Cases

- **No tags exist:** Tag selector bar hidden, "By Tag" toggle disabled or hidden, dashboard behaves as today
- **All positions untagged:** "By Tag" view shows single "Untagged" slice at 100%
- **Position with multiple tags:** Counted in each tag's totals — allocation percentages may sum > 100%, which is acceptable
- **Tag deleted while filtered:** `selectedTagId` no longer matches any tag — fall back to "All"
