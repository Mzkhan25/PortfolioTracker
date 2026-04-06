# Tag Analytics + Per-Position Tagging Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable per-position tagging from the position detail screen and add tag-based analytics to the Dashboard (tag filter + "By Tag" / "By Instrument" allocation toggle).

**Architecture:** Two-part feature. Part 1 adds tag controls to the position detail screen (client-only, reuses existing TagModal + tag mutation hooks). Part 2 adds a new server endpoint `GET /portfolio/overview/by-tag` and extends the Dashboard with a tag selector bar and allocation chart toggle.

**Tech Stack:** React Native, Expo Router, React Query, Express, Drizzle ORM, TypeScript shared types

---

### Task 1: Add `onTagPress` prop to PositionRow

**Files:**
- Modify: `client/components/PositionRow.tsx`

- [ ] **Step 1: Add `onTagPress` optional prop and tag icon button**

In `client/components/PositionRow.tsx`, add the `onTagPress` prop to the interface and render a tag icon button in the bottom row when the prop is provided:

```typescript
// Update the interface (line 7-9)
interface PositionRowProps {
  position: Position;
  onPress?: () => void;
  onTagPress?: () => void;
}
```

Update the component signature (line 10):
```typescript
export function PositionRow({ position, onPress, onTagPress }: PositionRowProps) {
```

Add the Ionicons import at the top:
```typescript
import { Ionicons } from "@expo/vector-icons";
```

Replace the bottom `<View>` section (lines 40-47) to include a tag button:
```typescript
      <View style={styles.bottom}>
        <Text style={styles.meta}>
          {position.units.toFixed(2)} units @ €{position.openRate.toFixed(2)}
        </Text>
        <View style={styles.bottomRight}>
          {onTagPress && (
            <Pressable onPress={onTagPress} style={styles.tagButton}>
              <Ionicons name="pricetag-outline" size={14} color="#94a3b8" />
            </Pressable>
          )}
          <Text style={styles.allocation}>
            {position.allocationPercent.toFixed(1)}%
          </Text>
        </View>
      </View>
```

Add the new styles:
```typescript
  bottomRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tagButton: {
    padding: 4,
  },
```

- [ ] **Step 2: Verify the client compiles**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/components/PositionRow.tsx
git commit -m "feat: add onTagPress prop to PositionRow with tag icon button"
```

---

### Task 2: Wire up TagModal on position detail screen

**Files:**
- Modify: `client/app/position/[instrumentId].tsx`

- [ ] **Step 1: Add TagModal, tag hooks, and state to position detail screen**

Add imports at the top of `client/app/position/[instrumentId].tsx`:
```typescript
import { useCallback } from "react";
import { useTags, useTagPosition, useUntagPosition } from "../../hooks/useTags";
import { TagModal } from "../../components/TagModal";
import type { Position } from "@portfolio-tracker/shared";
```

Inside `PositionDetailScreen`, after the existing `useState` for `period`, add:
```typescript
  const { data: tags } = useTags();
  const tagPosition = useTagPosition();
  const untagPosition = useUntagPosition();
  const [tagModalPosition, setTagModalPosition] = useState<Position | null>(null);

  const handleToggleTag = useCallback(
    (tagId: string, assigned: boolean) => {
      if (!tagModalPosition) return;
      if (assigned) {
        untagPosition.mutate({ tagId, etoroPositionId: tagModalPosition.id });
      } else {
        tagPosition.mutate({ tagId, etoroPositionId: tagModalPosition.id });
      }
    },
    [tagModalPosition]
  );
```

- [ ] **Step 2: Always show individual positions section and wire onTagPress**

Replace the individual positions section (lines 103-113) — remove the `group.positionCount > 1` guard:

```typescript
      {/* Individual Positions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Positions ({group.positionCount})
        </Text>
        {group.positions.map((pos) => (
          <PositionRow
            key={pos.id}
            position={pos}
            onTagPress={() => setTagModalPosition(pos)}
          />
        ))}
      </View>
```

- [ ] **Step 3: Add TagModal before the closing ScrollView**

Before `<View style={{ height: 32 }} />` (line 115), add:

```typescript
      {/* Tag Assignment Modal */}
      <TagModal
        visible={!!tagModalPosition}
        onClose={() => setTagModalPosition(null)}
        tags={tags || []}
        assignedTagIds={tagModalPosition?.tags?.map((t) => t.id) || []}
        onToggleTag={handleToggleTag}
        positionName={
          tagModalPosition?.ticker || tagModalPosition?.instrumentName || ""
        }
      />
