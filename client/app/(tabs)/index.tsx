import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { usePortfolioOverview, useGroupedPositions, usePortfolioHistory, useTagBreakdown } from "../../hooks/usePortfolio";
import { PortfolioChart } from "../../components/PortfolioChart";
import { ErrorState } from "../../components/ErrorState";
import { Skeleton, SkeletonChart } from "../../components/Skeleton";
import { useTags } from "../../hooks/useTags";
import { TagChip } from "../../components/TagChip";

const CHART_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#a855f7",
];

const PERIODS = ["1W", "1M", "3M", "6M", "1Y"] as const;
type Period = typeof PERIODS[number];
const PERIOD_DAYS: Record<Period, number> = { "1W": 7, "1M": 30, "3M": 90, "6M": 180, "1Y": 365 };

function formatCurrency(value: number): string {
  return `€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatChange(value: number, percent: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatCurrency(value)} (${sign}${percent.toFixed(2)}%)`;
}

export default function DashboardScreen() {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [allocationView, setAllocationView] = useState<"tag" | "instrument">("instrument");
  const [dashPeriod, setDashPeriod] = useState<Period>("1M");

  const { data: overview, isLoading, isError, refetch, isRefetching } = usePortfolioOverview(selectedTagId ?? undefined);
  const { data: grouped } = useGroupedPositions();
  const { data: history, isLoading: historyLoading } = usePortfolioHistory(PERIOD_DAYS[dashPeriod]);
  const { data: tags } = useTags();
  const { data: tagBreakdown } = useTagBreakdown();

  // Transform history to gifted-charts format
  const historyChartData = (history || []).map((h, i) => ({
    value: h.totalValue,
    label:
      i % Math.max(1, Math.floor((history?.length || 1) / 5)) === 0
        ? h.date.slice(5)
        : "",
  }));

  // Instrument allocation data (filtered by tag when selected)
  const filteredGrouped = selectedTagId
    ? (grouped || []).filter((g) => g.tags?.some((t) => t.id === selectedTagId))
    : (grouped || []);

  const totalPortfolioValue = filteredGrouped.reduce(
    (sum, g) => sum + Math.max(g.totalAmount + g.unrealizedPnl, 0),
    0
  );

  const instrumentAllocation = filteredGrouped
    .map((g, i) => ({
      name: g.ticker || g.instrumentName || `#${g.instrumentId}`,
      value: Math.max(g.totalAmount + g.unrealizedPnl, 0),
      color: CHART_COLORS[i % CHART_COLORS.length],
      pnl: g.unrealizedPnl,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const totalTagValue = (tagBreakdown?.items || []).reduce(
    (sum, e) => sum + Math.max(e.totalValue, 0),
    0
  );

  const tagAllocation = (tagBreakdown?.items || [])
    .map((entry, i) => ({
      name: entry.tagName,
      value: Math.max(entry.totalValue, 0),
      color: entry.tagColor || (entry.tagId === null ? "#475569" : CHART_COLORS[i % CHART_COLORS.length]),
    }))
    .sort((a, b) => b.value - a.value);

  // Top movers
  const topGainers = (grouped || [])
    .filter((g) => g.unrealizedPnlPercent > 0)
    .sort((a, b) => b.unrealizedPnlPercent - a.unrealizedPnlPercent)
    .slice(0, 3);

  const topLosers = (grouped || [])
    .filter((g) => g.unrealizedPnlPercent < 0)
    .sort((a, b) => a.unrealizedPnlPercent - b.unrealizedPnlPercent)
    .slice(0, 3);

  const dailyChange = overview?.dailyChange ?? 0;
  const dailyChangePercent = overview?.dailyChangePercent ?? 0;
  const isPositiveDaily = dailyChange >= 0;

  const activeAllocationData = allocationView === "tag" ? tagAllocation : instrumentAllocation;
  const allocationTotal = allocationView === "tag" ? totalTagValue : totalPortfolioValue;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor="#3b82f6"
        />
      }
    >
      {isError && <ErrorState message="Failed to load portfolio data" onRetry={refetch} />}

      {/* Tag Filter Bar */}
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
              onPress={() => setSelectedTagId(selectedTagId === tag.id ? null : tag.id)}
            />
          ))}
        </ScrollView>
      )}

      {isLoading ? (
        /* Loading skeleton */
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Skeleton width={140} height={13} />
            <View style={styles.periodRow}>
              {PERIODS.map((p) => (
                <Skeleton key={p} width={32} height={26} borderRadius={13} />
              ))}
            </View>
          </View>
          <Skeleton width={180} height={44} style={{ marginTop: 12 }} />
          <Skeleton width={140} height={18} style={{ marginTop: 6 }} borderRadius={6} />
          <View style={{ marginTop: 16 }}>
            <SkeletonChart />
          </View>
          <View style={styles.summaryRow}>
            <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <Skeleton width={80} height={12} />
              <Skeleton width={100} height={20} />
            </View>
            <View style={styles.verticalDivider} />
            <View style={{ flex: 1, alignItems: "center", gap: 4 }}>
              <Skeleton width={80} height={12} />
              <Skeleton width={100} height={20} />
            </View>
          </View>
        </View>
      ) : (
        <>
          {/* Main Portfolio Card */}
          <View style={styles.card}>
            {/* Top row: label + period selector */}
            <View style={styles.cardTopRow}>
              <Text style={styles.cardLabel}>Total account value</Text>
              <View style={styles.periodRow}>
                {PERIODS.map((p) => (
                  <Pressable
                    key={p}
                    style={[styles.periodPill, dashPeriod === p && styles.periodPillActive]}
                    onPress={() => setDashPeriod(p)}
                  >
                    <Text style={[styles.periodText, dashPeriod === p && styles.periodTextActive]}>
                      {p}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Value */}
            <Text style={styles.totalValue}>
              {formatCurrency(overview?.totalValue ?? 0)}
            </Text>

            {/* Daily change */}
            <Text style={[styles.dailyChange, isPositiveDaily ? styles.positive : styles.negative]}>
              {formatChange(dailyChange, dailyChangePercent)}{" "}
              <Text style={styles.todayLabel}>Today</Text>
            </Text>

            {/* Chart */}
            <View style={styles.chartWrapper}>
              <PortfolioChart
                data={historyChartData}
                isLoading={historyLoading}
                height={160}
              />
            </View>

            {/* Cash | Invested */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCol}>
                <Text style={styles.summaryValue}>
                  {formatCurrency(overview?.availableCash ?? 0)}
                </Text>
                <Text style={styles.summaryLabel}>Available Cash</Text>
              </View>
              <View style={styles.verticalDivider} />
              <View style={styles.summaryCol}>
                <Text style={styles.summaryValue}>
                  {formatCurrency(overview?.equity ?? 0)}
                </Text>
                <Text style={styles.summaryLabel}>
                  Invested{" "}
                  {(overview?.unrealizedPnl ?? 0) !== 0 && (
                    <Text style={(overview?.unrealizedPnl ?? 0) >= 0 ? styles.positive : styles.negative}>
                      {(overview?.unrealizedPnl ?? 0) >= 0 ? "+" : ""}
                      {(overview?.unrealizedPnlPercent ?? 0).toFixed(2)}%
                    </Text>
                  )}
                </Text>
              </View>
            </View>
          </View>

          {/* Allocation Section */}
          {activeAllocationData.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
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

              {activeAllocationData.map((item) => {
                const pct = allocationTotal > 0 ? (item.value / allocationTotal) * 100 : 0;
                return (
                  <View key={item.name} style={styles.allocationRow}>
                    <View style={styles.allocationLeft}>
                      <View style={[styles.allocationDot, { backgroundColor: item.color }]} />
                      <Text style={styles.allocationName} numberOfLines={1}>{item.name}</Text>
                    </View>
                    <View style={styles.allocationBarWrapper}>
                      <View style={styles.allocationBarBg}>
                        <View
                          style={[
                            styles.allocationBarFill,
                            { width: `${Math.min(pct, 100)}%` as any, backgroundColor: item.color },
                          ]}
                        />
                      </View>
                    </View>
                    <View style={styles.allocationRight}>
                      <Text style={styles.allocationPct}>{pct.toFixed(1)}%</Text>
                      <Text style={styles.allocationValue}>{formatCurrency(item.value)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Top Gainers */}
          {topGainers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Gainers</Text>
              {topGainers.map((g) => (
                <View key={g.instrumentId} style={styles.moverRow}>
                  <View>
                    <Text style={styles.moverTicker}>{g.ticker || g.instrumentName}</Text>
                    <Text style={styles.moverName} numberOfLines={1}>{g.instrumentName}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.moverPositive}>
                      +{g.unrealizedPnlPercent.toFixed(2)}%
                    </Text>
                    <Text style={styles.moverPnl}>
                      +{formatCurrency(g.unrealizedPnl)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Top Losers */}
          {topLosers.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Top Losers</Text>
              {topLosers.map((g) => (
                <View key={g.instrumentId} style={styles.moverRow}>
                  <View>
                    <Text style={styles.moverTicker}>{g.ticker || g.instrumentName}</Text>
                    <Text style={styles.moverName} numberOfLines={1}>{g.instrumentName}</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.moverNegative}>
                      {g.unrealizedPnlPercent.toFixed(2)}%
                    </Text>
                    <Text style={[styles.moverPnl, styles.negative]}>
                      {formatCurrency(g.unrealizedPnl)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  content: {
    paddingBottom: 16,
  },

  /* Tag bar */
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

  /* Main card */
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 24,
    marginHorizontal: 16,
    marginTop: 16,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardLabel: {
    fontSize: 13,
    color: "#94a3b8",
    flex: 1,
  },
  periodRow: {
    flexDirection: "row",
    gap: 4,
  },
  periodPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: "#475569",
  },
  periodPillActive: {
    borderColor: "#ffffff",
  },
  periodText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
  },
  periodTextActive: {
    color: "#ffffff",
  },

  /* Value + daily change */
  totalValue: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 10,
    letterSpacing: -1,
  },
  dailyChange: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 4,
  },
  todayLabel: {
    color: "#64748b",
    fontWeight: "400",
  },
  positive: {
    color: "#22c55e",
  },
  negative: {
    color: "#ef4444",
  },

  /* Chart */
  chartWrapper: {
    marginTop: 20,
    marginHorizontal: -8,
  },

  /* Cash | Invested summary */
  summaryRow: {
    flexDirection: "row",
    alignItems: "stretch",
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  summaryCol: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748b",
  },
  verticalDivider: {
    width: 1,
    backgroundColor: "#334155",
    marginVertical: 2,
  },

  /* Sections */
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#cbd5e1",
  },

  /* Allocation toggle */
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

  /* Allocation rows */
  allocationRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  allocationLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: 80,
  },
  allocationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  allocationName: {
    fontSize: 12,
    color: "#cbd5e1",
    fontWeight: "500",
    flex: 1,
  },
  allocationBarWrapper: {
    flex: 1,
  },
  allocationBarBg: {
    height: 6,
    backgroundColor: "#334155",
    borderRadius: 3,
    overflow: "hidden",
  },
  allocationBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  allocationRight: {
    alignItems: "flex-end",
    width: 80,
  },
  allocationPct: {
    fontSize: 13,
    fontWeight: "600",
    color: "#e2e8f0",
  },
  allocationValue: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 1,
  },

  /* Movers */
  moverRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
  },
  moverTicker: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
  },
  moverName: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
    maxWidth: 180,
  },
  moverPositive: {
    fontSize: 15,
    fontWeight: "700",
    color: "#22c55e",
  },
  moverNegative: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ef4444",
  },
  moverPnl: {
    fontSize: 12,
    color: "#22c55e",
    marginTop: 2,
    textAlign: "right",
  },
});
