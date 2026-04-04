import { View, Text, StyleSheet, ScrollView, Image } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useGroupedPositions } from "../../hooks/usePortfolio";
import { useCandles } from "../../hooks/useMarketData";
import { PriceChart } from "../../components/PriceChart";
import { PnLBadge } from "../../components/PnLBadge";
import { PositionRow } from "../../components/PositionRow";
import type { CandlePeriod } from "@portfolio-tracker/shared";
import { useState } from "react";
import { Pressable } from "react-native";

const PERIODS: CandlePeriod[] = ["1D", "1W", "1M", "3M", "1Y"];

export default function PositionDetailScreen() {
  const { instrumentId } = useLocalSearchParams<{ instrumentId: string }>();
  const { data: grouped } = useGroupedPositions();
  const [period, setPeriod] = useState<CandlePeriod>("1M");
  const { data: candles, isLoading: candlesLoading } = useCandles(instrumentId || "", period);

  const group = grouped?.find((g) => g.instrumentId === instrumentId);

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

      {/* Individual Positions */}
      {group.positionCount > 1 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Individual Positions ({group.positionCount})
          </Text>
          {group.positions.map((pos) => (
            <PositionRow key={pos.id} position={pos} />
          ))}
        </View>
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
  emptyText: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    marginTop: 48,
  },
});