```

- [ ] **Step 4: Verify the client compiles**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Manual test**

1. Open the app, go to Positions tab
2. Tap a stock (e.g., AMD) to open position detail
3. Individual positions section should show even for single-position stocks
4. Tap the tag icon on any position row → TagModal opens
5. Toggle a tag → tag appears on the position row

- [ ] **Step 6: Commit**

```bash
git add client/app/position/[instrumentId].tsx
git commit -m "feat: add per-position tagging on position detail screen"
```

---

### Task 3: Add shared types for TagPortfolioBreakdown

**Files:**
- Modify: `shared/types/portfolio.ts`

- [ ] **Step 1: Add new types to shared/types/portfolio.ts**

Append to the end of `shared/types/portfolio.ts` (after `PortfolioSnapshot` interface):

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

- [ ] **Step 2: Build shared package**

Run: `npm run build:shared`
Expected: Successful build

- [ ] **Step 3: Commit**

```bash
git add shared/types/portfolio.ts
git commit -m "feat: add TagPortfolioEntry and TagPortfolioBreakdown shared types"
```

---

### Task 4: Add `GET /portfolio/overview/by-tag` server endpoint

**Files:**
- Modify: `server/src/routes/portfolio.ts`

- [ ] **Step 1: Add the by-tag route handler**

In `server/src/routes/portfolio.ts`, add the import for the new type at the top (line 9):

```typescript
import type { PortfolioOverview, GroupedPosition, TagPortfolioEntry, TagPortfolioBreakdown } from "@portfolio-tracker/shared";
```

Add the new route **before** the `/positions` route (after line 126, before line 128). This is important because Express matches routes in order and `/overview/by-tag` must come before `/positions/:id`:

```typescript
router.get("/overview/by-tag", async (req: Request, res: Response) => {
  const userId = req.auth!.userId;
  const cacheKey = buildCacheKey(userId, "overview:by-tag");

  if (tryCacheResponse(req, res, cacheKey)) return;

  try {
    const etoro = getEtoroService();
    const { positions } = await etoro.getPortfolioPnl();

    await enrichPositions(positions, etoro);
    await enrichTags(positions, userId);

    // Calculate total portfolio value for allocation percentages
    const totalPortfolioValue = positions.reduce(
      (s, p) => s + p.amount + p.unrealizedPnl,
      0
    );

    // Group positions by tag — a position with multiple tags goes into each bucket
    const tagBuckets = new Map<string | null, { tag: { id: string | null; name: string; color: string | null }; positions: typeof positions }>();

    for (const pos of positions) {
      const posTags = pos.tags || [];

      if (posTags.length === 0) {
        // Untagged bucket
        const bucket = tagBuckets.get(null) || {
          tag: { id: null, name: "Untagged", color: null },
          positions: [],
        };
        bucket.positions.push(pos);
        tagBuckets.set(null, bucket);
      } else {
        for (const tag of posTags) {
          const bucket = tagBuckets.get(tag.id) || {
            tag: { id: tag.id, name: tag.name, color: tag.color },
            positions: [],
          };
          bucket.positions.push(pos);
          tagBuckets.set(tag.id, bucket);
        }
      }
    }

    // Compute per-tag metrics
    const items: TagPortfolioEntry[] = Array.from(tagBuckets.values()).map(
      ({ tag, positions: bucketPositions }) => {
        const totalInvested = bucketPositions.reduce((s, p) => s + p.amount, 0);
        const totalPnl = bucketPositions.reduce((s, p) => s + p.unrealizedPnl, 0);
        const totalValue = totalInvested + totalPnl;

        return {
          tagId: tag.id,
          tagName: tag.name,
          tagColor: tag.color,
          totalValue,
          totalInvested,
          unrealizedPnl: totalPnl,
          unrealizedPnlPercent: totalInvested > 0 ? (totalPnl / totalInvested) * 100 : 0,
          allocationPercent: totalPortfolioValue > 0 ? (totalValue / totalPortfolioValue) * 100 : 0,
          positionCount: bucketPositions.length,
        };
      }
    );

    // Sort by totalValue descending
    items.sort((a, b) => b.totalValue - a.totalValue);

    const result: TagPortfolioBreakdown = { items };
    setCache(cacheKey, result, 60);
    res.json({ success: true, data: result });
  } catch (err) {
    console.warn("Failed to compute tag breakdown:", err instanceof Error ? err.message : err);
    res.status(502).json({ success: false, error: "Failed to compute tag breakdown", statusCode: 502 });
  }
});
```

- [ ] **Step 2: Build server**

Run: `npm run build:server`
Expected: Successful build

- [ ] **Step 3: Manual test with curl**

Start the server (`npm run dev:server`), then test:

```bash
curl -H "Authorization: Bearer <your-jwt>" http://localhost:3000/portfolio/overview/by-tag | jq
```

Expected: JSON with `{ success: true, data: { items: [...] } }` where each item has `tagId`, `tagName`, `tagColor`, `totalValue`, etc. Should include an "Untagged" entry if any positions have no tags.

- [ ] **Step 4: Commit**

```bash
git add server/src/routes/portfolio.ts
git commit -m "feat: add GET /portfolio/overview/by-tag endpoint"
```

---

### Task 5: Add `useTagBreakdown` client hook

**Files:**
- Modify: `client/hooks/usePortfolio.ts`

- [ ] **Step 1: Add the hook**

Add the import for the new type at the top of `client/hooks/usePortfolio.ts` (line 3):

```typescript
import type { PortfolioOverview, Position, GroupedPosition, TagPortfolioBreakdown } from "@portfolio-tracker/shared";
```

Append the new hook after `usePortfolioHistory`:

```typescript
export function useTagBreakdown() {
  return useQuery<TagPortfolioBreakdown>({
    queryKey: ["portfolio", "overview", "by-tag"],
    queryFn: async () => {
      const { data } = await api.get("/portfolio/overview/by-tag");
      return data.data;
    },
    staleTime: STALE_TIME,
  });
}
```

- [ ] **Step 2: Verify the client compiles**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add client/hooks/usePortfolio.ts
git commit -m "feat: add useTagBreakdown hook"
```

