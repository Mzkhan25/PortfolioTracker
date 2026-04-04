import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from "react-native";
import { PieChart, LineChart } from "react-native-chart-kit";
import { usePortfolioOverview, useGroupedPositions, usePortfolioHistory } from "../../hooks/usePortfolio";
import { PortfolioCard } from "../../components/PortfolioCard";
import { PnLBadge } from "../../components/PnLBadge";
import { ErrorState } from "../../components/ErrorState";

const CHART_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#a855f7",
];

function formatCurrency(value: number): string {
  return `€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardScreen() {
  const { data: overview, isLoading, isError, refetch, isRefetching } = usePortfolioOverview();
  const { data: grouped } = useGroupedPositions();
  const { data: history } = usePortfolioHistory(30);

  const isPositive = (overview?.unrealizedPnl ?? 0) >= 0;

  // Prepare pie chart data from grouped positions (one slice per stock)
  const chartData = (grouped || [])
    .sort((a, b) => (b.totalAmount + b.unrealizedPnl) - (a.totalAmount + a.unrealizedPnl))
    .slice(0, 8)
    .map((g, i) => ({
      name: g.ticker || g.instrumentName || `#${g.instrumentId}`,
      value: Math.max(g.totalAmount + g.unrealizedPnl, 0),
      color: CHART_COLORS[i % CHART_COLORS.length],
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

      {/* Portfolio Value Header */}
      <View style={styles.header}>
        <Text style={styles.label}>Total Portfolio Value</Text>
        {isLoading ? (
          <Text style={styles.value}>Loading...</Text>
        ) : (
          <>
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
          </>
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
      {chartData.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allocation</Text>
          <View style={styles.chartContainer}>
            <PieChart
              data={chartData}
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
});
