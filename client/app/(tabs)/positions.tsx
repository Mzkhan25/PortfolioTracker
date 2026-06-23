import { useState, useCallback } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Image,
} from "react-native";
import type { GroupedPosition } from "@portfolio-tracker/shared";
import { useGroupedPositions, usePortfolioOverview } from "../../hooks/usePortfolio";
import { useTags, useTagPosition, useUntagPosition } from "../../hooks/useTags";
import { Ionicons } from "@expo/vector-icons";
import { TagChip } from "../../components/TagChip";
import { TagModal } from "../../components/TagModal";
import { TagManager } from "../../components/TagManager";
import { ErrorState } from "../../components/ErrorState";
import { SkeletonPositionRow } from "../../components/Skeleton";
import { PortfolioSummaryBar } from "../../components/PortfolioSummaryBar";

type SortKey = "pnl" | "value" | "name";

export default function PositionsScreen() {
  const { data: grouped, isLoading, isError, refetch, isRefetching } = useGroupedPositions();
  const { data: overview } = usePortfolioOverview();
  const { data: tags } = useTags();
  const tagPosition = useTagPosition();
  const untagPosition = useUntagPosition();

  const [sortBy, setSortBy] = useState<SortKey>("value");
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const [tagModalGroup, setTagModalGroup] = useState<GroupedPosition | null>(null);
  const [tagManagerVisible, setTagManagerVisible] = useState(false);

  const handleToggleTag = useCallback(
    (tagId: string, assigned: boolean) => {
      if (!tagModalGroup) return;
      // Apply tag to all positions in the group
      tagModalGroup.positions.forEach((pos) => {
        if (assigned) {
          untagPosition.mutate({ tagId, etoroPositionId: pos.id });
        } else {
          tagPosition.mutate({ tagId, etoroPositionId: pos.id });
        }
      });
    },
    [tagModalGroup]
  );

  // Filter by tag
  let filtered = grouped || [];
  if (filterTagId) {
    filtered = filtered.filter((g) =>
      g.tags?.some((t) => t.id === filterTagId)
    );
  }

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    switch (sortBy) {
      case "pnl":
        return b.unrealizedPnlPercent - a.unrealizedPnlPercent;
      case "value":
        return (b.totalAmount + b.unrealizedPnl) - (a.totalAmount + a.unrealizedPnl);
      case "name":
        return (a.ticker || a.instrumentName).localeCompare(b.ticker || b.instrumentName);
      default:
        return 0;
    }
  });

  const totalPositions = sorted.reduce((s, g) => s + g.positionCount, 0);
  const isPnlPositive = (pnl: number) => pnl >= 0;

  const renderRow = ({ item }: { item: GroupedPosition }) => {
    const pnlPositive = isPnlPositive(item.unrealizedPnl);
    const pnlPctPositive = isPnlPositive(item.unrealizedPnlPercent);
    // We don't have dailyChange per-position; show P/L % as secondary in price col
    const leverage = item.positions[0]?.leverage ?? 1;

    return (
      <Pressable
        style={styles.tableRow}
        onPress={() => router.push(`/position/${item.instrumentId}`)}
        onLongPress={() => setTagModalGroup(item)}
      >
        {/* Asset column */}
        <View style={styles.assetCol}>
          {item.imageUrl ? (
            <Image
              source={{ uri: item.imageUrl }}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.logoFallback}>
              <Text style={styles.logoFallbackText}>
                {(item.ticker || item.instrumentName || "?").slice(0, 2).toUpperCase()}
              </Text>
            </View>
          )}
          <View style={styles.assetInfo}>
            <View style={styles.tickerRow}>
              <Text style={styles.ticker}>{item.ticker || item.instrumentName}</Text>
              {leverage > 1 && (
                <View style={styles.leverageBadge}>
                  <Text style={styles.leverageText}>x{leverage}</Text>
                </View>
              )}
            </View>
            <Text style={styles.instrumentName} numberOfLines={1}>
              {item.instrumentName}
            </Text>
            {item.tags && item.tags.length > 0 && (
              <View style={styles.tagRow}>
                {item.tags.slice(0, 2).map((tag) => (
                  <TagChip
                    key={tag.id}
                    name={tag.name}
                    color={tag.color ?? "#64748b"}
                    selected={false}
                    onPress={() => setFilterTagId(tag.id)}
                    small
                  />
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Price column */}
        <View style={styles.priceCol}>
          <Text style={styles.priceText}>${item.currentRate.toFixed(2)}</Text>
          <Text style={[styles.pnlPct, pnlPctPositive ? styles.positive : styles.negative]}>
            {pnlPctPositive ? "+" : ""}{item.unrealizedPnlPercent.toFixed(2)}%
          </Text>
        </View>

        {/* Units column */}
        <View style={styles.unitsCol}>
          <Text style={styles.cellText}>{item.totalUnits.toFixed(2)}</Text>
          <Text style={styles.cellSub}>{item.positions[0]?.isBuy !== false ? "Long" : "Short"}</Text>
        </View>

        {/* Avg. Open column */}
        <View style={styles.avgOpenCol}>
          <Text style={styles.cellText}>${item.averageOpenRate.toFixed(2)}</Text>
        </View>

        {/* P/L column */}
        <View style={styles.plCol}>
          <Text style={[styles.plText, pnlPositive ? styles.positive : styles.negative]}>
            {pnlPositive ? "+" : ""}€{Math.abs(item.unrealizedPnl).toFixed(2)}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Tag Filter Bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterBar}
        contentContainerStyle={styles.filterContent}
      >
        <Pressable
          style={styles.manageTagsBtn}
          onPress={() => setTagManagerVisible(true)}
        >
          <Ionicons name="pricetags" size={16} color="#3b82f6" />
        </Pressable>
        <TagChip
          name="All"
          color="#64748b"
          selected={!filterTagId}
          onPress={() => setFilterTagId(null)}
        />
        {tags?.map((tag) => (
          <TagChip
            key={tag.id}
            name={tag.name}
            color={tag.color}
            selected={filterTagId === tag.id}
            onPress={() =>
              setFilterTagId(filterTagId === tag.id ? null : tag.id)
            }
          />
        ))}
      </ScrollView>

      {/* Sort Bar */}
      <View style={styles.sortBar}>
        <Text style={styles.sortLabel}>Sort:</Text>
        {(["value", "pnl", "name"] as SortKey[]).map((key) => (
          <Pressable
            key={key}
            style={[styles.sortButton, sortBy === key && styles.sortButtonActive]}
            onPress={() => setSortBy(key)}
          >
            <Text
              style={[
                styles.sortButtonText,
                sortBy === key && styles.sortButtonTextActive,
              ]}
            >
              {key === "pnl" ? "P&L" : key === "value" ? "Value" : "Name"}
            </Text>
          </Pressable>
        ))}
        <Text style={styles.countLabel}>
          {sorted.length} stock{sorted.length !== 1 ? "s" : ""}
          {totalPositions !== sorted.length && ` · ${totalPositions} positions`}
        </Text>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerText, styles.assetCol]}>
          Asset{sorted.length > 0 ? ` (${sorted.length})` : ""}
        </Text>
        <Text style={[styles.headerText, styles.priceCol, styles.alignRight]}>Price</Text>
        <Text style={[styles.headerText, styles.unitsCol, styles.alignRight]}>Units</Text>
        <Text style={[styles.headerText, styles.avgOpenCol, styles.alignRight]}>Avg. Open</Text>
        <Text style={[styles.headerText, styles.plCol, styles.alignRight]}>P/L</Text>
      </View>

      {/* Position List */}
      <FlatList
        data={sorted}
        keyExtractor={(item) => item.instrumentId}
        renderItem={renderRow}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#3b82f6"
          />
        }
        ListEmptyComponent={
          isLoading ? (
            <View>
              {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonPositionRow key={i} />
              ))}
            </View>
          ) : isError ? (
            <ErrorState message="Failed to load positions" onRetry={refetch} />
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons
                name={filterTagId ? "pricetag-outline" : "briefcase-outline"}
                size={48}
                color="#334155"
              />
              <Text style={styles.emptyText}>
                {filterTagId
                  ? "No positions with this tag"
                  : "No open positions"}
              </Text>
              <Text style={styles.emptySubtext}>
                {filterTagId
                  ? "Try selecting a different tag or clear the filter"
                  : "Your open positions will appear here"}
              </Text>
            </View>
          )
        }
        contentContainerStyle={sorted.length === 0 ? styles.emptyList : undefined}
      />

      {/* Portfolio Summary Bar */}
      <PortfolioSummaryBar
        availableCash={overview?.availableCash ?? 0}
        totalInvested={overview?.equity ?? 0}
        profitLoss={overview?.unrealizedPnl ?? 0}
        totalValue={overview?.totalValue ?? 0}
      />

      {/* Tag Assignment Modal */}
      <TagModal
        visible={!!tagModalGroup}
        onClose={() => setTagModalGroup(null)}
        tags={tags || []}
        assignedTagIds={tagModalGroup?.tags?.map((t) => t.id) || []}
        onToggleTag={handleToggleTag}
        positionName={
          tagModalGroup?.ticker || tagModalGroup?.instrumentName || ""
        }
      />

      {/* Tag Manager Modal */}
      <TagManager
        visible={tagManagerVisible}
        onClose={() => setTagManagerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },

  // Filter bar
  filterBar: {
    maxHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  manageTagsBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },

  // Sort bar
  sortBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  sortLabel: {
    fontSize: 13,
    color: "#64748b",
  },
  sortButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#1e293b",
  },
  sortButtonActive: {
    backgroundColor: "#3b82f6",
  },
  sortButtonText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: "500",
  },
  sortButtonTextActive: {
    color: "#ffffff",
  },
  countLabel: {
    fontSize: 12,
    color: "#64748b",
    marginLeft: "auto",
  },

  // Table header
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  headerText: {
    fontSize: 11,
    color: "#64748b",
    textTransform: "uppercase",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  alignRight: {
    textAlign: "right",
  },

  // Table row
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },

  // Column widths (flex)
  assetCol: {
    flex: 2.5,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  priceCol: {
    flex: 1.2,
    alignItems: "flex-end",
  },
  unitsCol: {
    flex: 1,
    alignItems: "flex-end",
  },
  avgOpenCol: {
    flex: 1,
    alignItems: "flex-end",
  },
  plCol: {
    flex: 1,
    alignItems: "flex-end",
  },

  // Logo
  logo: {
    width: 32,
    height: 32,
    borderRadius: 8,
  },
  logoFallback: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logoFallbackText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94a3b8",
  },

  // Asset info
  assetInfo: {
    flex: 1,
  },
  tickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  ticker: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },
  leverageBadge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: "#334155",
  },
  leverageText: {
    fontSize: 10,
    color: "#94a3b8",
    fontWeight: "600",
  },
  instrumentName: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 3,
    marginTop: 3,
  },

  // Cell content
  priceText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#ffffff",
  },
  pnlPct: {
    fontSize: 11,
    marginTop: 2,
  },
  cellText: {
    fontSize: 13,
    color: "#e2e8f0",
  },
  cellSub: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  plText: {
    fontSize: 13,
    fontWeight: "600",
  },

  // Colors
  positive: {
    color: "#22c55e",
  },
  negative: {
    color: "#ef4444",
  },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 13,
    color: "#475569",
    textAlign: "center",
    marginTop: 4,
  },
  emptyList: {
    flexGrow: 1,
  },
});
