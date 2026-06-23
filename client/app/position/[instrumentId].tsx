import { View, Text, StyleSheet, ScrollView, Image, Pressable } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useGroupedPositions } from "../../hooks/usePortfolio";
import { useCandles } from "../../hooks/useMarketData";
import { PortfolioChart } from "../../components/PortfolioChart";
import type { CandlePeriod, Position } from "@portfolio-tracker/shared";
import { Ionicons } from "@expo/vector-icons";
import { TagChip } from "../../components/TagChip";
import { useTags, useTagPosition, useUntagPosition } from "../../hooks/useTags";
import { TagModal } from "../../components/TagModal";
import { useState, useCallback } from "react";

const PERIODS: CandlePeriod[] = ["1D", "1W", "1M", "3M", "1Y"];

export default function PositionDetailScreen() {
  const { instrumentId } = useLocalSearchParams<{ instrumentId: string }>();
  const { data: grouped } = useGroupedPositions();
  const [period, setPeriod] = useState<CandlePeriod>("1M");
  const { data: tags } = useTags();
  const tagPosition = useTagPosition();
  const untagPosition = useUntagPosition();
  const [tagModalPosition, setTagModalPosition] = useState<Position | null>(null);
  const { data: candles, isLoading: candlesLoading } = useCandles(instrumentId || "", period);

  const group = grouped?.find((g) => g.instrumentId === instrumentId);

  // Single-tag mode: one tag per position (represents who invested)
  const currentAssignedTagIds = tagModalPosition
    ? group?.positions.find((p) => p.id === tagModalPosition.id)?.tags?.map((t) => t.id) || []
    : [];

  const handleToggleTag = useCallback(
    (tagId: string, assigned: boolean) => {
      if (!tagModalPosition) return;
      const posId = tagModalPosition.id;

      if (assigned) {
        // Tapping the already-assigned tag → remove it
        untagPosition.mutate({ tagId, etoroPositionId: posId });
      } else {
        // Unassign current tag first (if any), then assign new one
        const currentTagId = currentAssignedTagIds[0];
        if (currentTagId) {
          untagPosition.mutate(
            { tagId: currentTagId, etoroPositionId: posId },
            { onSuccess: () => tagPosition.mutate({ tagId, etoroPositionId: posId }) }
          );
        } else {
          tagPosition.mutate({ tagId, etoroPositionId: posId });
        }
      }
    },
    [tagModalPosition, currentAssignedTagIds]
  );

  if (!group) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: "Position Detail" }} />
        <Text style={styles.emptyText}>Position not found</Text>
      </View>
    );
  }

  const currentValue = group.totalAmount + group.unrealizedPnl;
  const isPositive = group.unrealizedPnl >= 0;
  const pnlSign = isPositive ? "+" : "";

  // Transform candle data for PortfolioChart (gifted-charts format)
  const candleChartData = (candles || []).map((c) => ({
    value: c.close,
  }));

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: group.ticker || group.instrumentName }} />

      {/* Compact Instrument Header */}
      <View style={styles.instrumentHeader}>
        {/* Row 1: Logo + Ticker/Name | Price + P/L% */}
        <View style={styles.headerRow1}>
          <View style={styles.logoNameBlock}>
            {group.imageUrl ? (
              <Image source={{ uri: group.imageUrl }} style={styles.logo} />
            ) : (
              <View style={styles.logoPlaceholder}>
                <Text style={styles.logoPlaceholderText}>
                  {(group.ticker || group.instrumentName || "?")[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.nameBlock}>
              <View style={styles.tickerRow}>
                <Text style={styles.ticker}>{group.ticker}</Text>
                {group.instrumentName ? (
                  <Text style={styles.instrumentName} numberOfLines={1}>
                    {" • "}{group.instrumentName}
                  </Text>
                ) : null}
              </View>
              <View style={styles.priceRow}>
                <Text style={[styles.currentPrice, isPositive ? styles.positive : styles.negative]}>
                  ${group.currentRate.toFixed(2)}
                </Text>
                <Text style={[styles.pnlPercent, isPositive ? styles.positive : styles.negative]}>
                  {" "}{pnlSign}{group.unrealizedPnlPercent.toFixed(2)}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Row 2: Units @ Avg | Invested + Net Value | P/L */}
        <View style={styles.headerRow2}>
          <View style={styles.statsBlock}>
            <Text style={styles.statsValue}>
              {group.totalUnits.toFixed(4)} Units @ ${group.averageOpenRate.toFixed(2)}
            </Text>
            <Text style={styles.statsLabel}>Invested €{group.totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.statsBlockEnd}>
            <Text style={styles.netValue}>€{currentValue.toFixed(2)}</Text>
            <Text style={[styles.pnlValue, isPositive ? styles.positive : styles.negative]}>
              {pnlSign}€{group.unrealizedPnl.toFixed(2)} ({pnlSign}{group.unrealizedPnlPercent.toFixed(2)}%)
            </Text>
          </View>
        </View>
      </View>

      {/* Chart with Period Selector */}
      <View style={styles.section}>
        <View style={styles.periodRow}>
          {PERIODS.map((p) => (
            <Pressable
              key={p}
              style={[styles.periodBtn, period === p && styles.periodBtnActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p}
              </Text>
            </Pressable>
          ))}
        </View>
        <PortfolioChart data={candleChartData} isLoading={candlesLoading} height={200} showYAxis={false} />
      </View>

      {/* Positions Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Positions ({group.positionCount})
        </Text>

        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderText, { flex: 2 }]}>Position</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Units</Text>
          <Text style={[styles.tableHeaderText, { flex: 1, textAlign: "right" }]}>Open</Text>
          <Text style={[styles.tableHeaderText, { flex: 1.2, textAlign: "right" }]}>P/L</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Table Rows */}
        {group.positions.map((pos) => {
          const posIsPositive = pos.unrealizedPnl >= 0;
          const openDateStr = pos.openDate
            ? new Date(pos.openDate).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit", year: "2-digit" })
            : "--";

          return (
            <Pressable
              key={pos.id}
              style={styles.tableRow}
              onPress={() => setTagModalPosition(pos)}
            >
              {/* Direction + Date */}
              <View style={{ flex: 2 }}>
                <View style={styles.directionRow}>
                  <Text style={[styles.directionText, pos.isBuy ? styles.buyText : styles.sellText]}>
                    {pos.isBuy ? "Buy" : "Sell"}
                  </Text>
                  {pos.leverage > 1 && (
                    <View style={styles.leverageBadge}>
                      <Text style={styles.leverageText}>x{pos.leverage}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.posDateText}>{openDateStr}</Text>
                {pos.tags && pos.tags.length > 0 && (
                  <View style={styles.posTagRow}>
                    {pos.tags.map((tag) => (
                      <TagChip key={tag.id} name={tag.name} color={tag.color} small />
                    ))}
                  </View>
                )}
              </View>

              {/* Units */}
              <Text style={[styles.tableCellText, { flex: 1, textAlign: "right" }]}>
                {pos.units.toFixed(2)}
              </Text>

              {/* Open Rate */}
              <Text style={[styles.tableCellText, { flex: 1, textAlign: "right" }]}>
                ${pos.openRate.toFixed(2)}
              </Text>

              {/* P/L */}
              <Text
                style={[
                  styles.tablePnl,
                  { flex: 1.2, textAlign: "right" },
                  posIsPositive ? styles.positive : styles.negative,
                ]}
              >
                {posIsPositive ? "+" : ""}€{pos.unrealizedPnl.toFixed(2)}
              </Text>

              {/* Tag icon */}
              <View style={styles.tagIconCell}>
                <Ionicons name="pricetag-outline" size={14} color="#64748b" />
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* Tag Assignment Modal */}
      <TagModal
        visible={!!tagModalPosition}
        onClose={() => setTagModalPosition(null)}
        tags={tags || []}
        assignedTagIds={currentAssignedTagIds}
        onToggleTag={handleToggleTag}
        positionName={
          tagModalPosition?.ticker || tagModalPosition?.instrumentName || ""
        }
      />

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },

  // Instrument Header
  instrumentHeader: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
    gap: 12,
  },
  headerRow1: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logoNameBlock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  logo: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  logoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  logoPlaceholderText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#94a3b8",
  },
  nameBlock: {
    flex: 1,
    gap: 2,
  },
  tickerRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  ticker: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  instrumentName: {
    fontSize: 13,
    color: "#94a3b8",
    flexShrink: 1,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  currentPrice: {
    fontSize: 14,
    fontWeight: "600",
  },
  pnlPercent: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Row 2 stats
  headerRow2: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: 8,
  },
  statsBlock: {
    gap: 2,
  },
  statsValue: {
    fontSize: 13,
    fontWeight: "500",
    color: "#e2e8f0",
  },
  statsLabel: {
    fontSize: 11,
    color: "#64748b",
  },
  statsBlockEnd: {
    alignItems: "flex-end",
    gap: 2,
  },
  netValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
  pnlValue: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Shared color
  positive: {
    color: "#22c55e",
  },
  negative: {
    color: "#ef4444",
  },

  // Chart section
  section: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#cbd5e1",
    marginBottom: 12,
  },
  periodRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginBottom: 12,
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#475569",
  },
  periodBtnActive: {
    borderColor: "#ffffff",
  },
  periodText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },
  periodTextActive: {
    color: "#ffffff",
  },

  // Table
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  tableHeaderText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  directionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  directionText: {
    fontSize: 14,
    fontWeight: "700",
  },
  buyText: {
    color: "#22c55e",
  },
  sellText: {
    color: "#ef4444",
  },
  leverageBadge: {
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  leverageText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#94a3b8",
  },
  posDateText: {
    fontSize: 11,
    color: "#64748b",
    marginTop: 2,
  },
  posTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    marginTop: 4,
  },
  tableCellText: {
    fontSize: 13,
    color: "#e2e8f0",
    fontWeight: "500",
  },
  tablePnl: {
    fontSize: 13,
    fontWeight: "600",
  },
  tagIconCell: {
    width: 28,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginTop: 48,
  },
});
