import { View, Text, StyleSheet, ScrollView, RefreshControl, Dimensions } from "react-native";
import { PieChart } from "react-native-chart-kit";
import { usePortfolioOverview, usePositions } from "../../hooks/usePortfolio";
import { PortfolioCard } from "../../components/PortfolioCard";
import { PnLBadge } from "../../components/PnLBadge";
import { ErrorState } from "../../components/ErrorState";

const CHART_COLORS = [
  "#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#a855f7",
];

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function DashboardScreen() {
  const { data: overview, isLoading, isError, refetch, isRefetching } = usePortfolioOverview();
  const { data: positions } = usePositions();

  const isPositive = (overview?.unrealizedPnl ?? 0) >= 0;

  // Prepare pie chart data from positions
  const chartData = (positions || [])
    .sort((a, b) => (b.amount + b.unrealizedPnl) - (a.amount + a.unrealizedPnl))
    .slice(0, 8)
    .map((p, i) => ({
      name: p.ticker || p.instrumentName || `#${p.instrumentId}`,
      value: Math.max(p.amount + p.unrealizedPnl, 0),
      color: CHART_COLORS[i % CHART_COLORS.length],
      legendFontColor: "#94a3b8",
      legendFontSize: 12,
    }));

  // Top movers (sorted by P&L %)
  const topGainers = (positions || [])
    .filter((p) => p.unrealizedPnlPercent > 0)
    .sort((a, b) => b.unrealizedPnlPercent - a.unrealizedPnlPercent)
    .slice(0, 3);

  const topLosers = (positions || [])
    .filter((p) => p.unrealizedPnlPercent < 0)
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
          {topGainers.map((p) => (
            <View key={p.id} style={styles.moverRow}>
              <Text style={styles.moverTicker}>{p.ticker || p.instrumentName}</Text>
              <Text style={styles.moverPositive}>
                +{p.unrealizedPnlPercent.toFixed(2)}%
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Top Losers */}
      {topLosers.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top Losers</Text>
          {topLosers.map((p) => (
            <View key={p.id} style={styles.moverRow}>
              <Text style={styles.moverTicker}>{p.ticker || p.instrumentName}</Text>
              <Text style={styles.moverNegative}>
                {p.unrealizedPnlPercent.toFixed(2)}%
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