---

### Task 6: Add tag selector and allocation toggle to Dashboard

**Files:**
- Modify: `client/app/(tabs)/index.tsx`

- [ ] **Step 1: Add imports and state**

Add to the imports at the top of `client/app/(tabs)/index.tsx`:

```typescript
import { useState } from "react";
import { Pressable } from "react-native";
```

Update the existing hook imports:
```typescript
import { usePortfolioOverview, useGroupedPositions, usePortfolioHistory, useTagBreakdown } from "../../hooks/usePortfolio";
import { useTags } from "../../hooks/useTags";
import { TagChip } from "../../components/TagChip";
```

Inside `DashboardScreen`, after the existing hook calls, add:

```typescript
  const { data: tags } = useTags();
  const { data: tagBreakdown } = useTagBreakdown();
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [allocationView, setAllocationView] = useState<"tag" | "instrument">("instrument");
```

Note: `usePortfolioOverview` already accepts an optional `tagId` parameter (line 13 of `usePortfolio.ts`). Update the call:

```typescript
  const { data: overview, isLoading, isError, refetch, isRefetching } = usePortfolioOverview(selectedTagId ?? undefined);
```

- [ ] **Step 2: Add tag selector bar**

After the `isError` ErrorState line and before the `isLoading` ternary, add the tag selector bar (visible only when tags exist and not loading):

```typescript
      {/* Tag Filter */}
      {tags && tags.length > 0 && !isLoading && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tagBar}
          contentContainerStyle={styles.tagBarContent}
        >
          <TagChip
            name="All"
            color="#64748b"
            selected={!selectedTagId}
            onPress={() => setSelectedTagId(null)}
          />
          {tags.map((tag) => (
            <TagChip
              key={tag.id}
              name={tag.name}
              color={tag.color}
              selected={selectedTagId === tag.id}
              onPress={() =>
                setSelectedTagId(selectedTagId === tag.id ? null : tag.id)
              }
            />
          ))}
        </ScrollView>
      )}
```

- [ ] **Step 3: Add allocation toggle and conditional pie chart data**

Replace the allocation chart section (the `{chartData.length > 0 && (` block) with:

```typescript
      {/* Allocation Chart */}
      {(chartData.length > 0 || (tagBreakdown?.items && tagBreakdown.items.length > 0)) && (
        <View style={styles.section}>
          <View style={styles.allocationHeader}>
            <Text style={styles.sectionTitle}>Allocation</Text>
            {tags && tags.length > 0 && (
              <View style={styles.toggleRow}>
                <Pressable
                  style={[styles.toggleBtn, allocationView === "instrument" && styles.toggleBtnActive]}
                  onPress={() => setAllocationView("instrument")}
                >
                  <Text style={[styles.toggleText, allocationView === "instrument" && styles.toggleTextActive]}>
                    By Stock
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.toggleBtn, allocationView === "tag" && styles.toggleBtnActive]}
                  onPress={() => setAllocationView("tag")}
                >
                  <Text style={[styles.toggleText, allocationView === "tag" && styles.toggleTextActive]}>
                    By Tag
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
          <View style={styles.chartContainer}>
            <PieChart
              data={allocationView === "tag" ? tagChartData : instrumentChartData}
              width={Dimensions.get("window").width - 32}
              height={180}
              chartConfig={{
                color: () => "#ffffff",
                labelColor: () => "#94a3b8",
              }}
              accessor="value"
              backgroundColor="transparent"
              paddingLeft="0"
              absolute={false}
            />
          </View>
        </View>
      )}
```

