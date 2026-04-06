import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions, Pressable } from "react-native";
import { PieChart, LineChart } from "react-native-chart-kit";
import { usePortfolioOverview, useGroupedPositions, usePortfolioHistory, useTagBreakdown } from "../../hooks/usePortfolio";
import { PortfolioCard } from "../../components/PortfolioCard";
import { PnLBadge } from "../../components/PnLBadge";
import { ErrorState } from "../../components/ErrorState";
import { SkeletonDashboardHeader, SkeletonCard, SkeletonChart } from "../../components/Skeleton";
import { useTags } from "../../hooks/useTags";
import { TagChip } from "../../components/TagChip";

const CHART_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#a855f7",
];

function formatCurrency(value: number): string {
  return `€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardScreen() {
  const [selectedTagId, setSelectedTagId] = useState<string | null>(null);
  const [allocationView, setAllocationView] = useState<"tag" | "instrument">("instrument");
  const { data: overview, isLoading, isError, refetch, isRefetching } = usePortfolioOverview(selectedTagId ?? undefined);
  const { data: grouped } = useGroupedPositions();
  const { data: history } = usePortfolioHistory(30);
  const { data: tags } = useTags();
  const { data: tagBreakdown } = useTagBreakdown();

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

  // Top movers by stock (sorted by P&L %)
  const topGainers = (grouped || [])
    .filter((g) => g.unrealizedPnlPercent > 0)
    .sort((a, b) => b.unrealizedPnlPercent - a.unrealizedPnlPercent)
    .slice(0, 3);

  const topLosers = (grouped || [])
    .filter((g) => g.unrealizedPnlPercent < 0)
    .sort((a, b) => a.unrealizedPnlPercent - b.unrealizedPnlPercent)
    .slice(0, 3);

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching}
          onRefresh={refetch}
          tintColor="#3b82f6"
        />
      }
    >
      {isError && <ErrorState message="Failed to load portfolio data" onRetry={refetch} />}

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

      {/* Portfolio Value Header */}
      {isLoading ? (
        <>
          <SkeletonDashboardHeader />
          <View style={styles.row}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
          <SkeletonChart />
          <SkeletonChart />
        </>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.label}>Total Portfolio Value</Text>
            <Text style={styles.value}>
              {formatCurrency(overview?.totalValue ?? 0)}
            </Text>
            <PnLBadge
              value={overview?.unrealizedPnl ?? 0}
              percent={overview?.unrealizedPnlPercent ?? 0}
              size="lg"
            />
            {(overview?.dailyChange ?? 0) !== 0 && (
              <Text style={styles.dailyChange}>
                Today: {(overview?.dailyChange ?? 0) >= 0 ? "+" : ""}
                {formatCurrency(overview?.dailyChange ?? 0)} (
                {(overview?.dailyChangePercent ?? 0) >= 0 ? "+" : ""}
                {(overview?.dailyChangePercent ?? 0).toFixed(2)}%)
              </Text>
            )}
          </View>

          {/* Equity & Cash Cards */}
          <View style={styles.row}>
            <PortfolioCard
              label="Equity"
              value={formatCurrency(overview?.equity ?? 0)}
            />
            <PortfolioCard
              label="Available Cash"
              value={formatCurrency(overview?.availableCash ?? 0)}
            />
          </View>

      {/* Portfolio Performance Chart */}
      {history && history.length > 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Portfolio Value (30d)</Text>
          <View style={styles.chartContainer}>
            <LineChart
              data={{
                labels: history
                  .filter((_, i) => i % Math.max(1, Math.floor(history.length / 5)) === 0)
                  .map((h) => h.date.slice(5)), // "MM-DD"
                datasets: [{ data: history.map((h) => h.totalValue) }],
              }}
              width={Dimensions.get("window").width - 32}
              height={180}
              chartConfig={{
                backgroundColor: "#1e293b",
                backgroundGradientFrom: "#1e293b",
                backgroundGradientTo: "#1e293b",
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
                labelColor: () => "#64748b",
                propsForDots: { r: "2", strokeWidth: "1", stroke: "#3b82f6" },
              }}
              bezier
              withDots={false}
              withInnerLines={false}
              style={{ borderRadius: 12 }}
            />
          </View>
        </View>
      )}

      {/* Allocation Chart */}
      {(instrumentChartData.length > 0 || tagChartData.length > 0) && (
        <View style={styles.section}>
          <View style={styles.allocationHeader}>
            <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Allocation</Text>
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

      {/* Top Gainers */}
      {topGainers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Gainers</Text>
          {topGainers.map((g) => (
            <View key={g.instrumentId} style={styles.moverRow}>
              <Text style={styles.moverTicker}>{g.ticker || g.instrumentName}</Text>
              <Text style={styles.moverPositive}>
                +{g.unrealizedPnlPercent.toFixed(2)}%
              </Text>
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
              <Text style={styles.moverTicker}>{g.ticker || g.instrumentName}</Text>
              <Text style={styles.moverNegative}>
                {g.unrealizedPnlPercent.toFixed(2)}%
              </Text>
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
  header: {
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 14,
    color: "#94a3b8",
  },
  value: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#ffffff",
  },
  dailyChange: {
    fontSize: 13,
    color: "#94a3b8",
    marginTop: 4,
  },
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: 12,
  },
  chartContainer: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 8,
    alignItems: "center",
  },
  moverRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 14,
    marginBottom: 6,
  },
  moverTicker: {
    fontSize: 15,
    fontWeight: "500",
    color: "#ffffff",
  },
  moverPositive: {
    fontSize: 15,
    fontWeight: "600",
    color: "#22c55e",
  },
  moverNegative: {
    fontSize: 15,
    fontWeight: "600",
    color: "#ef4444",
  },
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
});
