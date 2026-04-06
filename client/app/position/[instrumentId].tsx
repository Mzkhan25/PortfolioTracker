import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useGroupedPositions } from "../../hooks/usePortfolio";
import { useCandles } from "../../hooks/useMarketData";
import { PriceChart } from "../../components/PriceChart";
import { PnLBadge } from "../../components/PnLBadge";
import type { CandlePeriod, Position } from "@portfolio-tracker/shared";
import { Ionicons } from "@expo/vector-icons";
import { TagChip } from "../../components/TagChip";
import { useTags, useTagPosition, useUntagPosition } from "../../hooks/useTags";
import { TagModal } from "../../components/TagModal";
import { useState, useCallback } from "react";
import { Pressable } from "react-native";

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

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: group.ticker || group.instrumentName }} />

      {/* Header */}
      <View style={styles.header}>
        {group.imageUrl && (
          <Image source={{ uri: group.imageUrl }} style={styles.logo} />
        )}
        <Text style={styles.ticker}>{group.ticker}</Text>
        <Text style={styles.name}>{group.instrumentName}</Text>
        <Text style={styles.price}>
          €{currentValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </Text>
        <PnLBadge
          value={group.unrealizedPnl}
          percent={group.unrealizedPnlPercent}
          size="lg"
        />
      </View>

      {/* Chart */}
      <View style={styles.section}>
        <PriceChart candles={candles || []} isLoading={candlesLoading} />
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
      </View>

      {/* Stats */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Invested</Text>
            <Text style={styles.statValue}>€{group.totalAmount.toFixed(2)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Current Value</Text>
            <Text style={styles.statValue}>€{currentValue.toFixed(2)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Units</Text>
            <Text style={styles.statValue}>{group.totalUnits.toFixed(4)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg Open Rate</Text>
            <Text style={styles.statValue}>${group.averageOpenRate.toFixed(2)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Current Rate</Text>
            <Text style={styles.statValue}>${group.currentRate.toFixed(2)}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Allocation</Text>
            <Text style={styles.statValue}>{group.allocationPercent.toFixed(1)}%</Text>
          </View>
        </View>
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
          const isPositive = pos.unrealizedPnl >= 0;
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
                  isPositive ? styles.positive : styles.negative,
                ]}
              >
                {isPositive ? "+" : ""}€{pos.unrealizedPnl.toFixed(2)}
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
  header: {
    alignItems: "center",
    padding: 24,
    gap: 6,
  },
  logo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
  },
  ticker: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
  },
  name: {
    fontSize: 14,
    color: "#94a3b8",
  },
  price: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#ffffff",
    marginTop: 8,
  },
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
    gap: 8,
    marginTop: 12,
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#1e293b",
  },
  periodBtnActive: {
    backgroundColor: "#3b82f6",
  },
  periodText: {
    fontSize: 13,
    color: "#94a3b8",
    fontWeight: "500",
  },
  periodTextActive: {
    color: "#ffffff",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statItem: {
    width: "48%",
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 12,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#ffffff",
  },
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
  positive: {
    color: "#22c55e",
  },
  negative: {
    color: "#ef4444",
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