- [ ] **Step 4: Compute both chart data sets**

Update the chart data computation. Replace the existing `chartData` variable with two variables. Place these after the hooks but before the JSX return:

```typescript
  // Instrument allocation chart data (filtered by tag when selected)
  const filteredGrouped = selectedTagId
    ? (grouped || []).filter((g) => g.tags?.some((t) => t.id === selectedTagId))
    : (grouped || []);

  const instrumentChartData = filteredGrouped
    .sort((a, b) => (b.totalAmount + b.unrealizedPnl) - (a.totalAmount + a.unrealizedPnl))
    .slice(0, 8)
    .map((g, i) => ({
      name: g.ticker || g.instrumentName || `#${g.instrumentId}`,
      value: Math.max(g.totalAmount + g.unrealizedPnl, 0),
      color: CHART_COLORS[i % CHART_COLORS.length],
      legendFontColor: "#94a3b8",
      legendFontSize: 12,
    }));

  // Tag allocation chart data (always global view)
  const TAG_UNTAGGED_COLOR = "#475569";
  const tagChartData = (tagBreakdown?.items || [])
    .map((entry, i) => ({
      name: entry.tagName,
      value: Math.max(entry.totalValue, 0),
      color: entry.tagColor || (entry.tagId === null ? TAG_UNTAGGED_COLOR : CHART_COLORS[i % CHART_COLORS.length]),
      legendFontColor: "#94a3b8",
      legendFontSize: 12,
    }));
```

Remove the old `chartData` variable and update `topGainers`/`topLosers` to use `grouped` (not `filteredGrouped` — they stay global):

```typescript
  // Top movers — always global, not filtered by tag
  const topGainers = (grouped || [])
    .filter((g) => g.unrealizedPnlPercent > 0)
    .sort((a, b) => b.unrealizedPnlPercent - a.unrealizedPnlPercent)
    .slice(0, 3);

  const topLosers = (grouped || [])
    .filter((g) => g.unrealizedPnlPercent < 0)
    .sort((a, b) => a.unrealizedPnlPercent - b.unrealizedPnlPercent)
    .slice(0, 3);
```

- [ ] **Step 5: Add new styles**

Add these styles to the `StyleSheet.create` block:

```typescript
  tagBar: {
    maxHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  tagBarContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  allocationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: "row",
    gap: 4,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#1e293b",
  },
  toggleBtnActive: {
    backgroundColor: "#3b82f6",
  },
  toggleText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  toggleTextActive: {
    color: "#ffffff",
  },
```

Also update the existing `sectionTitle` style to remove `marginBottom` since the `allocationHeader` now handles spacing for the allocation section. Actually, since `sectionTitle` is shared across sections, keep it as-is and override in `allocationHeader`. Change the allocation section's `sectionTitle` usage — it's already inside `allocationHeader` which has `marginBottom: 12`, so update the `sectionTitle` style to remove its marginBottom only for this context. Simplest fix: in the allocation header JSX, the `sectionTitle` already has `marginBottom: 12` from the style. Remove that from the `allocationHeader`'s children by overriding:

```typescript
<Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Allocation</Text>
```

- [ ] **Step 6: Verify the client compiles**

Run: `cd client && npx tsc --noEmit`
Expected: No errors

- [ ] **Step 7: Manual test**

1. Open the app → Dashboard
2. If you have tags, you should see the tag selector bar below the header
3. Tap a tag → header metrics (value, P&L) update to show only that tag's positions
4. Tap "All" → back to full portfolio
5. Toggle "By Stock" / "By Tag" above the allocation chart
6. "By Tag" shows colored slices per tag + gray "Untagged" if applicable
7. "By Stock" shows instruments, filtered when a tag is selected
8. History chart and top movers stay unchanged regardless of tag selection

- [ ] **Step 8: Commit**

```bash
git add client/app/\(tabs\)/index.tsx
git commit -m "feat: add tag selector and allocation toggle to dashboard"
```

---

### Task 7: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md with new feature documentation**

Add to the "Key Architecture Decisions" section:

```markdown
- **Per-position tagging:** Tags are assigned per individual eToro position (not per instrument). Position detail screen (`/position/[instrumentId]`) shows all positions with tag buttons. TagModal reused for assignment.
- **Tag-based dashboard analytics:** Dashboard has tag selector bar (filter header metrics) and allocation chart toggle ("By Stock" / "By Tag"). New endpoint `GET /portfolio/overview/by-tag` returns per-tag aggregation. History chart and top movers stay global (unfiltered).
```

- [ ] **Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with tag analytics and per-position tagging"
```
