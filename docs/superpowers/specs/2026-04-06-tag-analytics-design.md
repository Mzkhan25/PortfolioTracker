# Tag-Based Portfolio Analytics + Per-Position Tagging UX

## Overview

Two related improvements:
1. **Per-position tagging UX** — Make it easy to tag individual positions within a stock from the position detail screen
2. **Tag-based dashboard analytics** — Extend the Dashboard with tag filtering and a "By Tag" allocation view

## Decisions

- **Tagging UX:** Position detail screen (`/position/[instrumentId]`) gets tag controls on each individual position row
- **Always show individual positions:** Remove the `positionCount > 1` guard — even a stock with 1 position shows the individual positions section
- **Dashboard extension:** Tag selector bar + allocation chart toggle ("By Tag" / "By Instrument")
- **Tag filter scope:** Affects header metrics (value, P&L) and "By Instrument" allocation chart only
- **Unaffected by filter:** Portfolio history chart (30d), Top Gainers/Losers, Equity/Cash cards
- **Untagged positions:** Shown as "Untagged" slice (gray) in tag allocation view — portfolio always sums to 100%
- **Multi-tag positions:** A position tagged with both "Growth" and "Tech" contributes to both tag totals (allocation can exceed 100% in edge cases — acceptable for a personal dashboard)

## Part 1: Per-Position Tagging UX

### Position Detail Screen (`client/app/position/[instrumentId].tsx`)

**Changes:**
- Remove the `group.positionCount > 1` condition — always show the "Individual Positions" section
- Add a tag icon button to each `PositionRow` — tapping it opens `TagModal` for that specific position
- Add `TagModal` to the position detail screen (import + state management)
- Section title changes to "Positions (N)" for consistency

### PositionRow (`client/components/PositionRow.tsx`)

**Changes:**
- Add optional `onTagPress` callback prop
- When `onTagPress` is provided, render a small tag icon button (Ionicons `pricetag-outline`) in the bottom row
- Existing tag chips continue to display below the row

### Files Changed (Part 1)

| File | Change |
|------|--------|
| `client/app/position/[instrumentId].tsx` | Add TagModal, tag button handler, always show positions section |
| `client/components/PositionRow.tsx` | Add `onTagPress` prop, render tag icon button |

## Part 2: Tag-Based Dashboard Analytics

### API

#### New Endpoint: `GET /portfolio/overview/by-tag`

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

#### Existing Endpoint: `GET /portfolio/overview?tag=tagId`

Already works — filters positions to a specific tag, recalculates overview. No changes needed.

### Shared Types

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

### Dashboard (`client/app/(tabs)/index.tsx`)

**New state:**
- `selectedTagId: string | null` — which tag is filtering the dashboard (null = all)
- `allocationView: "tag" | "instrument"` — which pie chart view is active

**New UI elements:**
1. **Tag selector bar** — below header, horizontal scroll with `TagChip` components. "All" chip + one per user tag. Hidden when no tags exist.
2. **Allocation toggle** — two buttons above pie chart: "By Tag" / "By Instrument". Hidden when no tags exist.

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

### Files Changed (Part 2)

| File | Change |
|------|--------|
| `shared/types/portfolio.ts` | Add `TagPortfolioEntry`, `TagPortfolioBreakdown` |
| `server/src/routes/portfolio.ts` | Add `/overview/by-tag` route handler |
| `client/hooks/usePortfolio.ts` | Add `tagId` param to `usePortfolioOverview`, add `useTagBreakdown` hook |
| `client/app/(tabs)/index.tsx` | Add tag selector, allocation toggle, conditional data sources |

## Files NOT Changed

- DB schema (no migrations needed)
- Tag management backend (tags routes — existing CRUD + assign/unassign work as-is)
- TagModal, TagManager, TagChip components (reused, not modified)
- Other tabs (Positions, History, Market)
- PriceChart, Skeleton, ErrorState components

## Edge Cases

- **No tags exist:** Tag selector bar and "By Tag" toggle hidden on dashboard. Position detail still shows positions section but tag buttons have no effect until tags are created.
- **All positions untagged:** "By Tag" view shows single "Untagged" slice at 100%
- **Position with multiple tags:** Counted in each tag's totals — allocation percentages may sum > 100%, which is acceptable
- **Tag deleted while filtered:** `selectedTagId` no longer matches any tag — fall back to "All"
- **Single position stock:** Individual positions section still shown with tag button
